"""Bounded, local private-file reads; no configuration contents in failures.

Windows uses handle security, not the POSIX-looking bits returned by stat.
Only ordinary allow/deny ACEs are supported; unfamiliar ACL forms fail closed.
"""
from __future__ import annotations

from contextlib import ExitStack, contextmanager
import ctypes
from ctypes import wintypes
import ntpath
import os
from pathlib import Path
import re
import stat
import struct


class PrivateFileRefused(Exception):
    """A content-free rejection, never a path or a native error message."""

    def __init__(self):
        super().__init__("private_file_refused")


def _require(condition):
    if not condition:
        raise PrivateFileRefused()


def _sid_length(data: bytes) -> int:
    _require(len(data) >= 8 and data[0] == 1 and data[1] <= 15)
    length = 8 + 4 * data[1]
    _require(len(data) >= length)
    return length


SYSTEM_SID = bytes.fromhex("010100000000000512000000")
ADMINISTRATORS_SID = bytes.fromhex("01020000000000052000000020020000")


def _check_windows_acl(owner: bytes, current_user: bytes, dacl: bytes | None):
    """Validate bounded ACL bytes obtained from the opened file's descriptor."""
    _require(_sid_length(owner) == len(owner)
             and _sid_length(current_user) == len(current_user)
             and owner == current_user and dacl is not None)
    _require(8 <= len(dacl) <= 65535)
    revision, reserved, size, count, reserved2 = struct.unpack_from("<BBHHH", dacl)
    _require(revision in (2, 4) and reserved == reserved2 == 0 and size == len(dacl))
    offset = 8
    for _ in range(count):
        _require(offset + 8 <= size)
        kind, flags, ace_size = struct.unpack_from("<BBH", dacl, offset)
        _require(kind in (0, 1) and not flags & ~0x1f
                 and ace_size >= 16 and ace_size % 4 == 0
                 and offset + ace_size <= size)
        sid = dacl[offset + 8:offset + ace_size]
        _require(_sid_length(sid) == len(sid))
        # Even an inherit-only or zero-mask broad allow is refused. Deny ACEs
        # grant nothing; unfamiliar object/callback ACEs are not interpreted.
        if kind == 0:
            _require(sid in (current_user, SYSTEM_SID, ADMINISTRATORS_SID))
        offset += ace_size
    _require(offset <= size)


def _posix_snapshot(info):
    _require(stat.S_ISREG(info.st_mode) and stat.S_IMODE(info.st_mode) == 0o600
             and info.st_uid == os.getuid())
    return (info.st_dev, info.st_ino, info.st_mode, info.st_uid, info.st_size,
            info.st_mtime_ns, info.st_ctime_ns)


def _read_posix(path: Path, maximum_bytes: int) -> bytes:
    before = _posix_snapshot(path.lstat())
    _require(0 < before[4] <= maximum_bytes)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        _require(_posix_snapshot(os.fstat(stream.fileno())) == before)
        data = stream.read(maximum_bytes + 1)
        _require(_posix_snapshot(os.fstat(stream.fileno())) == before
                 and _posix_snapshot(path.lstat()) == before
                 and len(data) == before[4])
    return data


class _FileInfo(ctypes.Structure):
    _fields_ = [("attributes", wintypes.DWORD), ("created", wintypes.FILETIME),
                ("accessed", wintypes.FILETIME), ("written", wintypes.FILETIME),
                ("volume", wintypes.DWORD), ("size_high", wintypes.DWORD),
                ("size_low", wintypes.DWORD), ("links", wintypes.DWORD),
                ("index_high", wintypes.DWORD), ("index_low", wintypes.DWORD)]


