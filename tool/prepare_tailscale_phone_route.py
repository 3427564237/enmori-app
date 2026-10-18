#!/usr/bin/env python3
"""Prepare a private route file on the original Linux host; never enable Serve.

The two Tailscale commands only inspect local state. Neither peer visibility nor
this output establishes the effective grants/ACL policy for authorized testers.
"""
from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import stat
import sys

import check_reusable_phone_entry as checker
import li_controlled_phone_handoff as h

IPV4 = ipaddress.ip_network("100.64.0.0/10")
IPV6 = ipaddress.ip_network("fd7a:115c:a1e0::/48")


class Refused(Exception):
    """Only fixed, content-free failure categories are raised here."""


def require(condition, category):
    if not condition:
        raise Refused(category)


def self_address(value):
    require(type(value) is dict and value.get("BackendState") == "Running",
            "tailscale_not_ready")
    own = value.get("Self")
    require(type(own) is dict and own.get("Online") is True, "tailscale_not_ready")
    addresses = own.get("TailscaleIPs")
    require(type(addresses) is list and bool(addresses), "tailscale_self_ip_refused")
    parsed = []
    for item in addresses:
        require(type(item) is str and "%" not in item, "tailscale_self_ip_refused")
        try:
            address = ipaddress.ip_address(item)
        except ValueError:
            raise Refused("tailscale_self_ip_refused") from None
        require((address.version == 4 and address in IPV4)
                or (address.version == 6 and address in IPV6), "tailscale_self_ip_refused")
        parsed.append(address)
    # Use Self only: a peer's address/Online/AllowedIPs is not authorization.
    return str(next((address for address in parsed if address.version == 4), parsed[0]))


def require_unused_private_ports(value, backend_port):
    require(type(backend_port) is int and 1 <= backend_port <= 65535
            and backend_port not in (443, 9099), "backend_port_refused")

    def visit(config, depth):
        require(depth <= 16 and type(config) is dict, "serve_status_shape_refused")
        # This is device Serve, not the separately scoped Services API.
        require(not config.get("Services"), "serve_status_shape_refused")
        funnel = config.get("AllowFunnel", {})
        require(type(funnel) is dict and all(type(flag) is bool for flag in funnel.values()),
                "serve_status_shape_refused")
        require(not any(funnel.values()), "funnel_enabled_refused")
        listeners = config.get("TCP", {})
        require(type(listeners) is dict, "serve_status_shape_refused")
        for port, handler in listeners.items():
            require(type(port) is str and re.fullmatch(r"[1-9][0-9]{0,4}", port) is not None
                    and 1 <= int(port) <= 65535 and type(handler) is dict,
                    "serve_status_shape_refused")
            require(int(port) not in (backend_port, 9099), "serve_port_conflict")
        foreground = config.get("Foreground", {})
        require(type(foreground) is dict, "serve_status_shape_refused")
        for child in foreground.values():
            visit(child, depth + 1)

    visit(value, 0)


def directory_identity(info):
    require(stat.S_ISDIR(info.st_mode) and stat.S_IMODE(info.st_mode) == 0o700
            and info.st_uid == os.getuid(), "private_output_parent_refused")
    return info.st_dev, info.st_ino, info.st_uid, info.st_mode


