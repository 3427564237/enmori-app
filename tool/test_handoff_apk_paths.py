"""APK receiver-path regressions; ADB and private configuration are always synthetic.

Native Windows checks are opt-in via existing absolute paths in
ENMORI_TEST_NATIVE_AAPT, ENMORI_TEST_NATIVE_APK, and the approved artifact digest
ENMORI_TEST_NATIVE_APK_SHA256. They use read-only hard links in owned temporary
receiver directories, never copy/rebuild/install the source APK or contact ADB.
"""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import li_controlled_phone_handoff as target


REAL_SUBPROCESS_RUN = subprocess.run
BADGING = (b"package: name='com.enmori.app.personatest' versionCode='1'\n"
           b"launchable-activity: name='com.enmori.app.MainActivity'\n")


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


class TransferFixture:
    """Full transfer flow with real validation/parser and synthetic device replies."""

    def __init__(self, case, apk, directory, *, native_aapt=None):
        self.case = case
        self.apk = apk
        self.private = directory / "synthetic-private-handoff.json"
        self.aapt = str(native_aapt or directory / "tools" / "aapt.exe")
        self.adb = str(directory / "tools" / "never-executed-adb.exe")
        self.sha = digest(apk)
        self.original_cwd = Path.cwd()
        self.native_aapt = native_aapt is not None
        self.calls = []
        self.force_aapt_failure = False
        self.force_aapt_exception = False
        self.mapping = {"tcp:9099": "tcp:9099"}
        self.nonce = "a" * 64
        self.token = "b" * 32
        self.body = json.dumps({
            "schemaVersion": 1, "projectId": "demo-enmori-rmvp01a-r10",
            "email": "path-fixture@example.invalid", "password": "SyntheticPathPrivateCanary!",
            "baseUri": "https://127.0.0.1:42425/",
            "certificateBase64": base64.b64encode(
                b"-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n").decode(),
            "authEmulatorHost": "127.0.0.1:9099",
            "lifetime": "until-explicit-stop-in-this-owned-process", "syntheticOwnerOnly": True,
        }).encode()

    def subprocess(self, arguments, **options):
        self.calls.append((list(arguments), dict(options)))
        self.case.assertEqual(Path.cwd(), self.original_cwd, "Child cwd must not change Python cwd")
        if arguments[0] == self.aapt:
            if self.force_aapt_exception:
                raise OSError("SyntheticPathPrivateCanary: Illegal byte sequence")
            if self.force_aapt_failure:
                return subprocess.CompletedProcess(arguments, 1, b"", b"SyntheticPathPrivateCanary")
            if self.native_aapt:
                return REAL_SUBPROCESS_RUN(arguments, **options)
            # Model the reported native boundary, without claiming all Windows
            # SDK/locale combinations reject an absolute Unicode argument.
            relative = "./" + self.apk.name
            child_cwd = Path(options["cwd"]) if options.get("cwd") is not None else None
            if arguments != [self.aapt, "dump", "badging", relative] or child_cwd != self.apk.parent:
                return subprocess.CompletedProcess(arguments, 1, b"", b"Illegal byte sequence")
            return subprocess.CompletedProcess(arguments, 0, BADGING, b"")

        self.case.assertEqual(arguments[:3], [self.adb, "-s", "USBTEST00001"])
        self.case.assertIsNone(options.get("cwd"), "Only aapt may receive a per-child cwd")
        rest = arguments[3:]
        if rest == ["shell", "pm", "path", target.PACKAGE]:
            output = b"package:/data/app/fixture/base.apk\n"
        elif rest == ["shell", "toybox", "sha256sum", "/data/app/fixture/base.apk"]:
            output = f"{self.sha}  /data/app/fixture/base.apk\n".encode()
        elif rest == ["reverse", "--list"]:
            output = "".join(f"device {source} {destination}\n" for source, destination in self.mapping.items()).encode()
        elif rest[:2] == ["reverse", "--no-rebind"]:
            self.case.assertEqual(rest[2:], ["tcp:42425", "tcp:42425"])
            self.mapping[rest[2]] = rest[3]
            output = b""
        else:
            self.case.assertEqual(rest[0], "shell")
            parsed = shlex.split(rest[1])
            self.case.assertEqual(parsed[:4], ["run-as", target.PACKAGE, "sh", "-c"])
            script = parsed[4]
            if script == target.READ_READY:
                output = json.dumps({"schemaVersion": 1, "nonce": self.nonce}).encode()
            elif script == target.DELIVER:
                self.case.assertEqual(parsed[5:], [self.nonce, self.token])
                self.case.assertEqual(options.get("input"), self.body)
                output = b""
            elif script == target.CONSUMED:
                self.case.assertEqual(parsed[5:], [self.nonce, self.token])
                output = b"CONSUMED"
            else:
                self.case.fail("Unexpected synthetic device command")
        return subprocess.CompletedProcess(arguments, 0, output, b"")

    def transfer(self, *, apk=None):
        with patch.object(target, "read_private_handoff_file", return_value=self.body) as read, \
                patch.object(target.subprocess, "run", side_effect=self.subprocess), \
                patch.object(os, "chdir", side_effect=AssertionError("Process-global chdir is forbidden")), \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            report = target.transfer(apk if apk is not None else self.apk, self.private, "USBTEST00001",
                                     adb=self.adb, aapt=self.aapt, attempt_token=self.token,
                                     sleep=lambda _: self.case.fail("Unexpected consumption wait"))
        self.case.assertEqual(output.getvalue(), "")
        self.case.assertEqual(Path.cwd(), self.original_cwd)
        self.case.assertEqual(digest(self.apk), self.sha, "Source APK bytes changed")
        self.case.assertNotIn("SyntheticPathPrivateCanary", json.dumps(report))
        self.case.assertNotIn("Illegal byte sequence", json.dumps(report))
        return report, read

    def assert_only_aapt_called(self):
        self.case.assertEqual(len(self.calls), 1)
        self.case.assertEqual(self.calls[0][0][0], self.aapt)


class HandoffApkPathTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="enmori-path-stub-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve() / "接收 🧪 path with spaces"
        self.directory.mkdir()
        self.apk = self.directory / "candidate.apk"
        self.apk.write_bytes(b"Synthetic APK bytes, not an installable artifact")
        self.fixture = TransferFixture(self, self.apk, self.directory)

    def test_full_transfer_uses_relative_aapt_path_and_child_cwd_only(self):
        report, read = self.fixture.transfer()
        self.assertEqual(report["status"], "Pass")
        self.assertTrue(report["apkVerified"])
        self.assertTrue(report["installedApkMatched"])
        self.assertTrue(report["configurationConsumed"])
        self.assertEqual(report["apkSha256"], self.fixture.sha)
        read.assert_called_once_with(self.fixture.private)
        arguments, options = self.fixture.calls[0]
        self.assertEqual(arguments, [self.fixture.aapt, "dump", "badging", "./candidate.apk"])
        self.assertEqual(Path(options["cwd"]), self.directory)
        self.assertEqual(options["timeout"], 30)
        self.assertFalse(options["check"])
        self.assertTrue(all(call[1].get("cwd") is None for call in self.fixture.calls[1:]))
        for arguments, _ in self.fixture.calls:
            self.assertFalse(any(argument in ("install", "uninstall", "force-stop") for argument in arguments))

    def test_ascii_filename_with_spaces_remains_one_argument(self):
        apk = self.directory / "candidate original.apk"
        apk.write_bytes(self.apk.read_bytes())
        fixture = TransferFixture(self, apk, self.directory)
        report, _ = fixture.transfer()
        self.assertEqual(report["status"], "Pass")
        self.assertEqual(fixture.calls[0][0][-1], "./candidate original.apk")
        self.assertEqual(len(fixture.calls[0][0]), 4)

    def test_option_like_filename_is_prefixed_as_a_relative_file(self):
        apk = self.directory / "-candidate.apk"
        apk.write_bytes(self.apk.read_bytes())
        fixture = TransferFixture(self, apk, self.directory)
        report, _ = fixture.transfer()
        self.assertEqual(report["status"], "Pass")
        self.assertEqual(fixture.calls[0][0][-1], "./-candidate.apk")

    def test_aapt_nonzero_exit_is_safe_and_stops_before_adb(self):
        self.fixture.force_aapt_failure = True
        report, _ = self.fixture.transfer()
        self.assertEqual(report["category"], "command_failed")
        self.assertFalse(report["apkVerified"])
        self.assertEqual(report["createdReverseCount"], 0)
        self.fixture.assert_only_aapt_called()

    def test_aapt_os_error_is_safe_and_stops_before_adb(self):
        self.fixture.force_aapt_exception = True
        report, _ = self.fixture.transfer()
        self.assertEqual(report["category"], "command_failed")
        self.assertFalse(report["configurationConsumed"])
        self.fixture.assert_only_aapt_called()

    def test_absolute_input_requirement_is_preserved(self):
        report, read = self.fixture.transfer(apk=Path("candidate.apk"))
        self.assertEqual(report["category"], "preflight_refused")
        self.assertEqual(self.fixture.calls, [])
        read.assert_not_called()