class _WindowsApi:
    def __init__(self):
        self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        self.security = ctypes.WinDLL("advapi32", use_last_error=True)
        pointer = ctypes.c_void_p
        out_pointer = ctypes.POINTER(pointer)

        def bind(library, name, result, *arguments):
            function = getattr(library, name)
            function.restype = result
            function.argtypes = arguments
            return function

        self.create_file = bind(self.kernel, "CreateFileW", wintypes.HANDLE,
                                wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                                pointer, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE)
        self.close = bind(self.kernel, "CloseHandle", wintypes.BOOL, wintypes.HANDLE)
        self.free = bind(self.kernel, "LocalFree", pointer, pointer)
        self.file_type = bind(self.kernel, "GetFileType", wintypes.DWORD, wintypes.HANDLE)
        self.drive_type = bind(self.kernel, "GetDriveTypeW", wintypes.UINT, wintypes.LPCWSTR)
        self.file_info = bind(self.kernel, "GetFileInformationByHandle", wintypes.BOOL,
                              wintypes.HANDLE, ctypes.POINTER(_FileInfo))
        self.file_info_ex = bind(self.kernel, "GetFileInformationByHandleEx", wintypes.BOOL,
                                 wintypes.HANDLE, ctypes.c_int, pointer, wintypes.DWORD)
        self.read_file = bind(self.kernel, "ReadFile", wintypes.BOOL, wintypes.HANDLE,
                              pointer, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), pointer)
        self.process = bind(self.kernel, "GetCurrentProcess", wintypes.HANDLE)
        self.open_token = bind(self.security, "OpenProcessToken", wintypes.BOOL,
                               wintypes.HANDLE, wintypes.DWORD, out_pointer)
        self.token_info = bind(self.security, "GetTokenInformation", wintypes.BOOL,
                               wintypes.HANDLE, ctypes.c_int, pointer, wintypes.DWORD,
                               ctypes.POINTER(wintypes.DWORD))
        self.security_info = bind(self.security, "GetSecurityInfo", wintypes.DWORD,
                                  wintypes.HANDLE, ctypes.c_int, wintypes.DWORD,
                                  out_pointer, out_pointer, out_pointer, out_pointer, out_pointer)
        self.get_dacl = bind(self.security, "GetSecurityDescriptorDacl", wintypes.BOOL,
                             pointer, ctypes.POINTER(wintypes.BOOL), out_pointer,
                             ctypes.POINTER(wintypes.BOOL))
        self.valid_acl = bind(self.security, "IsValidAcl", wintypes.BOOL, pointer)
        self.valid_sid = bind(self.security, "IsValidSid", wintypes.BOOL, pointer)
        self.sid_length = bind(self.security, "GetLengthSid", wintypes.DWORD, pointer)

    def sid(self, pointer):
        _require(pointer and self.valid_sid(pointer))
        length = self.sid_length(pointer)
        _require(8 <= length <= 68)
        return ctypes.string_at(pointer, length)

    def current_user(self):
        token = ctypes.c_void_p()
        _require(self.open_token(self.process(), 0x0008, ctypes.byref(token)))  # TOKEN_QUERY
        try:
            needed = wintypes.DWORD()
            self.token_info(token, 1, None, 0, ctypes.byref(needed))  # TokenUser
            _require(0 < needed.value <= 65536)
            buffer = ctypes.create_string_buffer(needed.value)
            _require(self.token_info(token, 1, buffer, len(buffer), ctypes.byref(needed)))
            return self.sid(ctypes.c_void_p.from_buffer(buffer).value)
        finally:
            self.close(token)

    @contextmanager
    def opened(self, path, *, directory=False):
        # Final-component links are opened themselves, then refused. Ancestors
        # are separately held and checked to reject junction traversal too.
        handle = self.create_file(str(path), 0x80 if directory else 0x80000000,
                                  3 if directory else 1, None, 3,
                                  0x00200000 | (0x02000000 if directory else 0), None)
        _require(handle != ctypes.c_void_p(-1).value and handle is not None)
        try:
            yield handle
        finally:
            self.close(handle)

    def snapshot(self, handle, *, directory=False):
        _require(self.file_type(handle) == 1)  # FILE_TYPE_DISK
        info = _FileInfo()
        _require(self.file_info(handle, ctypes.byref(info)))
        _require(not info.attributes & 0x400  # FILE_ATTRIBUTE_REPARSE_POINT
                 and bool(info.attributes & 0x10) == directory)
        identity = ctypes.create_string_buffer(24)  # FILE_ID_INFO, including 128-bit ID
        _require(self.file_info_ex(handle, 18, identity, len(identity)))  # FileIdInfo
        if directory:
            return identity.raw, info.attributes
        return (identity.raw, info.attributes,
                (info.size_high << 32) | info.size_low,
                info.written.dwHighDateTime, info.written.dwLowDateTime)

    def permissions(self, handle, current_user):
        owner, dacl, descriptor = ctypes.c_void_p(), ctypes.c_void_p(), ctypes.c_void_p()
        result = self.security_info(handle, 1, 0x5, ctypes.byref(owner), None,
                                    ctypes.byref(dacl), None, ctypes.byref(descriptor))
        try:
            _require(result == 0 and descriptor.value)
            present, defaulted = wintypes.BOOL(), wintypes.BOOL()
            _require(self.get_dacl(descriptor, ctypes.byref(present), ctypes.byref(dacl),
                                   ctypes.byref(defaulted)) and present.value and dacl.value)
            _require(self.valid_acl(dacl))
            size = struct.unpack_from("<H", ctypes.string_at(dacl, 8), 2)[0]
            _require(8 <= size <= 65535)
            acl = ctypes.string_at(dacl, size)
            sid = self.sid(owner)
            _check_windows_acl(sid, current_user, acl)
            return sid, acl
        finally:
            if descriptor.value:
                self.free(descriptor)

    def read(self, handle, maximum_bytes):
        buffer = ctypes.create_string_buffer(maximum_bytes + 1)
        count = wintypes.DWORD()
        _require(self.read_file(handle, buffer, len(buffer), ctypes.byref(count), None))
        return buffer.raw[:count.value]


