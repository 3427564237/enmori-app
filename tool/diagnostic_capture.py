"""Privileged, fixed-command Q14 store. No network, model or product data access.

Installed root-owned copy only; ordinary operator receives three exact sudo
commands, never this interpreter, source directory, config or raw store.
"""
import contextlib
import datetime as dt
import errno
import json
import math
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import time
import uuid

if sys.platform == "linux":
    import fcntl

CONFIG = "/etc/enmori-diagnostic-capture/config.json"
DAY = 86_400_000
SWEEP_MAX_AGE = 65 * 60_000  # Hourly timer, 5 minute failure-detection allowance.
MAX_RECORD = 4096
MAX_FILES = 100_000  # Resource ceiling; reaching it closes admission, never evicts.
LOCK_WAIT_SECONDS = 0.2
CLEANUP_LOCK_WAIT_SECONDS = 5.0
LOCK_RETRY_SECONDS = 0.01
FAILURES = {"CAPTURE_UNAVAILABLE", "CAPTURE_HOST_RESTARTED", "CAPTURE_RUNNER_STALE", "CAPTURE_DEADLINE_MISSED"}
FIELDS = {"loggedAt", "requestId", "routeTemplate", "method", "httpStatus", "latencyMs",
          "errorCategory", "dependencyStage", "dependencyStatus", "durationMs"}
ROUTES = {
    "/v1/me/ai/operations": "POST",
    "/v1/me/ai/operations/:operationId/execute": "POST",
    "/v1/me/ai/operations/:operationId/cancel": "POST",
    "/v1/me/conversations/:conversationId/operations/:operationId": "GET",
    "/v1/me/conversations/:conversationId/messages": "GET",
    "/v1/me/conversations/:conversationId": "DELETE",
}
STAGES = {"preflight", "preflight_version", "preflight_tags", "preflight_ps", "startup_compile",
          "before_generation_compile", "adapter_compile", "generate_dispatch", "generate_response",
          "generate_done", "output_validation"}
STATUSES = {"started", "passed", "request_failed", "http_failed", "envelope_invalid", "version_mismatch",
            "model_match_failed", "manifest_mismatch", "family_size_mismatch", "context_mismatch",
            "budget_or_authority_lost", "already_invoked", "compile_failed", "compiled_input_invalid",
            "dispatch_attempted", "response_received", "done_confirmed", "termination_unconfirmed", "output_invalid"}
ERRORS = {"REQUEST_INVALID": 400, "AUTH_REQUIRED": 401, "AUTH_FORBIDDEN": 403, "ONBOARDING_REQUIRED": 409,
          "AI_CONTEXT_NOT_PERMITTED": 403, "CONVERSATION_UNAVAILABLE": 404, "AI_OPERATION_UNAVAILABLE": 404,
          "AI_OPERATION_CONFLICT": 409, "REQUEST_TOO_LARGE": 413, "AI_INPUT_INVALID": 422, "AI_BUSY": 429,
          "AI_UNAVAILABLE": 503, "AI_REPLY_REJECTED": 502, "AI_AUTHORITY_CHANGED": 409, "AI_OUTCOME_UNRESOLVED": 503}
UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"


class CaptureUnavailable(Exception):
    pass


def require(value):
    if not value:
        raise CaptureUnavailable("CAPTURE_UNAVAILABLE")


def decode(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result)
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=lambda _: require(False))