@unittest.skipUnless(os.name == "nt", "Native Windows aapt path checks Not Run on this platform")
class NativeWindowsApkPathTests(unittest.TestCase):
    def setUp(self):
        names = ("ENMORI_TEST_NATIVE_AAPT", "ENMORI_TEST_NATIVE_APK", "ENMORI_TEST_NATIVE_APK_SHA256")
        values = [os.environ.get(name) for name in names]
        if not any(values):
            self.skipTest("Native aapt opt-in not supplied: real Windows APK checks Not Run")
        self.assertTrue(all(values), "Native opt-in requires existing aapt, original APK and approved SHA256")
        self.aapt, self.original = Path(values[0]), Path(values[1])
        self.expected = values[2].lower()
        self.assertTrue(self.aapt.is_absolute() and self.aapt.is_file())
        self.assertTrue(self.original.is_absolute() and self.original.is_file())
        self.assertRegex(self.expected, r"^[0-9a-f]{64}$")
        self.assertEqual(digest(self.original), self.expected, "Original artifact does not match approved digest")
        self.original_cwd = Path.cwd()
        temporary = tempfile.TemporaryDirectory(prefix="enmori-交接-🧪 path ")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve()
        self.addCleanup(self.assert_original_unchanged)

    def assert_original_unchanged(self):
        self.assertEqual(digest(self.original), self.expected)
        self.assertEqual(Path.cwd(), self.original_cwd)

    def test_native_original_apk_in_unicode_emoji_spaced_receiver_directory(self):
        apk = self.directory / "original-candidate.apk"
        os.link(self.original, apk)
        self.assertTrue(os.path.samefile(self.original, apk))
        self.assertEqual(digest(apk), self.expected)
        fixture = TransferFixture(self, apk, self.directory, native_aapt=self.aapt)
        report, _ = fixture.transfer()
        self.assertEqual(report["status"], "Pass")
        self.assertEqual(report["apkSha256"], self.expected)
        self.assertTrue(report["apkVerified"])
        self.assertEqual(fixture.calls[0][0], [str(self.aapt), "dump", "badging", "./original-candidate.apk"])
        self.assertEqual(Path(fixture.calls[0][1]["cwd"]), self.directory)
        self.assertTrue(all(call[0][0] == fixture.adb for call in fixture.calls[1:]))

    def test_native_invalid_apk_stops_before_any_adb_call(self):
        apk = self.directory / "invalid.apk"
        apk.write_bytes(b"Synthetic invalid APK fixture")
        fixture = TransferFixture(self, apk, self.directory, native_aapt=self.aapt)
        report, _ = fixture.transfer()
        self.assertEqual(report["status"], "Blocked")
        self.assertEqual(report["category"], "command_failed")
        self.assertFalse(report["apkVerified"])
        fixture.assert_only_aapt_called()


if __name__ == "__main__":
    unittest.main()
