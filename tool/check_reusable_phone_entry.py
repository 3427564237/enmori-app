#!/usr/bin/env python3
"""Bounded #135 connection checks; never starts a runtime, tunnel or Android app."""
from __future__ import annotations

import argparse
import base64
from datetime import datetime
import hashlib
import http.client
import json
from pathlib import Path
import re
import socket
import ssl
import sys
import threading
import time

import li_controlled_phone_handoff as handoff_tool
from private_handoff_file import read_private_handoff_file

SOURCE = "b3c8a2223bd305c65a56cbd4fc88aff13b8a1d8e"
APK_SHA256 = "776bc6a640fff73ba0382d0dcfb56c685f4bc787397901961ca4839ca0cfb825"
SETTINGS_PATH = "/v1/me/settings"
AUTH_PATH = "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=controlled-emulator-key"
MAX_RESPONSE = 65536
ROOT = Path(__file__).resolve().parents[1]


class Refused(Exception):
    """A fixed, non-content failure category only."""


def require(condition, reason):
    if not condition:
        raise Refused(reason)


class Window:
    def __init__(self, start: str, end: str):
        try:
            # An explicit SGT interval is an operator input, never an implied
            # permanent service window or a default execution appointment.
            pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00"
            require(re.fullmatch(pattern, start) and re.fullmatch(pattern, end), "invalid_sgt_window")
            self.start = datetime.fromisoformat(start).timestamp()
            self.end = datetime.fromisoformat(end).timestamp()
            require(self.start < self.end, "invalid_sgt_window")
        except (ValueError, TypeError):
            raise Refused("invalid_sgt_window") from None

    def remaining(self, clock=time.time):
        now = clock()
        require(self.start <= now < self.end, "outside_agreed_window")
        return self.end - now


def procedure_sha256():
    digest = hashlib.sha256()
    for name in ("check_reusable_phone_entry.py", "li_controlled_phone_handoff.py", "private_handoff_file.py"):
        digest.update(name.encode("ascii") + b"\0")
        digest.update((ROOT / "tool" / name).read_bytes().replace(b"\r\n", b"\n"))
        digest.update(b"\0")
    return digest.hexdigest()


def json_object(data):
    try:
        return handoff_tool.strict_object(data)
    except handoff_tool.Blocked:
        raise Refused("response_shape_refused") from None


def request_json(*, tls, port, path, method, body, headers, context, timeout):
    """Fixed numeric loopback only; no environment proxy, redirect or retry."""
    connection = (http.client.HTTPSConnection("127.0.0.1", port, context=context, timeout=timeout)
                  if tls else http.client.HTTPConnection("127.0.0.1", port, timeout=timeout))
    expired = threading.Event()
    active_socket = [None]

    def expire():
        expired.set()
        current = active_socket[0]
        if current is not None:
            try:
                current.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            current.close()

    watchdog = threading.Timer(timeout, expire)
    watchdog.daemon = True
    watchdog.start()
    response = None
    try:
        connection.connect()
        active_socket[0] = connection.sock
        require(not expired.is_set(), "request_deadline_exceeded")
        connection.request(method, path, body=body, headers={"Connection": "close", **headers})
        response = connection.getresponse()
        content_type = response.getheader("Content-Type", "").split(";", 1)[0].strip().lower()
        raw = response.read(MAX_RESPONSE + 1)
        require(not expired.is_set(), "request_deadline_exceeded")
        require(len(raw) <= MAX_RESPONSE and content_type == "application/json", "response_shape_refused")
        return response.status, json_object(raw)
    finally:
        watchdog.cancel()
        watchdog.join()
        if response is not None:
            response.close()
        connection.close()


def valid_settings(value):
    if set(value) != {"settings"} or type(value["settings"]) is not dict:
        return False
    settings = value["settings"]
    return (set(settings) == {"checkInVisibility", "optionalProcessingConsent", "revision"}
            and settings["checkInVisibility"] in ("private", "friends_only", "public")
            and settings["optionalProcessingConsent"] in ("accepted", "rejected")
            and type(settings["revision"]) is int
            and 0 <= settings["revision"] <= 9007199254740991)


