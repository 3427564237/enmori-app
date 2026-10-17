#!/usr/bin/env python3
"""Foreground, opaque TCP relay for the approved private phone entry only."""
from __future__ import annotations

import argparse
from dataclasses import dataclass, field
import errno
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import selectors
import socket
import threading
import time

from li_controlled_phone_handoff import Blocked, handoff, strict_object
from private_handoff_file import PrivateFileRefused, read_private_handoff_file

MAX_CONNECTIONS = 32
BUFFER_LIMIT = 65536
CONNECT_TIMEOUT = 5.0
CONFIG_CHECK_INTERVAL = 0.5
SELECT_INTERVAL = 0.2
AUTH_PORT = 9099
_PENDING = {errno.EINPROGRESS, errno.EWOULDBLOCK, errno.EALREADY, 10035, 10036, 10037}


class RelayRefused(Exception):
    """Only a fixed category; never a native error, path or endpoint."""


@dataclass(frozen=True, repr=False)
class Configuration:
    handoff_path: Path
    route_path: Path
    handoff_bytes: bytes
    route_bytes: bytes
    host: str
    backend_port: int
    family: int

    def assert_current(self):
        try:
            if (read_private_handoff_file(self.handoff_path) != self.handoff_bytes
                    or read_private_handoff_file(self.route_path, 4096) != self.route_bytes):
                raise RelayRefused("configuration_changed")
        except PrivateFileRefused:
            raise RelayRefused("configuration_changed") from None


def load_configuration(handoff_path: Path, route_path: Path) -> Configuration:
    try:
        if not handoff_path.is_absolute() or not route_path.is_absolute():
            raise RelayRefused("configuration_refused")
        body, port = handoff(handoff_path)
        route_body = read_private_handoff_file(route_path, 4096)
        route = strict_object(route_body)
        if (set(route) != {"schemaVersion", "tailnetHost", "handoffSha256"}
                or type(route["schemaVersion"]) is not int or route["schemaVersion"] != 1
                or not isinstance(route["tailnetHost"], str)
                or not isinstance(route["handoffSha256"], str)
                or re.fullmatch(r"[0-9a-f]{64}", route["handoffSha256"]) is None
                or route["handoffSha256"] != hashlib.sha256(body).hexdigest()
                or port == 443 or "%" in route["tailnetHost"]):
            raise RelayRefused("configuration_refused")
        address = ipaddress.ip_address(route["tailnetHost"])
        network = ipaddress.ip_network("100.64.0.0/10" if address.version == 4 else "fd7a:115c:a1e0::/48")
        if address not in network:
            raise RelayRefused("configuration_refused")
        result = Configuration(handoff_path, route_path, body, route_body, str(address), port,
                               socket.AF_INET if address.version == 4 else socket.AF_INET6)
        result.assert_current()
        return result
    except (Blocked, PrivateFileRefused, OSError, ValueError, TypeError):
        raise RelayRefused("configuration_refused") from None


@dataclass(eq=False, repr=False)
class _End:
    sock: socket.socket
    output: bytearray = field(default_factory=bytearray)
    eof: bool = False
    write_closed: bool = False
    peer: _End | None = None
    pair: _Pair | None = None


@dataclass(eq=False, repr=False)
class _Pair:
    client: _End
    upstream: _End
    connecting: bool
    deadline: float

    @property
    def ends(self):
        return self.client, self.upstream