def validate_record(row, now):
    require(type(row) is dict and row.keys() <= FIELDS)
    stamp = row.get("loggedAt")
    require(type(stamp) is str and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", stamp))
    delta = dt.datetime.fromisoformat(stamp.replace("Z", "+00:00")) - dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)
    logged = delta.days * DAY + delta.seconds * 1000 + delta.microseconds // 1000
    require(0 <= logged <= now)
    request = sum(k in row for k in ("requestId", "routeTemplate", "method"))
    dependency = sum(k in row for k in ("dependencyStage", "dependencyStatus", "durationMs"))
    require(request in (0, 3) and dependency in (0, 3) and (request or dependency))
    number = lambda value: type(value) in (int, float) and math.isfinite(value) and value >= 0
    if request:
        require(type(row["requestId"]) is str and re.fullmatch(UUID, row["requestId"]))
        require(type(row["routeTemplate"]) is str and ROUTES.get(row["routeTemplate"]) == row["method"])
    if dependency:
        require(row["dependencyStage"] in STAGES and row["dependencyStatus"] in STATUSES and number(row["durationMs"]))
    if "httpStatus" in row:
        require(type(row["httpStatus"]) is int and 100 <= row["httpStatus"] <= 599)
    if "latencyMs" in row:
        require(request and "httpStatus" in row and number(row["latencyMs"]))
    if "errorCategory" in row:
        require(request and type(row["errorCategory"]) is str and row["errorCategory"] in ERRORS
                and ERRORS[row["errorCategory"]] == row.get("httpStatus"))
    return logged


def private_stat(info, directory=False):
    require(info.st_uid == 0 and (stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)))
    require(stat.S_IMODE(info.st_mode) == (0o700 if directory else 0o600))
    if not directory:
        require(info.st_nlink == 1)


def open_directory(path):
    """Pin each root-owned non-writable ancestor by fd; never follow symlinks."""
    require(sys.platform == "linux" and type(path) is str and path.startswith("/")
            and path == os.path.normpath(path) and path != "/")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in path.split("/")[1:]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = child
            info = os.fstat(fd)
            require(info.st_uid == 0 and not info.st_mode & 0o022)
        return fd
    except BaseException:
        os.close(fd)
        raise


def read_at(fd, name, maximum=MAX_RECORD):
    handle = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
    try:
        before = os.fstat(handle)
        private_stat(before)
        require(before.st_size <= maximum)
        raw = os.read(handle, maximum + 1)
        after = os.fstat(handle)
        require(len(raw) <= maximum and (before.st_ino, before.st_size, before.st_mtime_ns) ==
                (after.st_ino, after.st_size, after.st_mtime_ns))
        return decode(raw)
    finally:
        os.close(handle)


