import base64
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import time
import unittest

import li_controlled_phone_handoff as target


class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.apk = self.directory / "candidate.apk"
        self.apk.write_bytes(b"synthetic dedicated APK")
        self.sha = hashlib.sha256(self.apk.read_bytes()).hexdigest()
        self.private = self.directory / "handoff.json"
        self.value = {"schemaVersion": 1, "projectId": "demo-enmori-rmvp01a-r10",
                      "email": "synthetic-owner@example.invalid", "password": "SyntheticPrivatePassword!",
                      "baseUri": "https://127.0.0.1:42425/", "certificateBase64": base64.b64encode(
                          b"-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n").decode(),
                      "authEmulatorHost": "127.0.0.1:9099", "lifetime": "until-explicit-stop-in-this-owned-process",
                      "syntheticOwnerOnly": True}
        self.write_handoff()
        self.nonce = "a" * 64
        self.token = "b" * 32
        self.ready = json.dumps({"schemaVersion": 1, "nonce": self.nonce}).encode()
        self.calls = []
        self.mapping = {"tcp:9099": "tcp:9099"}
        self.fail_write = self.wait_forever = self.change_mapping = self.reverse_lost_ack = False
        self.other_package = self.hash_mismatch = False
        self.cleaned = False
        self.tick = 0

    def write_handoff(self):
        self.private.write_text(json.dumps(self.value))
        self.private.chmod(0o600)

    def runner(self, args, input=None, cwd=None):
        self.calls.append((args, input))
        if args[0] == "/tools/aapt":
            self.assertEqual(args, ["/tools/aapt", "dump", "badging", "./" + self.apk.name])
            self.assertEqual(cwd, self.apk.parent)
            package = "com.enmori.app" if self.other_package else target.PACKAGE
            return f"package: name='{package}' versionCode='1'\nlaunchable-activity: name='com.enmori.app.MainActivity'\n".encode()
        self.assertIsNone(cwd)
        self.assertEqual(args[:3], ["/tools/adb", "-s", "USBTEST00001"])
        rest = args[3:]
        if rest[:3] == ["shell", "pm", "path"]:
            self.assertEqual(rest[3], target.PACKAGE)
            return b"package:/data/app/~~test==/com.enmori.app.personatest-test==/base.apk\n"
        if rest[:3] == ["shell", "toybox", "sha256sum"]:
            checksum = "0" * 64 if self.hash_mismatch else self.sha
            return f"{checksum}  {rest[3]}\n".encode()
        if rest == ["reverse", "--list"]:
            return "".join(f"device {a} {b}\n" for a, b in self.mapping.items()).encode()
        if rest[:2] == ["reverse", "--no-rebind"]:
            self.assertNotIn(rest[2], self.mapping)
            self.mapping[rest[2]] = rest[3]
            if self.reverse_lost_ack:
                raise target.Blocked("command_failed")
            return b""
        if rest[:2] == ["reverse", "--remove"]:
            del self.mapping[rest[2]]
            return b""
        self.assertEqual(rest[0], "shell")
        shell = shlex.split(rest[1])
        self.assertEqual(shell[:4], ["run-as", target.PACKAGE, "sh", "-c"])
        script = shell[4]
        if script == target.READ_READY:
            return self.ready
        if script == target.DELIVER:
            self.assertEqual(shell[5:], [self.nonce, self.token])
            self.assertEqual(json.loads(input), self.value)
            if self.fail_write:
                if self.change_mapping:
                    self.mapping["tcp:42425"] = "tcp:42426"
                raise target.Blocked("command_failed")
            return b""
        if script == target.CONSUMED:
            return b"WAIT" if self.wait_forever else b"CONSUMED"
        if script == target.CLEAN:
            self.assertEqual(shell[5:], [self.token])
            self.cleaned = True
            return b""
        self.fail("Unexpected command")

    def clock(self):
        self.tick += 1
        return self.tick

    def transfer(self):
        return target.transfer(self.apk, self.private, "USBTEST00001", adb="/tools/adb", aapt="/tools/aapt",
                               runner=self.runner, clock=self.clock, sleep=lambda _: None,
                               consume_timeout=2, attempt_token=self.token)

    def test_success_verifies_installed_bytes_and_consumption_without_credential_output(self):
        report = self.transfer()
        self.assertEqual(report["status"], "Pass")
        self.assertTrue(report["configurationConsumed"])
        self.assertEqual(report["apkSha256"], self.sha)
        self.assertEqual(self.mapping, {"tcp:9099": "tcp:9099", "tcp:42425": "tcp:42425"})
        self.assertEqual(report["createdReverseCount"], 1)
        public = json.dumps(report)
        arguments = json.dumps([call[0] for call in self.calls])
        for secret in [self.value["email"], self.value["password"], self.value["baseUri"], self.value["certificateBase64"]]:
            self.assertNotIn(secret, public)
            self.assertNotIn(secret, arguments)
        self.assertFalse(any("install" in x or "uninstall" in x or "force-stop" in x for args, _ in self.calls for x in args))

    def test_empty_reverse_list_with_adb_blank_line_is_successful(self):
        self.mapping = {}
        original = self.runner
        def blank_runner(args, input=None, cwd=None):
            if args[3:] == ["reverse", "--list"] and not self.mapping:
                return b"\n"
            return original(args, input=input, cwd=cwd)
        report = target.transfer(self.apk, self.private, "USBTEST00001", adb="/tools/adb", aapt="/tools/aapt",
                                 runner=blank_runner, clock=self.clock, sleep=lambda _: None,
                                 consume_timeout=2, attempt_token=self.token)
        self.assertEqual(report["status"], "Pass")
        self.assertEqual(report["createdReverseCount"], 2)

    def test_wrong_apk_package_refused_before_adb(self):
        self.other_package = True
        self.assertEqual(self.transfer()["category"], "apk_identity_refused")
        self.assertEqual(len(self.calls), 1)

    def test_installed_apk_mismatch_refused_before_ready_or_reverse(self):
        self.hash_mismatch = True
        self.assertEqual(self.transfer()["category"], "installed_apk_mismatch")
        self.assertEqual(len(self.calls), 3)

    def test_private_file_permissions_are_checked_before_any_command(self):
        self.private.chmod(0o644)
        self.assertEqual(self.transfer()["status"], "Blocked")
        self.assertEqual(self.calls, [])

    def test_ready_requires_exact_fields_and_lower_hex_nonce(self):
        for ready in [{"schemaVersion": 1, "nonce": "A" * 64},
                      {"schemaVersion": True, "nonce": self.nonce},
                      {"schemaVersion": 1, "nonce": self.nonce, "extra": True}]:
            self.ready = json.dumps(ready).encode()
            self.assertEqual(self.transfer()["category"], "ready_refused")
        self.ready = b'{"schemaVersion":1,"nonce":"' + self.nonce.encode() + b'","nonce":"' + self.nonce.encode() + b'"}'
        self.assertEqual(self.transfer()["category"], "invalid_json")

    def test_reverse_conflict_is_refused_without_mutating_existing_mapping(self):
        self.mapping["tcp:42425"] = "tcp:7777"
        self.assertEqual(self.transfer()["category"], "reverse_conflict")
        self.assertEqual(self.mapping["tcp:42425"], "tcp:7777")
        self.assertFalse(any("--no-rebind" in args for args, _ in self.calls))

    def test_failed_transfer_cleans_owned_files_and_own_reverse_only(self):
        self.fail_write = True
        report = self.transfer()
        self.assertEqual(report["status"], "Blocked")
        self.assertTrue(self.cleaned)
        self.assertTrue(report["failureCleanupConfirmed"])
        self.assertEqual(self.mapping, {"tcp:9099": "tcp:9099"})

    def test_consumption_timeout_is_not_a_pass_and_cleans(self):
        self.wait_forever = True
        report = self.transfer()
        self.assertEqual(report["category"], "consume_timeout")
        self.assertTrue(self.cleaned)
        self.assertEqual(self.mapping, {"tcp:9099": "tcp:9099"})

    def test_changed_mapping_is_preserved_and_cleanup_not_claimed(self):
        self.fail_write = self.change_mapping = True
        report = self.transfer()
        self.assertFalse(report["failureCleanupConfirmed"])
        self.assertEqual(self.mapping["tcp:42425"], "tcp:42426")

    def test_unknown_reverse_ack_is_preserved_and_not_claimed_clean(self):
        self.reverse_lost_ack = True
        report = self.transfer()
        self.assertFalse(report["failureCleanupConfirmed"])
        self.assertEqual(self.mapping["tcp:42425"], "tcp:42425")
        self.assertFalse(self.cleaned)

    def test_handoff_rejects_remote_endpoint_extra_field_and_wrong_project(self):
        for field, value in [("baseUri", "https://example.invalid:42425/"),
                             ("projectId", "real-project"), ("extra", "invalid")]:
            old = dict(self.value)
            self.value[field] = value
            self.write_handoff()
            self.assertEqual(self.transfer()["status"], "Blocked")
            self.assertEqual(self.calls, [])
            self.value = old

    def test_consumer_email_uri_password_and_certificate_boundaries_match(self):
        certificate = base64.b64decode(self.value["certificateBase64"])
        for field, value in [
            ("email", "a" * 82 + "@example.invalid"),
            ("baseUri", "https://127.0.0.1:042425/"),
            ("baseUri", "https://127.0.0.1:65536/"),
            ("baseUri", "https://127.0.0.1:42425/?"),
            ("baseUri", "https://127.0.0.1:42425/#"),
            ("baseUri", "https://127.0.0.1:42425/\n"),
            ("password", "😀" * 129),
            ("certificateBase64", self.value["certificateBase64"] + "\n"),
            ("certificateBase64", base64.b64encode(certificate * 2).decode()),
            ("certificateBase64", base64.b64encode(b"-----BEGIN CERTIFICATE-----\n" + b"A" * 16400 + b"\n-----END CERTIFICATE-----\n").decode()),
            ("certificateBase64", base64.b64encode(b"-----BEGIN CERTIFICATE-----\n!bad!\n-----END CERTIFICATE-----\n").decode()),
        ]:
            with self.subTest(field=field):
                old = dict(self.value)
                self.value[field] = value
                self.write_handoff()
                self.assertEqual(self.transfer()["status"], "Blocked")
                self.assertEqual(self.calls, [])
                self.value = old

    def test_real_posix_nonce_guard_atomic_stdin_and_owned_cleanup(self):
        cache = self.directory / "code_cache"
        cache.mkdir()
        ready = cache / target.READY
        ready.write_text(json.dumps({"schemaVersion": 1, "nonce": self.nonce}))
        body = b'{"synthetic":"literal $(touch SHOULD_NOT_EXIST) `id`"}'
        def execute(script, *values, data=None):
            return subprocess.run(["/bin/sh", "-c", script, *values], input=data,
                                  cwd=self.directory, capture_output=True, check=False)
        result = execute(target.DELIVER, "c" * 64, self.token, data=body)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((cache / target.CONFIG).exists())

        result = execute(target.DELIVER, self.nonce, self.token, data=body)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((cache / target.CONFIG).read_bytes(), body)
        self.assertEqual((cache / target.CONFIG).stat().st_mode & 0o777, 0o600)
        self.assertFalse((self.directory / "SHOULD_NOT_EXIST").exists())
        # A competing caller with the SAME app nonce does not own this delivery.
        competitor = "d" * 32
        self.assertNotEqual(execute(target.DELIVER, self.nonce, competitor, data=body).returncode, 0)
        self.assertNotEqual(execute(target.CLEAN, competitor).returncode, 0)
        self.assertTrue((cache / target.CONFIG).exists())
        self.assertEqual(execute(target.CONSUMED, self.nonce, self.token).stdout, b"WAIT")
        (cache / target.CONFIG).unlink()
        ready.unlink()
        self.assertEqual(execute(target.CONSUMED, self.nonce, self.token).stdout, b"CONSUMED")
        self.assertFalse((cache / target.OWNER).exists())
        # Cache fallback and matching-owner failure cleanup use the same script.
        cache.rmdir()
        cache = self.directory / "cache"
        cache.mkdir()
        (cache / target.READY).write_text(json.dumps({"schemaVersion": 1, "nonce": self.nonce}))
        self.assertEqual(execute(target.DELIVER, self.nonce, self.token, data=body).returncode, 0)
        self.assertEqual(execute(target.CLEAN, self.token).returncode, 0)
        self.assertTrue((cache / target.READY).exists())
        self.assertFalse((cache / target.CONFIG).exists())

    def test_ready_nonce_is_rechecked_before_atomic_commit(self):
        cache = self.directory / "code_cache"
        cache.mkdir()
        ready = cache / target.READY
        ready.write_text(json.dumps({"schemaVersion": 1, "nonce": self.nonce}))
        process = subprocess.Popen(["/bin/sh", "-c", target.DELIVER, self.nonce, self.token],
                                   cwd=self.directory, stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            deadline = time.monotonic() + 2
            while not (cache / target.OWNER).exists() and time.monotonic() < deadline:
                time.sleep(0.005)
            self.assertTrue((cache / target.OWNER).exists())
            # Restart replaces ready while the original stdin transfer waits.
            ready.write_text(json.dumps({"schemaVersion": 1, "nonce": "c" * 64}))
            process.communicate(b'{"synthetic":"private-input"}', timeout=2)
            self.assertNotEqual(process.returncode, 0)
            self.assertFalse((cache / target.CONFIG).exists())
            cleaned = subprocess.run(["/bin/sh", "-c", target.CLEAN, self.token],
                                     cwd=self.directory, capture_output=True, check=False)
            self.assertEqual(cleaned.returncode, 0)
            self.assertFalse((cache / target.TEMP).exists())
            self.assertTrue(ready.exists())
        finally:
            if process.poll() is None:
                process.kill()
                process.communicate()

    def test_consumption_ready_disappears_during_poll_waits_then_confirms(self):
        cache = self.directory / 'code_cache'
        cache.mkdir()
        (cache / target.OWNER).write_text(self.token + '\n')
        (cache / target.READY).write_text(json.dumps({'schemaVersion': 1, 'nonce': self.nonce}))
        # Dart has consumed CONFIG and removes READY between the poll's first
        # existence check and strict nonce read. This is an ordinary transition.
        prelude = ('test() { if [ "$1" = "-f" ] && '
                   f'[ "$2" = "code_cache/{target.READY}" ]; then '
                   f'/bin/rm -f "code_cache/{target.READY}"; fi; command test "$@"; }}; ')
        first = subprocess.run(['/bin/sh', '-c', prelude + target.CONSUMED, self.nonce, self.token],
                               cwd=self.directory, capture_output=True)
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(first.stdout, b'WAIT')
        self.assertTrue((cache / target.OWNER).exists())
        second = subprocess.run(['/bin/sh', '-c', target.CONSUMED, self.nonce, self.token],
                                cwd=self.directory, capture_output=True)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(second.stdout, b'CONSUMED')
        self.assertFalse((cache / target.OWNER).exists())

    def test_consumption_present_replacement_nonce_is_still_refused(self):
        cache = self.directory / 'code_cache'
        cache.mkdir()
        (cache / target.OWNER).write_text(self.token + '\n')
        ready = cache / target.READY
        ready.write_text(json.dumps({'schemaVersion': 1, 'nonce': 'c' * 64}))
        result = subprocess.run(['/bin/sh', '-c', target.CONSUMED, self.nonce, self.token],
                                cwd=self.directory, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(ready.exists())
        self.assertTrue((cache / target.OWNER).exists())

    def test_consumption_dangling_ready_symlink_is_still_refused(self):
        cache = self.directory / 'code_cache'
        cache.mkdir()
        (cache / target.OWNER).write_text(self.token + '\n')
        (cache / target.CONFIG).write_bytes(b'pending synthetic config')
        (cache / target.READY).symlink_to(cache / 'absent')
        result = subprocess.run(['/bin/sh', '-c', target.CONSUMED, self.nonce, self.token],
                                cwd=self.directory, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue((cache / target.OWNER).exists())


if __name__ == "__main__":
    unittest.main()
