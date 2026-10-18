"""Synthetic policy fixtures and real local OS files; never private handoffs."""
import base64
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path, PureWindowsPath
import struct
import tempfile
import unittest
from unittest.mock import patch

import li_controlled_phone_handoff as handoff
import private_handoff_file as target


USER = bytes.fromhex("010200000000000515000000e8030000")
OTHER = bytes.fromhex("010200000000000515000000e9030000")
EVERYONE = bytes.fromhex("010100000000000100000000")


def acl(*entries):
    body = b"".join(struct.pack("<BBHI", kind, flags, 8 + len(sid), 0x1f01ff) + sid
                    for kind, flags, sid in entries)
    return struct.pack("<BBHHH", 2, 0, 8 + len(body), len(entries), 0) + body


class PolicyTests(unittest.TestCase):
    def test_current_user_system_administrators_allow(self):
        target._check_windows_acl(USER, USER, acl(
            (0, 0, USER), (0, 0x10, target.SYSTEM_SID), (0, 0, target.ADMINISTRATORS_SID)))

    def test_deny_does_not_grant_access(self):
        target._check_windows_acl(USER, USER, acl((1, 0, EVERYONE), (0, 0, USER)))

    def test_empty_dacl_is_not_a_null_dacl(self):
        target._check_windows_acl(USER, USER, acl())
        with self.assertRaises(target.PrivateFileRefused):
            target._check_windows_acl(USER, USER, None)

    def test_owner_must_be_current_user(self):
        for owner in (OTHER, target.SYSTEM_SID, target.ADMINISTRATORS_SID):
            with self.subTest(owner_class="not_current_user"):
                with self.assertRaises(target.PrivateFileRefused):
                    target._check_windows_acl(owner, USER, acl((0, 0, USER)))

    def test_broad_allow_refused_even_inherited_or_inherit_only(self):
        for flags in (0, 0x10, 0x08):
            with self.subTest(flags=flags):
                with self.assertRaises(target.PrivateFileRefused):
                    target._check_windows_acl(USER, USER, acl((0, flags, EVERYONE)))

    def test_other_user_allow_refused(self):
        with self.assertRaises(target.PrivateFileRefused):
            target._check_windows_acl(USER, USER, acl((0, 0, OTHER)))

    def test_unsupported_ace_forms_fail_closed(self):
        for kind in (2, 5, 6, 9, 10, 255):
            with self.subTest(kind=kind):
                with self.assertRaises(target.PrivateFileRefused):
                    target._check_windows_acl(USER, USER, acl((kind, 0, USER)))

    def test_malformed_acl_or_sid_fails_closed(self):
        valid = acl((0, 0, USER))
        mutations = (b"", valid[:7], valid[:-1], b"\x01" + valid[1:],
                     valid[:4] + b"\xff\xff" + valid[6:],
                     valid[:10] + b"\x04\x00" + valid[12:],
                     valid[:16] + b"\x01\xff" + valid[18:])
        for data in mutations:
            with self.subTest(length=len(data)):
                with self.assertRaises(target.PrivateFileRefused):
                    target._check_windows_acl(USER, USER, data)

    def test_failure_is_content_free(self):
        with patch.object(target, "_read_windows", side_effect=OSError("synthetic private sentinel")), \
                patch.object(target, "_read_posix", side_effect=OSError("synthetic private sentinel")):
            with self.assertRaises(target.PrivateFileRefused) as caught:
                target.read_private_handoff_file(Path("synthetic"))
        self.assertEqual(str(caught.exception), "private_file_refused")

    def test_ceiling_cannot_be_disabled(self):
        for ceiling in (0, -1, 32769, True, None):
            with self.subTest(ceiling=ceiling):
                with self.assertRaises(target.PrivateFileRefused):
                    target.read_private_handoff_file(Path("synthetic"), ceiling)

    def test_windows_device_unc_stream_and_ambiguous_paths_refused_before_open(self):
        class FixedDisk:
            def drive_type(self, _):
                return 3
        for path in (r"\\host\share\handoff", r"\\?\C:\handoff", r"C:\NUL",
                     r"C:\dir\COM1.txt", r"C:\handoff:stream", r"C:\handoff.",
                     r"C:\dir\..\handoff", r"C:handoff", r"C:\handoff "):
            with self.subTest(path_class="invalid_local_path"):
                with self.assertRaises(target.PrivateFileRefused):
                    target._windows_path(PureWindowsPath(path), FixedDisk())


