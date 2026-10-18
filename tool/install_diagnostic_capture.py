"""LI host operator: one-time, no-overwrite installation of the reviewed helper.

Read private installation choices from stdin, never shell-expanded paths. Does
not start Backend/Auth/Ollama, change network, or create an account. Existing
restricted operator identity and ordinary host sudo/systemd are prerequisites.
"""
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import stat
import subprocess
import sys
import types

capture = None


def require(value):
    if not value:
        raise ValueError("CAPTURE_INSTALL_UNAVAILABLE")


def load_verified_helper(source, expected):
    require(type(expected) is str and re.fullmatch(r"[0-9a-f]{64}", expected)
            and hashlib.sha256(source).hexdigest() == expected)
    module = types.ModuleType("verified_diagnostic_capture")
    exec(compile(source, "verified_diagnostic_capture", "exec"), module.__dict__)
    return module

WRAPPER = "/usr/local/sbin/enmori-diagnostic-capture"
LIB = "/usr/local/libexec/enmori-diagnostic-capture"
CONFIG_DIR = "/etc/enmori-diagnostic-capture"
SUDOERS = "/etc/sudoers.d/enmori-diagnostic-capture"
UNIT = "enmori-diagnostic-capture-cleanup"


def artifacts(operator, store):
    require(re.fullmatch(r"[a-z_][a-z0-9_-]{0,31}", operator))
    # Conservative root-private host location; no systemd specifier/shell escape.
    require(re.fullmatch(r"/var/lib/[A-Za-z0-9_-]+", store))
    wrapper = "#!/bin/sh\nexec /usr/bin/python3 -I -B " + LIB + '/diagnostic_capture.py "$@"\n'
    commands = ", ".join(WRAPPER + " " + command for command in ("append", "read", "health"))
    sudoers = ("Cmnd_Alias ENMORI_CAPTURE = " + commands + "\n"
               "Defaults!ENMORI_CAPTURE !log_input, !log_output, !use_pty\n"
               + operator + " ALL=(root) NOPASSWD: NOSETENV: ENMORI_CAPTURE\n")
    service = ("[Unit]\nDescription=ENMORI bounded metadata expiry cleanup\nAfter=time-sync.target\n\n"
               "[Service]\nType=oneshot\nUser=root\nGroup=root\nUMask=0077\n"
               "ExecStart=" + WRAPPER + " cleanup\nTimeoutStartSec=60\n"
               "StandardOutput=null\nStandardError=null\nNoNewPrivileges=true\nPrivateTmp=true\n"
               "ProtectHome=true\nProtectSystem=strict\nReadWritePaths=" + store + "\n"
               "RestrictAddressFamilies=AF_UNIX\n")
    timer = ("[Unit]\nDescription=ENMORI hourly metadata cleanup independent of login\n\n"
             "[Timer]\nOnBootSec=1min\nOnCalendar=hourly\nPersistent=true\nAccuracySec=1s\n"
             "Unit=" + UNIT + ".service\n\n[Install]\nWantedBy=timers.target\n")
    return wrapper, sudoers, service, timer


def exclusive_file(path, data, mode):
    parent = capture.open_directory(str(Path(path).parent))
    try:
        fd = os.open(Path(path).name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode, dir_fd=parent)
        try:
            require(os.write(fd, data) == len(data))
            os.fsync(fd)
        finally:
            os.close(fd)
        os.fsync(parent)
    finally:
        os.close(parent)


def run(command):
    result = subprocess.run(command, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, timeout=65, check=False,
                            env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C"})
    require(result.returncode == 0)


def main():
    global capture
    try:
        require(sys.platform == "linux" and os.getuid() == 0 and len(sys.argv) == 1)
        raw = sys.stdin.buffer.read(4097)
        require(len(raw) <= 4096)
        def unique(items):
            result = {}
            for key, value in items:
                require(key not in result)
                result[key] = value
            return result
        config = json.loads(raw, object_pairs_hook=unique)
        require(type(config) is dict and set(config) == {"operator", "store", "helperSha256"})
        wrapper, sudoers, service, timer = artifacts(config["operator"], config["store"])
        identity = pwd.getpwnam(config["operator"])
        require(identity.pw_uid > 0)
        source_path = Path(__file__).with_name("diagnostic_capture.py")
        for path in (Path(__file__), source_path):
            info = path.lstat()
            require(stat.S_ISREG(info.st_mode) and info.st_uid == 0 and info.st_nlink == 1
                    and stat.S_IMODE(info.st_mode) == 0o600)
        source = source_path.read_bytes()
        capture = load_verified_helper(source, config["helperSha256"])
        staged = capture.open_directory(str(source_path.absolute().parent))
        try:
            capture.private_stat(os.fstat(staged), True)
        finally:
            os.close(staged)
        # Check prerequisites before mutation. Never install packages or fall back.
        require(Path("/proc/1/comm").read_text().strip() == "systemd")
        for executable in ("/usr/bin/python3", "/usr/bin/sudo", "/usr/sbin/visudo", "/usr/bin/systemctl", "/usr/bin/systemd-analyze"):
            require(os.access(executable, os.X_OK))
        paths = [WRAPPER, LIB, CONFIG_DIR, SUDOERS, config["store"],
                 "/etc/systemd/system/" + UNIT + ".service", "/etc/systemd/system/" + UNIT + ".timer"]
        require(all(not os.path.lexists(path) for path in paths))
        for parent in {str(Path(path).parent) for path in paths}:
            fd = capture.open_directory(parent)
            os.close(fd)
        # Every target is new, never replace historical capture/configuration.
        for directory in (LIB, CONFIG_DIR, config["store"]):
            os.mkdir(directory, 0o700)
        exclusive_file(LIB + "/diagnostic_capture.py", source, 0o600)
        exclusive_file(WRAPPER, wrapper.encode(), 0o755)
        installed = {"schemaVersion": 1, "operatorUid": identity.pw_uid, "store": config["store"]}
        exclusive_file(CONFIG_DIR + "/config.json", json.dumps(installed).encode(), 0o600)
        # Validate sudo policy before placing it in the active include directory.
        staged = CONFIG_DIR + "/sudoers.staged"
        exclusive_file(staged, sudoers.encode(), 0o600)
        run(["/usr/sbin/visudo", "-cf", staged])
        exclusive_file(SUDOERS, sudoers.encode(), 0o440)
        for suffix, contents in (("service", service), ("timer", timer)):
            exclusive_file("/etc/systemd/system/" + UNIT + "." + suffix, contents.encode(), 0o600)
        run(["/usr/bin/systemd-analyze", "verify", "/etc/systemd/system/" + UNIT + ".service",
             "/etc/systemd/system/" + UNIT + ".timer"])
        run([WRAPPER, "initialize"])
        run(["/usr/bin/systemctl", "daemon-reload"])
        run(["/usr/bin/systemctl", "start", UNIT + ".service"])
        run(["/usr/bin/systemctl", "enable", "--now", UNIT + ".timer"])
        run([WRAPPER, "health"])
        print("CAPTURE_INSTALLED_HOST_ACCESS_AND_LOGOUT_VERIFICATION_STILL_REQUIRED")
        return 0
    except BaseException:
        # Retain partial installation for host-owner inspection; never force
        # overwrite, reset state, delete logs or claim rollback/cleanup success.
        print("CAPTURE_INSTALL_FAILED_PRESERVE_PARTIAL_STATE", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