def _windows_path(path: Path, api):
    value = str(path)
    drive, tail = ntpath.splitdrive(value)
    _require(re.fullmatch(r"[A-Za-z]:", drive) is not None and tail.startswith("\\")
             and not any(ord(char) < 32 for char in value))
    parts = tail[1:].split("\\")
    _require(all(part and part not in (".", "..") and not part.endswith((" ", "."))
                 and not re.search(r'[:/<>"|?*]', part)
                 and not re.fullmatch(r"(?:CON|PRN|AUX|NUL|COM[0-9¹²³]|LPT[0-9¹²³])(?:\..*)?", part, re.I)
                 for part in parts))
    _require(api.drive_type(drive + "\\") == 3)  # fixed local disk, never UNC/mapped SMB
    return Path(value)


def _read_windows(path: Path, maximum_bytes: int) -> bytes:
    api = _WindowsApi()
    path = _windows_path(path, api)
    user = api.current_user()
    with ExitStack() as stack:
        ancestors = []
        for parent in reversed(path.parents):
            handle = stack.enter_context(api.opened(parent, directory=True))
            ancestors.append((handle, api.snapshot(handle, directory=True)))
        handle = stack.enter_context(api.opened(path))
        before = api.snapshot(handle)
        _require(0 < before[2] <= maximum_bytes)
        permissions = api.permissions(handle, user)
        data = api.read(handle, maximum_bytes)
        _require(len(data) == before[2] and api.snapshot(handle) == before
                 and api.permissions(handle, user) == permissions)
        # File handles deny write/delete sharing. Verify the pathname still
        # identifies that same protected file before releasing any handles.
        with api.opened(path) as again:
            _require(api.snapshot(again) == before
                     and api.permissions(again, user) == permissions)
        for parent_handle, snapshot in ancestors:
            _require(api.snapshot(parent_handle, directory=True) == snapshot)
        return data


def read_private_handoff_file(path: Path, maximum_bytes: int = 32768) -> bytes:
    """Read a private regular file or raise only PrivateFileRefused.

    The size ceiling is fixed to the existing handoff limit. No chmod, ACL
    repair, networking, external command, or configuration parsing is done.
    """
    try:
        _require(type(maximum_bytes) is int and 0 < maximum_bytes <= 32768)
        reader = _read_windows if os.name == "nt" else _read_posix
        data = reader(Path(path), maximum_bytes)
        _require(0 < len(data) <= maximum_bytes)
        return data
    except (OSError, ValueError, TypeError, AttributeError):
        raise PrivateFileRefused() from None