class LocalFiles(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="enmori-private-fixture-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.path = self.directory / "synthetic.json"

    def write(self, data=b"synthetic private fixture"):
        self.path.write_bytes(data)
        if os.name == "nt":
            self.secure(self.path)
        else:
            self.path.chmod(0o600)
        return data


@unittest.skipUnless(os.name == "posix", "POSIX file gate requires POSIX")
class PosixFilesTests(LocalFiles):
    def test_private_file_and_exact_size_boundary(self):
        data = self.write(b"x" * 32768)
        self.assertEqual(target.read_private_handoff_file(self.path), data)

    def test_public_empty_oversize_and_directory_refused(self):
        self.write()
        self.path.chmod(0o644)
        with self.assertRaises(target.PrivateFileRefused):
            target.read_private_handoff_file(self.path)
        for data in (b"", b"x" * 32769):
            self.write(data)
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)
        with self.assertRaises(target.PrivateFileRefused):
            target.read_private_handoff_file(self.directory)

    def test_symlink_refused(self):
        data = self.write()
        link = self.directory / "link"
        link.symlink_to(self.path)
        with self.assertRaises(target.PrivateFileRefused):
            target.read_private_handoff_file(link)
        self.assertEqual(self.path.read_bytes(), data)

    def test_replacement_between_lstat_and_open_refused(self):
        self.write()
        replacement = self.directory / "replacement"
        replacement.write_bytes(b"other synthetic fixture")
        replacement.chmod(0o600)
        original_open = os.open

        def replace_then_open(path, flags):
            os.replace(replacement, path)
            return original_open(path, flags)

        with patch.object(target.os, "open", side_effect=replace_then_open):
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)

    def test_owner_mismatch_refused(self):
        self.write()
        with patch.object(target.os, "getuid", return_value=os.getuid() + 1):
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)