class Relay:
    """One selector owns every socket; existing listeners are never adopted."""

    def __init__(self, configuration: Configuration, emit=None):
        self.configuration = configuration
        self.selector = selectors.DefaultSelector()
        self.listeners = []
        self.pairs = set()
        self.stopping = threading.Event()
        self.started = False
        self.closed = False
        self.configuration_current = True
        self.emit = emit or (lambda _: None)
        self.last_category = None

    def report(self, category):
        # This describes local ownership only, not Backend/Auth/model readiness.
        if category != self.last_category:
            self.emit({"category": category,
                       "backendLoopbackBound": self.started and not self.closed,
                       "authLoopbackBound": self.started and not self.closed,
                       "configurationCurrent": self.configuration_current,
                       "upstreamConnectivityVerified": False,
                       "ownedSocketsClosed": self.closed})
            self.last_category = category

    def _check_configuration(self):
        try:
            self.configuration.assert_current()
        except RelayRefused:
            self.configuration_current = False
            raise

    def start(self):
        if self.started or self.closed:
            raise RelayRefused("lifecycle_refused")
        try:
            self._check_configuration()
            for port in (self.configuration.backend_port, AUTH_PORT):
                listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.listeners.append(listener)
                if os.name == "nt":
                    listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
                # Never SO_REUSEADDR/SO_REUSEPORT: fail on another owner's port.
                listener.bind(("127.0.0.1", port))
            for listener in self.listeners:
                listener.listen(MAX_CONNECTIONS)
                listener.setblocking(False)
                self.selector.register(listener, selectors.EVENT_READ, None)
            self._check_configuration()
            self.started = True
            self.report("listening")
        except OSError:
            self.close()
            raise RelayRefused("local_port_unavailable") from None
        except BaseException:
            self.close()
            raise

    def _open_upstream(self, port):
        upstream = socket.socket(self.configuration.family, socket.SOCK_STREAM)
        try:
            upstream.setblocking(False)
            # load_configuration accepts numeric tailnet addresses only: no DNS,
            # proxy, HTTP parsing, TLS termination or system proxy environment.
            code = upstream.connect_ex((self.configuration.host, port))
            if code not in _PENDING and code != 0:
                raise OSError()
            return upstream, code != 0
        except BaseException:
            upstream.close()
            raise

    def _accept(self, listener):
        try:
            client, _ = listener.accept()
        except BlockingIOError:
            return
        upstream = None
        pair = None
        try:
            self._check_configuration()
            if len(self.pairs) >= MAX_CONNECTIONS:
                self.report("capacity_refused")
                client.close()
                return
            client.setblocking(False)
            upstream, connecting = self._open_upstream(listener.getsockname()[1])
            pair = _Pair(_End(client), _End(upstream), connecting, time.monotonic() + CONNECT_TIMEOUT)
            pair.client.peer, pair.upstream.peer = pair.upstream, pair.client
            pair.client.pair = pair.upstream.pair = pair
            self.pairs.add(pair)
            self._refresh(pair)
        except OSError:
            if pair is not None:
                self._drop(pair)
            else:
                client.close()
                if upstream is not None:
                    upstream.close()
            self.report("upstream_unavailable")
        except BaseException:
            if pair is not None:
                self._drop(pair)
            else:
                client.close()
                if upstream is not None:
                    upstream.close()
            raise

    def _watch(self, end, events):
        try:
            self.selector.get_key(end.sock)
        except KeyError:
            if events:
                self.selector.register(end.sock, events, end)
        else:
            if events:
                self.selector.modify(end.sock, events, end)
            else:
                self.selector.unregister(end.sock)

    def _refresh(self, pair):
        if pair not in self.pairs:
            return
        if pair.connecting:
            self._watch(pair.upstream, selectors.EVENT_WRITE)
            return
        for end in pair.ends:
            if end.peer.eof and not end.output and not end.write_closed:
                end.sock.shutdown(socket.SHUT_WR)
                end.write_closed = True
        if all(end.eof and not end.output for end in pair.ends):
            self._drop(pair)
            return
        for end in pair.ends:
            events = selectors.EVENT_WRITE if end.output else 0
            if not end.eof and len(end.peer.output) < BUFFER_LIMIT:
                events |= selectors.EVENT_READ
            self._watch(end, events)

    def _ready(self, end, events):
        pair = end.pair
        if pair not in self.pairs:
            return
        try:
            if pair.connecting:
                if end.sock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR):
                    self._drop(pair)
                    self.report("upstream_unavailable")
                    return
                pair.connecting = False
            else:
                if events & selectors.EVENT_WRITE and end.output:
                    try:
                        sent = end.sock.send(end.output)
                        if sent == 0:
                            raise OSError()
                        del end.output[:sent]
                    except BlockingIOError:
                        pass
                available = BUFFER_LIMIT - len(end.peer.output)
                if events & selectors.EVENT_READ and not end.eof and available > 0:
                    try:
                        data = end.sock.recv(available)
                        if data:
                            end.peer.output.extend(data)
                        else:
                            end.eof = True
                    except BlockingIOError:
                        pass
            self._refresh(pair)
        except OSError:
            self._drop(pair)
            self.report("transport_failed")

    def _close_socket(self, sock):
        try:
            self.selector.unregister(sock)
        except (KeyError, ValueError):
            pass
        try:
            sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        sock.close()

    def _drop(self, pair):
        self.pairs.discard(pair)
        for end in pair.ends:
            self._close_socket(end.sock)
            end.output.clear()

    def request_stop(self):
        self.stopping.set()

    def close(self):
        if self.closed:
            return
        for pair in tuple(self.pairs):
            self._drop(pair)
        for listener in self.listeners:
            self._close_socket(listener)
        self.listeners.clear()
        self.selector.close()
        self.closed = True

    def run(self):
        try:
            if not self.started:
                self.start()
            next_check = 0.0
            while not self.stopping.is_set():
                now = time.monotonic()
                if now >= next_check:
                    self._check_configuration()
                    next_check = now + CONFIG_CHECK_INTERVAL
                for pair in tuple(self.pairs):
                    if pair.connecting and now >= pair.deadline:
                        self._drop(pair)
                        self.report("upstream_connect_timeout")
                for key, events in self.selector.select(SELECT_INTERVAL):
                    if key.data is None:
                        self._accept(key.fileobj)
                    else:
                        self._ready(key.data, events)
        finally:
            self.close()


class _Parser(argparse.ArgumentParser):
    def error(self, _message):
        raise RelayRefused("arguments_refused")


def main(argv=None):
    relay = None
    category = "stopped"
    code = 0

    def emit(report):
        print(json.dumps(report, separators=(",", ":")), flush=True)

    try:
        parser = _Parser(description=__doc__)
        parser.add_argument("--handoff", required=True, type=Path)
        parser.add_argument("--route", required=True, type=Path)
        args = parser.parse_args(argv)
        relay = Relay(load_configuration(args.handoff, args.route), emit=emit)
        relay.run()
    except KeyboardInterrupt:
        pass
    except RelayRefused as error:
        category, code = str(error), 1
    except Exception:
        category, code = "relay_failed", 1
    finally:
        if relay is not None:
            relay.close()
            relay.report(category)
        elif category != "stopped":
            emit({"category": category, "backendLoopbackBound": False, "authLoopbackBound": False,
                  "configurationCurrent": False, "upstreamConnectivityVerified": False,
                  "ownedSocketsClosed": True})
    return code


if __name__ == "__main__":
    raise SystemExit(main())