def check_connection(apk: Path, private_handoff: Path, window: Window, *,
                     clock=time.time, request=request_json, load=handoff_tool.handoff):
    report = {"status": "Blocked", "scope": "workstation-auth-backend-connection-only",
              "candidateSource": SOURCE, "apkSha256": APK_SHA256,
              "apkMatched": False, "backendTlsAndAuthGuard": False,
              "authSignIn": False, "authenticatedSettingsRead": False,
              "phoneFlow": "Not Run", "hostLifecycle": "Not established by this check",
              "category": "preflight_refused"}
    phase = "preflight_refused"
    data = token = value = None
    try:
        window.remaining(clock)
        require(apk.is_absolute() and private_handoff.is_absolute(), phase)
        with apk.open("rb") as stream:
            require(hashlib.file_digest(stream, "sha256").hexdigest() == APK_SHA256, "candidate_apk_mismatch")
        report["apkMatched"] = True
        data, port = load(private_handoff)
        initial_digest = hashlib.sha256(data).digest()
        value = json_object(data)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        # Same bounded certificate trust as the frozen APK. Never disable
        # hostname verification, trust system roots or substitute a tailnet URL.
        context.load_verify_locations(cadata=base64.b64decode(value["certificateBase64"]).decode("ascii"))

        def current():
            window.remaining(clock)
            latest, latest_port = load(private_handoff)
            require(latest_port == port and hashlib.sha256(latest).digest() == initial_digest,
                    "private_handoff_changed")
            return min(10.0, window.remaining(clock))

        def call(**kwargs):
            result = request(context=context, timeout=current(), **kwargs)
            window.remaining(clock)
            return result

        phase = "backend_tls_or_auth_guard_failed"
        status, result = call(tls=True, port=port, path=SETTINGS_PATH, method="GET", body=None, headers={})
        require(status == 401 and type(result.get("error")) is dict
                and result["error"].get("code") == "AUTH_REQUIRED", phase)
        report["backendTlsAndAuthGuard"] = True
        phase = "auth_sign_in_failed"
        payload = json.dumps({"email": value["email"], "password": value["password"],
                              "returnSecureToken": True}, separators=(",", ":")).encode("utf-8")
        status, result = call(tls=False, port=9099, path=AUTH_PATH, method="POST", body=payload,
                              headers={"Content-Type": "application/json"})
        payload = None
        require(status == 200 and type(result.get("idToken")) is str
                and 0 < len(result["idToken"]) <= 16384
                and re.fullmatch(r"[^\s,\x00-\x1f\x7f]+", result["idToken"]) is not None, phase)
        token = result["idToken"]
        report["authSignIn"] = True
        phase = "authenticated_backend_read_failed"
        status, result = call(tls=True, port=port, path=SETTINGS_PATH, method="GET", body=None,
                              headers={"Authorization": "Bearer " + token})
        require(status == 200 and valid_settings(result), phase)
        current()
        report.update(status="Pass", category=None, authenticatedSettingsRead=True)
    except Refused as error:
        report["category"] = str(error)
    except (OSError, ValueError, TypeError, KeyError, http.client.HTTPException, handoff_tool.Blocked):
        report["category"] = phase
    finally:
        # Best effort reference release, not a memory-zeroization guarantee.
        data = token = value = None
    return report