def write_new_private(output, data):
    """Create only our new file through a pinned, existing private directory."""
    require(output.is_absolute() and output.name not in ("", ".", ".."), "arguments_refused")
    parent = output.parent
    require(parent.resolve(strict=True) == parent, "private_output_parent_refused")
    before = directory_identity(parent.lstat())
    directory = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    descriptor = None
    owned = None
    complete = False
    try:
        require(directory_identity(os.fstat(directory)) == before, "private_output_parent_refused")
        try:
            descriptor = os.open(output.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                                 0o600, dir_fd=directory)
        except FileExistsError:
            raise Refused("output_already_exists") from None
        info = os.fstat(descriptor)
        owned = info.st_dev, info.st_ino
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "wb", closefd=False) as stream:
            stream.write(data)
            stream.flush()
            os.fsync(descriptor)
        info = os.fstat(descriptor)
        named = os.stat(output.name, dir_fd=directory, follow_symlinks=False)
        require(stat.S_ISREG(info.st_mode) and stat.S_IMODE(info.st_mode) == 0o600
                and info.st_uid == os.getuid() and info.st_nlink == 1
                and (named.st_dev, named.st_ino) == owned and info.st_size == len(data),
                "private_output_changed")
        require(directory_identity(os.fstat(directory)) == before
                and directory_identity(parent.lstat()) == before, "private_output_parent_refused")
        os.fsync(directory)
        complete = True
    finally:
        if descriptor is not None:
            os.close(descriptor)
        if owned is not None and not complete:
            # Never unlink a replacement or a pre-existing caller-owned file.
            try:
                named = os.stat(output.name, dir_fd=directory, follow_symlinks=False)
                if (named.st_dev, named.st_ino) == owned:
                    os.unlink(output.name, dir_fd=directory)
            except OSError:
                pass
        os.close(directory)


def base_report():
    return {"status": "Blocked", "scope": "private-route-preparation-only",
            "category": "preflight_refused", "currentHostReady": False,
            "tailnetSelfOnline": False, "desiredPortsUnused": False,
            "funnelAbsentInSnapshot": False, "privateRouteWritten": False,
            "nativeServeStarted": False, "networkOrModelStarted": False,
            "accessPolicyEstablished": False}


def prepare(session, tailscale, output, *, runner=h.run, load=h.handoff,
            check_host=checker.check_host):
    report = base_report()
    phase = "preflight_refused"
    try:
        require(sys.platform == "linux", "linux_host_required")
        require(all(path.is_absolute() for path in (session, tailscale, output)), "arguments_refused")
        require(tailscale.is_file() and os.access(tailscale, os.X_OK), "tailscale_executable_refused")
        original, port = load(session / "handoff.json")
        require(port != 443, "backend_port_refused")
        phase = "tailscale_status_unavailable"
        host = self_address(h.strict_object(runner([str(tailscale), "status", "--json"])))
        report["tailnetSelfOnline"] = True
        phase = "serve_status_unavailable"
        serve = h.strict_object(runner([str(tailscale), "serve", "status", "--json"]))
        require_unused_private_ports(serve, port)
        report.update(desiredPortsUnused=True, funnelAbsentInSnapshot=True)
        phase = "current_host_not_ready"
        current = check_host(session)
        require(type(current) is dict and current.get("status") == "Pass", phase)
        report["currentHostReady"] = True
        phase = "private_handoff_changed"
        latest, latest_port = load(session / "handoff.json")
        require(latest == original and latest_port == port, phase)
        route = {"schemaVersion": 1, "tailnetHost": host,
                 "handoffSha256": hashlib.sha256(original).hexdigest()}
        phase = "private_output_refused"
        write_new_private(output, (json.dumps(route, separators=(",", ":")) + "\n").encode("ascii"))
        report.update(status="Pass", category=None, privateRouteWritten=True)
    except Refused as error:
        report["category"] = str(error)
    except Exception:
        # Native errors, JSON values, private paths and credentials never escape.
        report["category"] = phase
    return report


class SafeParser(argparse.ArgumentParser):
    def error(self, message):
        raise Refused("arguments_refused")


def main(argv=None):
    report = base_report()
    try:
        parser = SafeParser(description=__doc__)
        parser.add_argument("--session", type=Path, required=True)
        parser.add_argument("--tailscale", type=Path, required=True)
        parser.add_argument("--output", type=Path, required=True)
        args = parser.parse_args(argv)
        report = prepare(args.session, args.tailscale, args.output)
    except Refused as error:
        report["category"] = str(error)
    except Exception:
        report["category"] = "preflight_refused"
    sys.stdout.write(json.dumps(report, separators=(",", ":")) + "\n")
    return 0 if report["status"] == "Pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
