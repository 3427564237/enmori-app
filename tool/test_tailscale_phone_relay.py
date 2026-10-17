"""Owned loopback sockets and synthetic files only; no actual tailnet traffic."""
import base64
from contextlib import redirect_stdout
import ctypes
from ctypes import wintypes
import hashlib
import io
import json
import os
from pathlib import Path
import socket
import struct
import tempfile
import threading
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import private_handoff_file as private_file
import tailscale_phone_relay as target


def local_socket(port=0):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if os.name == "nt":
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
    sock.bind(("127.0.0.1", port))
    return sock


def unused_port():
    with local_socket() as sock:
        return sock.getsockname()[1]


def connect(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    sock.connect(("127.0.0.1", port))
    return sock


def receive_all(sock):
    result = bytearray()
    while True:
        part = sock.recv(65536)
        if not part:
            return bytes(result)
        result.extend(part)


class Server:
    def __init__(self, handler):
        self.listener = local_socket()
        self.port = self.listener.getsockname()[1]
        self.listener.listen(32)
        self.listener.settimeout(0.1)
        self.stop = threading.Event()
        self.accepted = threading.Event()
        self.connections = []
        self.workers = []
        self.errors = []
        self.handler = handler
        self.thread = threading.Thread(target=self.serve)
        self.thread.start()

    def serve(self):
        while not self.stop.is_set():
            try:
                sock, _ = self.listener.accept()
            except socket.timeout:
                continue
            except OSError:
                return
            sock.settimeout(5)
            self.connections.append(sock)
            worker = threading.Thread(target=self.handle, args=(sock,))
            self.workers.append(worker)
            worker.start()
            self.accepted.set()

    def handle(self, sock):
        try:
            self.handler(sock, self.stop)
        except OSError:
            if not self.stop.is_set():
                self.errors.append("fixture_socket_error")
        finally:
            sock.close()

    def close(self):
        self.stop.set()
        self.listener.close()
        self.thread.join(2)
        for sock in self.connections:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            sock.close()
        for worker in self.workers:
            worker.join(2)
        if self.thread.is_alive() or any(worker.is_alive() for worker in self.workers):
            raise AssertionError("fixture_thread_cleanup_failed")


def echo(sock, stop):
    while not stop.is_set():
        data = sock.recv(65536)
        if not data:
            return
        sock.sendall(data)


class RelayTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="enmori-relay-fixture-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.handoff = self.directory / "synthetic-handoff.json"
        self.route = self.directory / "synthetic-route.json"
        self.backend_port = unused_port()
        self.auth_port = unused_port()
        while self.auth_port == self.backend_port:
            self.auth_port = unused_port()
        auth = patch.object(target, "AUTH_PORT", self.auth_port)
        auth.start()
        self.addCleanup(auth.stop)
        self.value = {"schemaVersion": 1, "projectId": "demo-enmori-rmvp01a-r10",
                      "email": "synthetic-relay@example.invalid", "password": "SyntheticPrivatePassword!",
                      "baseUri": f"https://127.0.0.1:{self.backend_port}/", "certificateBase64": base64.b64encode(
                          b"-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n").decode(),
                      "authEmulatorHost": "127.0.0.1:9099", "lifetime": "until-explicit-stop-in-this-owned-process",
                      "syntheticOwnerOnly": True}
        self.route_value = {"schemaVersion": 1, "tailnetHost": "100.64.0.1", "handoffSha256": ""}
        self.write_configuration()

    def write_private(self, path, data):
        path.write_bytes(data)
        if os.name != "nt":
            path.chmod(0o600)
            return
        api = private_file._WindowsApi()
        sid = api.current_user()
        user = "S-1-" + str(int.from_bytes(sid[2:8], "big"))
        user += "".join("-" + str(value) for value in struct.unpack("<" + "I" * sid[1], sid[8:]))
        convert = api.security.ConvertStringSecurityDescriptorToSecurityDescriptorW
        convert.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.POINTER(ctypes.c_void_p), ctypes.c_void_p]
        convert.restype = wintypes.BOOL
        apply = api.security.SetFileSecurityW
        apply.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_void_p]
        apply.restype = wintypes.BOOL
        descriptor = ctypes.c_void_p()
        self.assertTrue(convert(f"D:P(A;;FA;;;{user})(A;;FA;;;SY)(A;;FA;;;BA)", 1,
                                ctypes.byref(descriptor), None))
        try:
            self.assertTrue(apply(str(path), 0x80000004, descriptor))
        finally:
            api.free(descriptor)

    def write_configuration(self):
        body = json.dumps(self.value).encode()
        self.write_private(self.handoff, body)
        self.route_value["handoffSha256"] = hashlib.sha256(body).hexdigest()
        self.write_private(self.route, json.dumps(self.route_value).encode())

    def configuration(self):
        return target.load_configuration(self.handoff, self.route)

    def server(self, handler=echo):
        result = Server(handler)
        self.addCleanup(result.close)
        return result

    def relay(self, server):
        reports = []
        relay = target.Relay(self.configuration(), emit=reports.append)

        def local_upstream(_port):
            upstream = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            upstream.setblocking(False)
            code = upstream.connect_ex(("127.0.0.1", server.port))
            if code not in target._PENDING and code != 0:
                upstream.close()
                raise OSError()
            return upstream, code != 0

        relay._open_upstream = local_upstream
        relay.start()
        failures = []

        def run():
            try:
                relay.run()
            except target.RelayRefused as error:
                failures.append(str(error))

        thread = threading.Thread(target=run)
        thread.start()

        def cleanup():
            relay.request_stop()
            thread.join(3)
            self.assertFalse(thread.is_alive())
            self.assertTrue(relay.closed)
            self.assertEqual(relay.pairs, set())
            self.assertEqual(relay.listeners, [])

        self.addCleanup(cleanup)
        return relay, reports, failures, thread

    def wait_for(self, condition):
        deadline = time.monotonic() + 3
        while not condition() and time.monotonic() < deadline:
            time.sleep(0.01)
        self.assertTrue(condition())

    def test_numeric_tailnet_ipv4_and_ipv6_only(self):
        for address in ("100.64.0.1", "100.127.255.254", "fd7a:115c:a1e0::1"):
            self.route_value["tailnetHost"] = address
            self.write_configuration()
            self.assertEqual(self.configuration().host, address)
        for address in ("127.0.0.1", "192.168.0.1", "100.128.0.1", "100.63.255.255", "::1",
                        "fd7a:115c:a1e1::1", "fd7a:115c:a1e0::1%1", "host.invalid", "https://100.64.0.1"):
            self.route_value["tailnetHost"] = address
            self.write_configuration()
            with self.subTest(address_class="invalid"):
                with self.assertRaises(target.RelayRefused):
                    self.configuration()

    def test_exact_route_fields_types_duplicate_and_raw_handoff_hash(self):
        for change in ({"extra": True}, {"schemaVersion": True}, {"tailnetHost": 1},
                       {"handoffSha256": "0" * 64}):
            altered = dict(self.route_value, **change)
            self.write_private(self.route, json.dumps(altered).encode())
            with self.assertRaises(target.RelayRefused):
                self.configuration()
        self.write_configuration()
        self.write_private(self.route, self.route.read_bytes()[:-1] + b',"schemaVersion":1}')
        with self.assertRaises(target.RelayRefused):
            self.configuration()
        self.write_configuration()
        self.write_private(self.handoff, self.handoff.read_bytes() + b"\n")
        with self.assertRaises(target.RelayRefused):
            self.configuration()

    def test_paths_private_file_and_existing_443_are_guarded(self):
        with self.assertRaises(target.RelayRefused):
            target.load_configuration(Path("relative"), self.route)
        self.value["baseUri"] = "https://127.0.0.1:443/"
        self.write_configuration()
        with self.assertRaises(target.RelayRefused):
            self.configuration()
        self.value["baseUri"] = "https://127.0.0.1:9099/"
        self.write_configuration()
        with self.assertRaises(target.RelayRefused):
            self.configuration()
        self.write_private(self.route, b"x" * 4097)
        with self.assertRaises(target.RelayRefused):
            self.configuration()

    def test_two_loopback_ports_forward_exact_binary_and_client_half_close(self):
        data = bytes(range(256)) * 1024
        received = []

        def after_eof(sock, _stop):
            request = receive_all(sock)
            received.append(request)
            sock.sendall(request[::-1])

        server = self.server(after_eof)
        relay, reports, _, _ = self.relay(server)
        for port in (self.backend_port, self.auth_port):
            with connect(port) as client:
                client.sendall(data)
                client.shutdown(socket.SHUT_WR)
                self.assertEqual(receive_all(client), data[::-1])
        self.assertEqual(received, [data, data])
        self.wait_for(lambda: not relay.pairs)
        self.assertTrue(reports[0]["backendLoopbackBound"])
        self.assertTrue(reports[0]["authLoopbackBound"])
        self.assertFalse(reports[0]["upstreamConnectivityVerified"])
        for listener in relay.listeners:
            self.assertEqual(listener.getsockname()[0], "127.0.0.1")
            self.assertEqual(listener.getsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR), 0)
            if os.name == "nt":
                self.assertEqual(listener.getsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE), 1)

    def test_upstream_half_close_preserves_client_to_server_direction(self):
        received = []

        def upstream_first(sock, _stop):
            sock.sendall(b"synthetic greeting")
            sock.shutdown(socket.SHUT_WR)
            received.append(receive_all(sock))

        server = self.server(upstream_first)
        relay, _, _, _ = self.relay(server)
        with connect(self.backend_port) as client:
            self.assertEqual(receive_all(client), b"synthetic greeting")
            client.sendall(b"synthetic reply after EOF")
            client.shutdown(socket.SHUT_WR)
        self.wait_for(lambda: received == [b"synthetic reply after EOF"])
        self.wait_for(lambda: not relay.pairs)

    def test_large_transfer_respects_buffer_bound_with_backpressure(self):
        expected = b"synthetic binary\x00" * 65536

        def slow_reader(sock, _stop):
            time.sleep(0.1)
            data = receive_all(sock)
            sock.sendall(hashlib.sha256(data).digest())

        server = self.server(slow_reader)
        relay, _, _, _ = self.relay(server)
        refresh = relay._refresh
        observed = []

        def checked(pair):
            observed.extend(len(end.output) for end in pair.ends)
            refresh(pair)

        relay._refresh = checked
        with connect(self.backend_port) as client:
            client.sendall(expected)
            client.shutdown(socket.SHUT_WR)
            self.assertEqual(receive_all(client), hashlib.sha256(expected).digest())
        self.assertTrue(observed)
        self.assertLessEqual(max(observed), target.BUFFER_LIMIT)

    def test_owned_port_conflict_rolls_back_only_our_other_listener(self):
        reports = []
        with local_socket(self.auth_port) as existing:
            existing.listen(1)
            relay = target.Relay(self.configuration(), emit=reports.append)
            with self.assertRaisesRegex(target.RelayRefused, "^local_port_unavailable$"):
                relay.start()
            self.assertTrue(relay.closed)
            self.assertEqual(reports, [])
            with local_socket(self.backend_port):
                pass
            with connect(self.auth_port) as probe:
                accepted, _ = existing.accept()
                with accepted:
                    accepted.sendall(b"still owned")
                    self.assertEqual(probe.recv(32), b"still owned")

    def test_upstream_failure_closes_pair_but_keeps_owned_listeners(self):
        server = self.server()
        relay, reports, _, _ = self.relay(server)
        original = relay._open_upstream
        relay._open_upstream = lambda _: (_ for _ in ()).throw(OSError("private endpoint sentinel"))
        with connect(self.backend_port) as client:
            self.assertEqual(receive_all(client), b"")
        self.wait_for(lambda: any(report["category"] == "upstream_unavailable" for report in reports))
        relay._open_upstream = original
        with connect(self.auth_port) as client:
            client.sendall(b"retry synthetic")
            self.assertEqual(client.recv(32), b"retry synthetic")
        self.assertFalse(relay.closed)
        self.assertNotIn("private endpoint sentinel", json.dumps(reports))

    def test_real_owned_upstream_connection_refusal_closes_client_and_pair(self):
        # Bound but deliberately not listening: the address is ours and cannot
        # become an unrelated service between choosing it and connecting.
        with local_socket() as refusal:
            endpoint = SimpleNamespace(port=refusal.getsockname()[1])
            relay, reports, _, _ = self.relay(endpoint)
            with connect(self.backend_port) as client:
                self.assertEqual(receive_all(client), b"")
            self.wait_for(lambda: any(row["category"] == "upstream_unavailable" for row in reports))
            self.assertEqual(relay.pairs, set())
            self.assertFalse(relay.closed)

    def test_capacity_refuses_extra_without_touching_active_pair(self):
        server = self.server()
        with patch.object(target, "MAX_CONNECTIONS", 1):
            relay, reports, _, _ = self.relay(server)
            with connect(self.backend_port) as first:
                first.sendall(b"first")
                self.assertEqual(first.recv(32), b"first")
                with connect(self.auth_port) as extra:
                    self.assertEqual(receive_all(extra), b"")
                first.sendall(b"still active")
                self.assertEqual(first.recv(32), b"still active")
                self.assertEqual(len(relay.pairs), 1)
            self.assertTrue(any(report["category"] == "capacity_refused" for report in reports))

    def test_handoff_or_route_mutation_and_missing_file_stop_owned_sockets(self):
        for name, delete in (("handoff", False), ("route", False), ("route", True)):
            self.write_configuration()
            server = self.server()
            relay, _, failures, thread = self.relay(server)
            with connect(self.backend_port) as client:
                client.sendall(b"before mutation")
                self.assertEqual(client.recv(32), b"before mutation")
                path = getattr(self, name)
                if delete:
                    path.unlink()
                else:
                    self.write_private(path, path.read_bytes() + b"\n")
                thread.join(3)
                self.assertFalse(thread.is_alive())
                self.assertEqual(receive_all(client), b"")
            self.assertEqual(failures, ["configuration_changed"])
            self.assertTrue(relay.closed)
            self.assertFalse(relay.configuration_current)
            # Fresh ports avoid TCP TIME_WAIT reuse; no REUSEADDR bypass.
            self.backend_port = unused_port()
            self.auth_port = unused_port()
            target.AUTH_PORT = self.auth_port
            self.value["baseUri"] = f"https://127.0.0.1:{self.backend_port}/"

    def test_connected_socket_has_no_idle_or_connect_deadline_expiry(self):
        server = self.server()
        with patch.object(target, "CONNECT_TIMEOUT", 0.05):
            relay, _, _, _ = self.relay(server)
            with connect(self.backend_port) as client:
                client.sendall(b"first")
                self.assertEqual(client.recv(32), b"first")
                time.sleep(0.15)
                client.sendall(b"after connect deadline")
                self.assertEqual(client.recv(64), b"after connect deadline")
                self.assertFalse(relay.closed)

    def test_connect_deadline_closes_owned_synthetic_pending_pair(self):
        relay = target.Relay(self.configuration())
        relay.start()
        first, second = socket.socketpair()
        first.setblocking(False)
        second.setblocking(False)
        pair = target._Pair(target._End(first), target._End(second), True, time.monotonic() - 1)
        pair.client.peer, pair.upstream.peer = pair.upstream, pair.client
        pair.client.pair = pair.upstream.pair = pair
        relay.pairs.add(pair)
        reports = []

        def report(value):
            reports.append(value)
            relay.request_stop()

        relay.emit = report
        relay.run()
        self.assertTrue(relay.closed)
        self.assertEqual(first.fileno(), -1)
        self.assertEqual(second.fileno(), -1)
        self.assertEqual(reports[0]["category"], "upstream_connect_timeout")

    def test_ctrl_c_path_closes_listeners_and_cli_never_outputs_private_values(self):
        captured = []

        def interrupted(relay):
            captured.append(relay)
            relay.start()
            raise KeyboardInterrupt()

        output = io.StringIO()
        with patch.object(target.Relay, "run", new=interrupted), redirect_stdout(output):
            code = target.main(["--handoff", str(self.handoff), "--route", str(self.route)])
        self.assertEqual(code, 0)
        self.assertTrue(captured[0].closed)
        rows = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([row["category"] for row in rows], ["listening", "stopped"])
        self.assertTrue(rows[-1]["ownedSocketsClosed"])
        for row in rows:
            self.assertTrue(all(type(value) is bool for key, value in row.items() if key != "category"))
        for value in (self.route_value["tailnetHost"], self.value["email"], self.value["password"],
                      self.value["baseUri"], self.value["certificateBase64"], str(self.handoff)):
            self.assertNotIn(value, output.getvalue())
        with local_socket(self.backend_port), local_socket(self.auth_port):
            pass

    def test_invalid_cli_arguments_have_only_fixed_category(self):
        output = io.StringIO()
        with redirect_stdout(output):
            code = target.main(["--private-sentinel"])
        self.assertEqual(code, 1)
        report = json.loads(output.getvalue())
        self.assertEqual(report["category"], "arguments_refused")
        self.assertNotIn("private-sentinel", output.getvalue())


if __name__ == "__main__":
    unittest.main()