def host_status_usable(value):
    return (value.get("scope") == "isolated-phone-service" and value.get("phase") == "running"
            and value.get("admission") == "open"
            and value.get("adapterState") in ("stopped", "not_checked", "ready")
            and all(value.get(k) is True for k in ("accepting", "maintenanceHealthy", "retirementConfirmed",
                                                  "httpsListening", "hostPreflightPassed", "tokenizerReadinessPassed"))
            and all(value.get(k) is False for k in ("quarantined", "operatorHold", "stopRequested"))
            and all(type(value.get(k)) is int and value[k] == 0
                    for k in ("modelPending", "compilerPending", "activeCalls", "nonTerminal"))
            and type(value.get("eventBrowse")) is dict
            and type(value["eventBrowse"].get("pending")) is int
            and value["eventBrowse"]["pending"] == 0
            and type(value.get("modelAttempts")) is int and value["modelAttempts"] >= 0)


def check_host(session: Path, window: Window, *, clock=time.time, sleep=time.sleep,
               read=read_private_handoff_file, load=handoff_tool.handoff):
    report = {"status": "Blocked", "scope": "original-host-current-status-only",
              "category": "host_status_unavailable", "quietSamples": 0,
              "originalLeaseSettlement": "Operator must independently confirm before startup",
              "networkOrModelStarted": False}
    try:
        require(session.is_absolute(), "private_session_refused")
        window.remaining(clock)
        initial, _ = load(session / "handoff.json")
        initial_digest = hashlib.sha256(initial).digest()
        first = None
        for _ in range(2):
            window.remaining(clock)
            path = session / "status.json"
            before = path.stat(follow_symlinks=False)
            require(-2 <= clock() - before.st_mtime < 5, "host_status_stale")
            raw = read(path)
            after = path.stat(follow_symlinks=False)
            window.remaining(clock)
            require(-2 <= clock() - after.st_mtime < 5, "host_status_stale")
            require((before.st_dev, before.st_ino, before.st_mtime_ns, before.st_size)
                    == (after.st_dev, after.st_ino, after.st_mtime_ns, after.st_size), "host_status_changed_during_read")
            value = json_object(raw)
            require(host_status_usable(value), "original_service_busy_or_held_do_not_reset")
            require(first is None or value["modelAttempts"] == first, "model_activity_changed")
            first = value["modelAttempts"]
            latest, _ = load(session / "handoff.json")
            require(hashlib.sha256(latest).digest() == initial_digest, "private_handoff_changed")
            window.remaining(clock)
            require(-2 <= clock() - after.st_mtime < 5, "host_status_stale")
            report["quietSamples"] += 1
            if report["quietSamples"] == 1:
                require(window.remaining(clock) > 0.7, "outside_agreed_window")
                sleep(0.7)
        window.remaining(clock)
        report.update(status="Pass", category=None)
    except Refused as error:
        report["category"] = str(error)
    except Exception:
        # The private reader's fixed refusals and filesystem failures remain
        # content-free. This snapshot never cleans or replaces the original.
        report["category"] = "host_status_unavailable"
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("host-check", "connection-check"))
    parser.add_argument("--window-start-sgt", required=True)
    parser.add_argument("--window-end-sgt", required=True)
    parser.add_argument("--session", type=Path)
    parser.add_argument("--apk", type=Path)
    parser.add_argument("--handoff", type=Path)
    args = parser.parse_args(argv)
    initial_procedure = None
    try:
        initial_procedure = procedure_sha256()
        window = Window(args.window_start_sgt, args.window_end_sgt)
        if args.mode == "host-check":
            require(args.session is not None and args.apk is None and args.handoff is None, "arguments_refused")
            report = check_host(args.session, window)
        else:
            require(args.session is None and args.apk is not None and args.handoff is not None, "arguments_refused")
            report = check_connection(args.apk, args.handoff, window)
        require(procedure_sha256() == initial_procedure, "procedure_changed")
        report["procedureSha256"] = initial_procedure
    except Refused as error:
        report = {"status": "Blocked", "category": str(error)}
    except Exception:
        report = {"status": "Blocked", "category": "preflight_refused"}
    if initial_procedure is not None:
        report["procedureSha256"] = initial_procedure
    sys.stdout.write(json.dumps(report, separators=(",", ":")) + "\n")
    return 0 if report["status"] == "Pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
