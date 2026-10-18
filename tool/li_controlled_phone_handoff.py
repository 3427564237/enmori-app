#!/usr/bin/env python3
"""Deliver an existing private #117 handoff to the dedicated waiting app only."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import secrets
import shlex
import subprocess
import sys
import time
from urllib.parse import urlsplit

from private_handoff_file import PrivateFileRefused, read_private_handoff_file

PACKAGE = "com.enmori.app.personatest"
READY = "enmori-controlled-phone-ready.json"
CONFIG = "enmori-controlled-phone-service.json"
OWNER = "enmori-controlled-phone-service.owner"
TEMP = "enmori-controlled-phone-service.tmp"
DIRECTORY = ('if [ -d code_cache ]; then directory=code_cache; '
             'elif [ -d cache ]; then directory=cache; else exit 1; fi; ')
MATCH_READY = (f'test -f "$directory/{READY}" && test ! -L "$directory/{READY}" || exit 1; '
               f'ready=$(tr -d "[:space:]" < "$directory/{READY}") || exit 1; '
               r'expected="{\"schemaVersion\":1,\"nonce\":\"$0\"}"; '
               r'alternate="{\"nonce\":\"$0\",\"schemaVersion\":1}"; '
               '[ "$ready" = "$expected" ] || [ "$ready" = "$alternate" ] || exit 1; ')
READ_READY = DIRECTORY + f'test ! -L "$directory/{READY}" && head -c 1025 "$directory/{READY}"'
DELIVER = (DIRECTORY + MATCH_READY + 'umask 077; '
           f'test ! -e "$directory/{CONFIG}" && test ! -L "$directory/{CONFIG}" && '
           f'test ! -e "$directory/{TEMP}" && test ! -L "$directory/{TEMP}" || exit 1; '
           # A fresh host-attempt token prevents a concurrent same-ready-nonce
           # caller from cleaning another caller's successful ownership claim.
           f'set -C; printf "%s\\n" "$1" > "$directory/{OWNER}" || exit 1; set +C; '
           f'cat > "$directory/{TEMP}" || exit 1; '
           + MATCH_READY + f'mv "$directory/{TEMP}" "$directory/{CONFIG}"')
CLEAN = (DIRECTORY + f'test -f "$directory/{OWNER}" && test ! -L "$directory/{OWNER}" || exit 1; '
         f'[ "$(cat "$directory/{OWNER}")" = "$0" ] || exit 1; '
         f'rm -f "$directory/{CONFIG}" "$directory/{TEMP}" "$directory/{OWNER}"')
CONSUMED = (DIRECTORY + f'test -f "$directory/{OWNER}" && test ! -L "$directory/{OWNER}" || exit 1; '
            f'[ "$(cat "$directory/{OWNER}")" = "$1" ] || exit 1; '
            f'if [ ! -e "$directory/{CONFIG}" ] && [ ! -e "$directory/{TEMP}" ] && '
            f'[ ! -e "$directory/{READY}" ]; then rm -f "$directory/{OWNER}" || exit 1; '
            'printf "CONSUMED"; else '
            # The consumer removes CONFIG and READY asynchronously. A READY
            # disappearance during this read is WAIT, then the next full-absence
            # observation confirms consumption. A present wrong nonce, unreadable
            # file or symlink still fails closed; ownership checks are unchanged.
            + '(' + MATCH_READY + ') || { '
            f'test ! -e "$directory/{READY}" && test ! -L "$directory/{READY}" || exit 1; '
            '}; printf "WAIT"; fi')


class Blocked(Exception):
    """A fixed, content-free category only."""


def require(condition: bool, category: str = "preflight_refused") -> None:
    if not condition:
        raise Blocked(category)


def strict_object(data: bytes) -> dict:
    def pairs(values):
        result = {}
        for key, value in values:
            require(key not in result, "invalid_json")
            result[key] = value
        return result
    try:
        value = json.loads(data.decode("utf-8"), object_pairs_hook=pairs)
        require(type(value) is dict, "invalid_json")
        return value
    except (ValueError, UnicodeError):
        raise Blocked("invalid_json") from None


def handoff(path: Path) -> tuple[bytes, int]:
    try:
        data = read_private_handoff_file(path)
    except PrivateFileRefused:
        raise Blocked("preflight_refused") from None
    value = strict_object(data)
    require(set(value) == {"schemaVersion", "projectId", "email", "password", "baseUri",
                           "certificateBase64", "authEmulatorHost", "lifetime", "syntheticOwnerOnly"})
    require(type(value["schemaVersion"]) is int and value["schemaVersion"] == 1)
    require(value["projectId"] == "demo-enmori-rmvp01a-r10"
            and value["authEmulatorHost"] == "127.0.0.1:9099"
            and value["syntheticOwnerOnly"] is True
            and value["lifetime"] == "until-explicit-stop-in-this-owned-process")
    require(isinstance(value["email"], str) and re.fullmatch(r"[a-z0-9][a-z0-9._+-]{1,80}@example\.invalid", value["email"]) is not None)
    require(isinstance(value["password"], str)
            and 12 <= len(value["password"].encode("utf-16-le")) // 2 <= 256
            and not re.search(r"[\x00-\x1f\x7f]", value["password"]))
    require(isinstance(value["baseUri"], str)
            and re.fullmatch(r"https://127\.0\.0\.1:[1-9][0-9]{0,4}/", value["baseUri"]) is not None)
    try:
        uri = urlsplit(value["baseUri"])
        port = uri.port
        require(uri.scheme == "https" and uri.hostname == "127.0.0.1"
                and uri.username is None and uri.password is None and uri.path == "/"
                and not uri.query and not uri.fragment and port is not None
                and 1 <= port <= 65535 and port != 9099)
        require(isinstance(value["certificateBase64"], str))
        certificate = base64.b64decode(value["certificateBase64"], validate=True)
        require(len(certificate) <= 16384
                and base64.b64encode(certificate).decode("ascii") == value["certificateBase64"])
        block = re.fullmatch(rb"-----BEGIN CERTIFICATE-----\r?\n([A-Za-z0-9+/=\r\n]+)\r?\n-----END CERTIFICATE-----(?:\r?\n)?", certificate)
        require(block is not None)
        require(bool(base64.b64decode(re.sub(rb"[\r\n]", b"", block[1]), validate=True)))
    except (ValueError, TypeError):
        raise Blocked("preflight_refused") from None
    return data, port


def run(arguments: list[str], *, input: bytes | None = None, cwd: Path | None = None) -> bytes:
    try:
        completed = subprocess.run(arguments, input=input, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, timeout=30, check=False, cwd=cwd)
        require(completed.returncode == 0 and len(completed.stdout) <= 524288, "command_failed")
        return completed.stdout
    except (OSError, subprocess.SubprocessError):
        raise Blocked("command_failed") from None


def transfer(apk: Path, private_handoff: Path, serial: str, *, adb: str, aapt: str,
             runner=run, clock=time.monotonic, sleep=time.sleep, consume_timeout=20.0,
             attempt_token=None) -> dict:
    report = {"status": "Blocked", "category": "preflight_refused", "apkVerified": False,
              "installedApkMatched": False, "readyNonceVerified": False,
              "configurationConsumed": False, "failureCleanupConfirmed": True,
              "createdReverseCount": 0}
    owned_reverses = []
    body = None
    attempted = False
    reverse_pending = None
    token = attempt_token or secrets.token_hex(16)

    def command(args, **kwargs):
        return runner([adb, "-s", serial, *args], **kwargs)

    def shell(script, *values):
        # Values are validated non-content nonces only; private configuration
        # travels exclusively through the subprocess stdin below.
        return ["shell", f"run-as {PACKAGE} sh -c {shlex.quote(script)} "
                + " ".join(shlex.quote(value) for value in values)]

    def reverses():
        rows = command(["reverse", "--list"]).decode("ascii").splitlines()
        result = {}
        for line in rows:
            if not line.strip():
                continue
            fields = line.split()
            require(len(fields) == 3 and fields[1] not in result, "reverse_conflict")
            result[fields[1]] = fields[2]
        return result

    try:
        require(re.fullmatch(r"[A-Za-z0-9]{6,64}", serial) is not None)
        require(re.fullmatch(r"[0-9a-f]{32}", token) is not None)
        require(consume_timeout > 0)
        require(apk.is_absolute() and apk.is_file() and private_handoff.is_absolute())
        require(all(Path(tool).is_absolute() for tool in (adb, aapt)))
        body, https_port = handoff(private_handoff)
        with apk.open("rb") as stream:
            apk_hash = hashlib.file_digest(stream, "sha256").hexdigest()
        report["apkSha256"] = apk_hash
        # Some Windows aapt/locale combinations cannot decode a Unicode parent
        # in argv. Keep the absolute input/hash, but give this child alone the
        # APK directory and relative filename; ./ also protects option-like names.
        badging = runner([aapt, "dump", "badging", "./" + apk.name], cwd=apk.parent).decode("utf-8")
        require(re.search(r"^package: name='com\.enmori\.app\.personatest'(?:\s|$)", badging, re.M) is not None,
                "apk_identity_refused")
        require(re.search(r"^launchable-activity: name='com\.enmori\.app\.MainActivity'(?:\s|$)", badging, re.M) is not None,
                "apk_identity_refused")
        report["apkVerified"] = True
        paths = command(["shell", "pm", "path", PACKAGE]).decode("ascii").splitlines()
        require(all(re.fullmatch(r"package:/data/app/[A-Za-z0-9_./=+~-]+\.apk", p) for p in paths), "installed_apk_refused")
        bases = [p[len("package:"):] for p in paths if p.endswith("/base.apk")]
        require(len(bases) == 1, "installed_apk_refused")
        checksum = command(["shell", "toybox", "sha256sum", bases[0]]).decode("ascii").strip().split(maxsplit=1)
        require(len(checksum) == 2 and checksum[1].strip() == bases[0]
                and checksum[0] == apk_hash, "installed_apk_mismatch")
        report["installedApkMatched"] = True
        raw_ready = command(shell(READ_READY))
        require(len(raw_ready) <= 1024, "ready_refused")
        ready = strict_object(raw_ready)
        require(set(ready) == {"schemaVersion", "nonce"}
                and type(ready["schemaVersion"]) is int and ready["schemaVersion"] == 1
                and isinstance(ready["nonce"], str)
                and re.fullmatch(r"[0-9a-f]{64}", ready["nonce"]) is not None, "ready_refused")
        nonce = ready["nonce"]
        report["readyNonceVerified"] = True
        endpoints = ["tcp:9099", f"tcp:{https_port}"]
        existing = reverses()
        require(all(endpoint not in existing or existing[endpoint] == endpoint
                    for endpoint in endpoints), "reverse_conflict")
        for endpoint in endpoints:
            if endpoint not in existing:
                reverse_pending = endpoint
                command(["reverse", "--no-rebind", endpoint, endpoint])
                owned_reverses.append(endpoint)
                reverse_pending = None
        report["createdReverseCount"] = len(owned_reverses)
        attempted = True
        command(shell(DELIVER, nonce, token), input=body)
        body = None
        deadline = clock() + consume_timeout
        while True:
            state = command(shell(CONSUMED, nonce, token)).strip()
            require(state in (b"WAIT", b"CONSUMED"), "consume_refused")
            if state == b"CONSUMED":
                break
            require(clock() < deadline, "consume_timeout")
            sleep(0.1)
        report.update(status="Pass", category=None, configurationConsumed=True)
        return report
    except Blocked as error:
        report["category"] = str(error)
    except (OSError, ValueError, UnicodeError, TypeError):
        report["category"] = "preflight_refused"
    finally:
        body = None
        if report["status"] != "Pass":
            if reverse_pending is not None:
                # A missing ADB acknowledgment does not prove ownership of a
                # mapping; preserve it and report uncertainty instead of delete.
                report["failureCleanupConfirmed"] = False
            if attempted:
                try:
                    command(shell(CLEAN, token))
                except Exception:
                    report["failureCleanupConfirmed"] = False
            for endpoint in reversed(owned_reverses):
                try:
                    current = reverses()
                    if current.get(endpoint) == endpoint:
                        command(["reverse", "--remove", endpoint])
                    elif endpoint in current:
                        report["failureCleanupConfirmed"] = False
                except Exception:
                    report["failureCleanupConfirmed"] = False
    return report


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--handoff", type=Path, required=True)
    parser.add_argument("--serial", required=True)
    parser.add_argument("--adb", default="/home/miku/Android/Sdk/platform-tools/adb")
    parser.add_argument("--aapt", default="/home/miku/Android/Sdk/build-tools/36.0.0/aapt")
    options = parser.parse_args(argv)
    report = transfer(options.apk, options.handoff, options.serial, adb=options.adb, aapt=options.aapt)
    sys.stdout.write(json.dumps(report, separators=(",", ":")) + "\n")
    return 0 if report["status"] == "Pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