@unittest.skipUnless(os.name == "nt", "native Windows ACL fixture requires Windows")
class WindowsFilesTests(LocalFiles):
    def setUp(self):
        super().setUp()
        self.api = target._WindowsApi()
        sid = self.api.current_user()
        authority = int.from_bytes(sid[2:8], "big")
        values = struct.unpack("<" + "I" * sid[1], sid[8:])
        self.user = "S-1-" + str(authority) + "".join("-" + str(value) for value in values)
        self.private_dacl = f"D:P(A;;FA;;;{self.user})(A;;FA;;;SY)(A;;FA;;;BA)"
        # Only synthetic temporary files are ever given permissive test ACLs.
        self.addCleanup(self.restore)

    def set_dacl(self, path, sddl):
        convert = self.api.security.ConvertStringSecurityDescriptorToSecurityDescriptorW
        convert.argtypes = [wintypes.LPCWSTR, wintypes.DWORD,
                            ctypes.POINTER(ctypes.c_void_p), ctypes.POINTER(wintypes.DWORD)]
        convert.restype = wintypes.BOOL
        apply = self.api.security.SetFileSecurityW
        apply.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_void_p]
        apply.restype = wintypes.BOOL
        descriptor = ctypes.c_void_p()
        self.assertTrue(convert(sddl, 1, ctypes.byref(descriptor), None))
        try:
            self.assertTrue(apply(str(path), 0x80000004, descriptor))  # protected DACL
        finally:
            self.api.free(descriptor)

    def secure(self, path):
        self.set_dacl(path, self.private_dacl)

    def restore(self):
        if self.path.exists():
            self.secure(self.path)

    def test_real_handle_acl_and_exact_size_boundary(self):
        data = self.write(b"x" * 32768)
        self.assertEqual(target.read_private_handoff_file(self.path), data)

    def test_current_user_only_acl_is_sufficient(self):
        data = self.write()
        self.set_dacl(self.path, f"D:P(A;;FA;;;{self.user})")
        self.assertEqual(target.read_private_handoff_file(self.path), data)

    def test_real_broad_allow_and_inherited_broad_allow_refused(self):
        self.write()
        for principal, flags in (("WD", ""), ("AU", ""), ("BU", ""), ("WD", "ID")):
            with self.subTest(allow_class=principal, inherited=bool(flags)):
                self.set_dacl(self.path, self.private_dacl + f"(A;{flags};FR;;;{principal})")
                with self.assertRaises(target.PrivateFileRefused):
                    target.read_private_handoff_file(self.path)

    def test_real_null_dacl_refused(self):
        self.write()
        self.set_dacl(self.path, "D:NO_ACCESS_CONTROL")
        with self.assertRaises(target.PrivateFileRefused):
            target.read_private_handoff_file(self.path)

    def test_actual_owner_compared_with_current_identity(self):
        self.write()
        with patch.object(target._WindowsApi, "current_user", return_value=OTHER):
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)

    def test_empty_oversize_and_directory_refused(self):
        for data in (b"", b"x" * 32769):
            self.write(data)
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)
        with self.assertRaises(target.PrivateFileRefused):
            target.read_private_handoff_file(self.directory)

    def test_existing_writer_causes_refusal(self):
        self.write()
        with self.path.open("r+b"):
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)

    def test_write_and_replacement_blocked_while_read_handle_open(self):
        data = self.write()
        replacement = self.directory / "replacement"
        replacement.write_bytes(b"replacement synthetic fixture")
        original = target._WindowsApi.read

        def attempt_writes(api, handle, maximum):
            with self.assertRaises(PermissionError):
                self.path.write_bytes(b"changed synthetic fixture")
            with self.assertRaises(PermissionError):
                os.replace(replacement, self.path)
            return original(api, handle, maximum)

        with patch.object(target._WindowsApi, "read", new=attempt_writes):
            self.assertEqual(target.read_private_handoff_file(self.path), data)
        # Handles are closed after success; no persistent lock is left behind.
        os.replace(replacement, self.path)

    def test_acl_changed_during_read_refused_and_handle_released(self):
        self.write()
        original = target._WindowsApi.read

        def change_acl(api, handle, maximum):
            self.set_dacl(self.path, self.private_dacl + "(A;;FR;;;WD)")
            return original(api, handle, maximum)

        with patch.object(target._WindowsApi, "read", new=change_acl):
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)
        self.secure(self.path)
        self.path.unlink()

    def test_file_reparse_attribute_refused_before_data_read(self):
        self.write()
        real_init = target._WindowsApi.__init__

        def altered_init(api):
            real_init(api)
            original_info = api.file_info

            def reparse(handle, info):
                result = original_info(handle, info)
                # Directories stay real; mark only the final regular file.
                if not info._obj.attributes & 0x10:
                    info._obj.attributes |= 0x400
                return result
            api.file_info = reparse

        with patch.object(target._WindowsApi, "__init__", new=altered_init), \
                patch.object(target._WindowsApi, "read", side_effect=AssertionError("must not read")):
            with self.assertRaises(target.PrivateFileRefused):
                target.read_private_handoff_file(self.path)

    def test_real_directory_junction_refused_without_following_target(self):
        data = self.write()
        link = self.directory / "synthetic-junction"
        link.mkdir()
        # Use a temporary mount-point reparse fixture without changing OS
        # privileges or Developer Mode. Remove only the junction itself.
        self.addCleanup(link.rmdir)
        substitute = ("\\??\\" + str(self.directory)).encode("utf-16-le")
        printable = str(self.directory).encode("utf-16-le")
        names = substitute + b"\0\0" + printable + b"\0\0"
        reparse = struct.pack("<IHHHHHH", 0xa0000003, 8 + len(names), 0,
                              0, len(substitute), len(substitute) + 2, len(printable)) + names
        control = self.api.kernel.DeviceIoControl
        control.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD,
                            ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD),
                            ctypes.c_void_p]
        control.restype = wintypes.BOOL
        handle = self.api.create_file(str(link), 0x40000000, 0, None, 3, 0x02200000, None)
        self.assertNotEqual(handle, ctypes.c_void_p(-1).value)
        try:
            count = wintypes.DWORD()
            buffer = ctypes.create_string_buffer(reparse)
            self.assertTrue(control(handle, 0x000900a4, buffer, len(reparse), None, 0,
                                    ctypes.byref(count), None))
        finally:
            self.api.close(handle)
        self.assertTrue(link.is_junction())
        with self.assertRaises(target.PrivateFileRefused):
            target.read_private_handoff_file(link / self.path.name)
        with self.assertRaises(target.PrivateFileRefused):
            target.read_private_handoff_file(link)
        self.assertEqual(self.path.read_bytes(), data)

    def test_nine_field_handoff_unchanged_and_broad_acl_prevents_commands(self):
        value = {"schemaVersion": 1, "projectId": "demo-enmori-rmvp01a-r10",
                 "email": "synthetic-owner@example.invalid", "password": "SyntheticPrivatePassword!",
                 "baseUri": "https://127.0.0.1:42425/", "certificateBase64": base64.b64encode(
                     b"-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n").decode(),
                 "authEmulatorHost": "127.0.0.1:9099", "lifetime": "until-explicit-stop-in-this-owned-process",
                 "syntheticOwnerOnly": True}
        data = self.write(json.dumps(value).encode())
        self.assertEqual(handoff.handoff(self.path), (data, 42425))
        self.set_dacl(self.path, self.private_dacl + "(A;;FR;;;WD)")
        apk = self.directory / "synthetic.apk"
        apk.write_bytes(b"synthetic APK")
        with patch.object(handoff, "run", side_effect=AssertionError("must not invoke command")) as runner:
            report = handoff.transfer(apk, self.path, "USBTEST00001", adb=str(self.directory / "adb.exe"),
                                      aapt=str(self.directory / "aapt.exe"), runner=runner)
        self.assertEqual(report["category"], "preflight_refused")
        runner.assert_not_called()
        public = json.dumps(report)
        for name in ("email", "password", "baseUri", "certificateBase64"):
            self.assertNotIn(value[name], public)


if __name__ == "__main__":
    unittest.main()