def write_at(fd, name, value, create=False):
    raw = (json.dumps(value, separators=(",", ":"), allow_nan=False) + "\n").encode("ascii")
    require(len(raw) <= MAX_RECORD)
    pending = ".pending-" + str(uuid.uuid4())
    handle = os.open(pending, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
    try:
        require(os.write(handle, raw) == len(raw))
        os.fsync(handle)
    finally:
        os.close(handle)
    if create:
        # link+unlink provides no-replace publication. A crash leaving two
        # links is detected, never accepted or silently erased as healthy.
        os.link(pending, name, src_dir_fd=fd, dst_dir_fd=fd, follow_symlinks=False)
        os.unlink(pending, dir_fd=fd)
    else:
        os.replace(pending, name, src_dir_fd=fd, dst_dir_fd=fd)
    os.fsync(fd)


def load_config():
    with contextlib.ExitStack() as stack:
        fd = open_directory(os.path.dirname(CONFIG))
        stack.callback(os.close, fd)
        private_stat(os.fstat(fd), True)
        config = read_at(fd, "config.json")
    require(type(config) is dict and set(config) == {"schemaVersion", "store", "operatorUid"}
            and config["schemaVersion"] == 1 and type(config["operatorUid"]) is int and config["operatorUid"] > 0)
    return config


def authorize(command, config):
    require(os.geteuid() == 0 and command in {"append", "read", "health", "cleanup", "initialize"})
    # sudo supplies this identity; no caller flag or user-controlled UID body.
    sudo_uid = os.environ.get("SUDO_UID")
    if sudo_uid is not None:
        require(sudo_uid == str(config["operatorUid"]) and command in {"append", "read", "health"})
    else:
        require(os.getuid() == 0)  # Host root / system unit, not a product role.


def boot_started():
    # Private scheduler control timestamp, not a log field/device identifier.
    matches = re.findall(r"^btime (\d+)$", Path("/proc/stat").read_text(), re.M)
    require(len(matches) == 1)
    return int(matches[0])


def runner_healthy():
    # Observe the actual system manager, not a caller-supplied boolean/file.
    for arguments, expected in ((["is-active", "enmori-diagnostic-capture-cleanup.timer"], "active\n"),
                                (["show", "enmori-diagnostic-capture-cleanup.service", "--property=Result", "--value"], "success\n")):
        result = subprocess.run(["/usr/bin/systemctl", *arguments], stdin=subprocess.DEVNULL,
                                capture_output=True, text=True, timeout=0.5,
                                env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C"})
        require(result.returncode == 0 and result.stdout == expected and result.stderr == "")


def acquire_lock(handle, cleanup=False):
    # Retry only acquisition on the same pinned fd, never the operation body.
    # Fixed budgets leave the existing 2s/60s overall watchdogs unchanged.
    deadline = time.monotonic() + (CLEANUP_LOCK_WAIT_SECONDS if cleanup else LOCK_WAIT_SECONDS)
    while True:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return
        except OSError as error:
            if error.errno not in {errno.EAGAIN, errno.EACCES}:
                raise
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise
            time.sleep(min(LOCK_RETRY_SECONDS, remaining))
            # A late wakeup must not acquire and start work beyond the budget.
            if time.monotonic() >= deadline:
                raise


class Store:
    def __init__(self, path, now=lambda: time.time_ns() // 1_000_000, boot=boot_started, runner=runner_healthy):
        self.path, self.clock, self.boot, self.runner = path, now, boot, runner

    @contextlib.contextmanager
    def locked(self, cleanup=False):
        with contextlib.ExitStack() as stack:
            fd = open_directory(self.path)
            stack.callback(os.close, fd)
            private_stat(os.fstat(fd), True)
            lock = os.open("lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600, dir_fd=fd)
            stack.callback(os.close, lock)
            private_stat(os.fstat(lock))
            acquire_lock(lock, cleanup)
            yield fd

    def initialize(self):
        with self.locked() as fd:
            require(set(os.listdir(fd)) == {"lock"})
            write_at(fd, "state.json", {"schemaVersion": 1, "lastNow": self.clock(), "lastSweep": None,
                                         "bootStartedAt": self.boot(), "sweeping": False, "failed": False, "failures": []}, True)

    def run(self, command, row=None, emit=None):
        with self.locked(cleanup=command == "cleanup") as fd:
            state = read_at(fd, "state.json")
            require(type(state) is dict and set(state) == {"schemaVersion", "lastNow", "lastSweep", "bootStartedAt", "sweeping", "failed", "failures"}
                    and state["schemaVersion"] == 1 and type(state["failed"]) is bool
                    and type(state["lastNow"]) is int and state["lastNow"] >= 0
                    and type(state["bootStartedAt"]) is int and state["bootStartedAt"] >= 0
                    and type(state["sweeping"]) is bool
                    and type(state["failures"]) is list and len(state["failures"]) <= len(FAILURES)
                    and all(type(reason) is str and reason in FAILURES for reason in state["failures"])
                    and len(set(state["failures"])) == len(state["failures"])
                    and state["failed"] == bool(state["failures"])
                    and (state["lastSweep"] is None or type(state["lastSweep"]) is int))
            def mark(reason):
                if reason not in state["failures"]:
                    state["failures"].append(reason)
                state["failed"] = True
            try:
                now = self.clock()
                require(type(now) is int and now >= state["lastNow"])
                state["lastNow"] = now
                if state["sweeping"]:
                    mark("CAPTURE_UNAVAILABLE")  # Previous cleanup did not acknowledge completion.
                if self.boot() != state["bootStartedAt"]:
                    mark("CAPTURE_HOST_RESTARTED")  # Catch-up never conceals host downtime.
                if state["lastSweep"] is not None:
                    require(0 <= state["lastSweep"] <= now)
                    if now - state["lastSweep"] > SWEEP_MAX_AGE:
                        mark("CAPTURE_RUNNER_STALE")
                if command == "cleanup":
                    state["sweeping"] = True
                    write_at(fd, "state.json", state)  # Durable intent before scan/deletion.
                else:
                    self.runner()  # Actual timer inactive/unit failure also closes admission.
                names = os.listdir(fd)
                require(len(names) <= MAX_FILES + 2)
                records = []
                for name in names:
                    if name in {"lock", "state.json"}:
                        continue
                    require(re.fullmatch(UUID + r"\.json", name))
                    record = read_at(fd, name)
                    logged = validate_record(record, now)
                    if now - logged >= 31 * DAY:
                        mark("CAPTURE_DEADLINE_MISSED")
                    records.append((name, record, logged))
                if command == "cleanup":
                    for name, _, logged in records:
                        if now - logged >= 30 * DAY:
                            # Directory is root-only, fd pinned, all helpers
                            # serialized. Recheck ownership immediately before unlink.
                            private_stat(os.stat(name, dir_fd=fd, follow_symlinks=False))
                            os.unlink(name, dir_fd=fd)
                            try:
                                os.stat(name, dir_fd=fd, follow_symlinks=False)
                            except FileNotFoundError:
                                pass
                            else:
                                require(False)
                    os.fsync(fd)
                    state["lastSweep"] = now
                    state["sweeping"] = False
                else:
                    require(state["lastSweep"] is not None)
                    if state["failed"]:
                        raise CaptureUnavailable(",".join(state["failures"]))
                    if command == "append":
                        logged = validate_record(row, now)
                        require(now - logged < 30 * DAY and len(records) < MAX_FILES)
                        write_at(fd, str(uuid.uuid4()) + ".json", row, True)
                    elif command == "read":
                        require(emit is not None)
                        for _, record, logged in sorted(records, key=lambda item: item[2]):
                            current = self.clock()
                            require(current >= state["lastNow"])
                            state["lastNow"] = current
                            if current - logged < 30 * DAY:
                                emit(record)  # Recheck at emission, never renew loggedAt.
                    else:
                        require(command == "health")
                write_at(fd, "state.json", state)
                if state["failed"]:
                    raise CaptureUnavailable(",".join(state["failures"]))
            except BaseException:
                mark("CAPTURE_UNAVAILABLE")
                try:
                    write_at(fd, "state.json", state)
                except BaseException:
                    pass  # Missing/corrupt/stale health fails closed on next call.
                raise


def main():
    try:
        require(sys.platform == "linux" and len(sys.argv) == 2)
        command = sys.argv[1]
        signal.alarm(60 if command in {"read", "cleanup"} else 2)
        config = load_config()
        authorize(command, config)
        store = Store(config["store"])
        if command == "initialize":
            store.initialize()
        else:
            row = None
            if command == "append":
                raw = sys.stdin.buffer.read(MAX_RECORD + 1)
                require(len(raw) <= MAX_RECORD)
                row = decode(raw)
            store.run(command, row, lambda record: print(json.dumps(record, separators=(",", ":")), flush=True))
        if command != "read":
            print("CAPTURE_OK")
        return 0
    except BaseException as error:
        # No path, user/UID, raw JSON, exception, traceback or content escapes.
        reason = str(error) if isinstance(error, CaptureUnavailable) and set(str(error).split(",")) <= FAILURES else "CAPTURE_UNAVAILABLE"
        print(reason, file=sys.stderr)
        return 1
    finally:
        if sys.platform == "linux":
            signal.alarm(0)


if __name__ == "__main__":
    sys.exit(main())
