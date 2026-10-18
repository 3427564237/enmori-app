"""Synthetic only. Linux/root cases use a new owned /run test directory.
No installed config, sudo policy, services, model or product database touched.
"""
import contextlib
import datetime as dt
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import diagnostic_capture as c

NOW = 1_792_300_000_000


def row(at=NOW):
    return {"loggedAt": dt.datetime.fromtimestamp(at / 1000, dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "dependencyStage": "preflight_ps", "dependencyStatus": "passed", "durationMs": 1}


class Portable(unittest.TestCase):
    def test_exact_epoch_milliseconds(self):
        for value in (0, NOW, NOW + 999):
            self.assertEqual(c.validate_record(row(value), value), value)

    def test_allowlist(self):
        for field in ("uid", "prompt", "body", "ip", "path", "operationId", "stack", "device"):
            with self.subTest(field=field), self.assertRaises(c.CaptureUnavailable):
                c.validate_record({**row(), field: "private-canary"}, NOW)

    def test_invalid_time(self):
        for stamp in (row(NOW + 1)["loggedAt"], "invalid", "2026-10-18T00:00:00Z", 42):
            with self.subTest(stamp=stamp), self.assertRaises(Exception):
                c.validate_record({**row(), "loggedAt": stamp}, NOW)

    def test_shape_and_nonfinite_numbers(self):
        for change in ({"durationMs": True}, {"durationMs": float("nan")}, {"durationMs": -1},
                       {"dependencyStatus": "raw error"}, {"httpStatus": 99}, {"httpStatus": True},
                       {"latencyMs": 1}, {"requestId": "a business id"}, {"errorCategory": "AI_UNAVAILABLE"}):
            with self.subTest(change=change), self.assertRaises(Exception):
                c.validate_record({**row(), **change}, NOW)

    def test_fixed_route_and_status(self):
        record = {"loggedAt": row()["loggedAt"], "requestId": "11111111-1111-4111-8111-111111111111",
                  "routeTemplate": "/v1/me/ai/operations", "method": "POST", "httpStatus": 503,
                  "errorCategory": "AI_UNAVAILABLE", "latencyMs": 0}
        c.validate_record(record, NOW)
        for key, value in (("routeTemplate", "/v1/me/ai/operations/private-id"), ("method", "GET"), ("httpStatus", 500)):
            with self.subTest(key=key), self.assertRaises(Exception):
                c.validate_record({**record, key: value}, NOW)

    def test_duplicate_and_nan_json_rejected(self):
        for raw in ('{"a":1,"a":2}', '{"a":NaN}'):
            with self.assertRaises(c.CaptureUnavailable):
                c.decode(raw)

    def test_privileged_command_identity(self):
        config = {"operatorUid": 1001}
        with mock.patch.object(c.os, "geteuid", return_value=0, create=True), mock.patch.object(c.os, "getuid", return_value=0, create=True):
            with mock.patch.dict(os.environ, {"SUDO_UID": "1001"}):
                for command in ("append", "read", "health"):
                    c.authorize(command, config)
                for command in ("cleanup", "initialize", "shell", "read extra"):
                    with self.assertRaises(c.CaptureUnavailable):
                        c.authorize(command, config)
            with mock.patch.dict(os.environ, {"SUDO_UID": "1002"}):
                with self.assertRaises(c.CaptureUnavailable):
                    c.authorize("read", config)

    def test_fixed_constants_match_backend_source(self):
        # Prevent an unnoticed drift in the duplicated privileged boundary.
        root = Path(__file__).resolve().parent.parent
        import re
        diagnostics = (root / "backend/src/ai-runtime/infrastructure/controlled-ai-diagnostic.ts").read_text()
        for name, expected in (("diagnosticStages", c.STAGES), ("diagnosticStatuses", c.STATUSES)):
            array = re.search(r"const " + name + r" = \[(.*?)\] as const", diagnostics, re.S).group(1)
            self.assertEqual(set(re.findall(r'"([a-z_]+)"', array)), expected)
        transport = (root / "backend/src/ai-conversation/transport/register-routes.ts").read_text()
        block = transport.split("export const CONVERSATION_ERRORS:")[1].split("};")[0]
        self.assertEqual({k: int(v) for k, v in re.findall(r"([A-Z_]+): \[(\d+),", block)}, c.ERRORS)
        collector = (root / "backend/src/bootstrap/controlled-phone-diagnostics.ts").read_text()
        self.assertEqual(dict(re.findall(r'\["(/v1/[^\"]+)", "([A-Z]+)"\]', collector)), c.ROUTES)


@unittest.skipUnless(sys.platform == "linux" and hasattr(os, "geteuid") and os.geteuid() == 0, "requires isolated Linux root-owned files")
class LinuxStorage(unittest.TestCase):
    def setUp(self):
        self.base = Path(tempfile.mkdtemp(prefix="enmori-capture-test-", dir="/run"))
        self.now = NOW
        self.store = c.Store(str(self.base), lambda: self.now, runner=lambda: None)
        self.store.initialize()
        self.store.run("cleanup")

    def tearDown(self):
        # Only this test's newly allocated synthetic directory, never deployed store.
        self.assertEqual(self.base.parent, Path("/run"))
        self.assertTrue(self.base.name.startswith("enmori-capture-test-"))
        self.assertFalse(self.base.is_symlink())
        shutil.rmtree(self.base)

    def state(self):
        return json.loads((self.base / "state.json").read_text())

    def advance_with_fresh_runner(self, when):
        # Controlled clock fixture, not a claim of 30 actual days or a timer run.
        self.now = when
        value = self.state()
        value["lastSweep"] = when
        with self.store.locked() as fd:
            c.write_at(fd, "state.json", value)

    def records(self):
        return [p for p in self.base.glob("*.json") if p.name != "state.json"]

    def test_write_read_real_files_and_no_clock_renewal(self):
        self.store.run("append", row())
        first = self.records()[0]
        original = first.read_bytes()
        output = []
        self.store.run("read", emit=output.append)
        self.assertEqual(output, [row()])
        self.assertEqual(original, first.read_bytes())
        self.assertEqual(stat.S_IMODE(first.stat().st_mode), 0o600)
        # A copied file preserves the original timestamp and expires together.
        copy = self.base / "22222222-2222-4222-8222-222222222222.json"
        copy.write_bytes(original)
        copy.chmod(0o600)
        self.advance_with_fresh_runner(NOW + 30 * c.DAY - 1)
        output.clear()
        self.store.run("read", emit=output.append)
        self.assertEqual(output, [row(), row()])
        self.now += 1
        output.clear()
        self.store.run("read", emit=output.append)
        self.assertEqual(output, [])
        self.assertEqual(len(self.records()), 2)
        self.store.run("cleanup")
        self.assertEqual(self.records(), [])

    def test_day31_deletes_owned_file_but_latches_missed_deadline(self):
        self.store.run("append", row())
        self.advance_with_fresh_runner(NOW + 31 * c.DAY)
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("cleanup")
        self.assertEqual(self.records(), [])
        self.assertTrue(self.state()["failed"])
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("health")

    def test_stale_runner_not_rehabilitated_by_catchup(self):
        self.now += c.SWEEP_MAX_AGE + 1
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("health")
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("cleanup")
        self.assertTrue(self.state()["failed"])

    def test_clock_rollback_survives_process_reconstruction(self):
        self.now -= 1
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("health")
        self.now += 1
        again = c.Store(str(self.base), lambda: self.now, runner=lambda: None)
        with self.assertRaises(c.CaptureUnavailable):
            again.run("append", row())

    def test_reboot_even_before_hourly_deadline_remains_reported(self):
        again = c.Store(str(self.base), lambda: self.now, lambda: self.state()["bootStartedAt"] + 1, runner=lambda: None)
        with self.assertRaises(c.CaptureUnavailable):
            again.run("cleanup")
        self.assertTrue(self.state()["failed"])

    def test_raw_store_denied_to_real_unprivileged_process(self):
        self.store.run("append", row())
        def demote():
            os.setgroups([])
            os.setgid(65534)
            os.setuid(65534)
        result = subprocess.run([sys.executable, "-I", "-c", "import os,sys; os.listdir(sys.argv[1])", str(self.base)],
                                preexec_fn=demote, capture_output=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b"PermissionError", result.stderr)
        self.assertNotIn(b"preflight_ps", result.stdout)

    def test_symlink_wrong_owner_hardlink_rejected(self):
        for kind in ("symlink", "owner", "hardlink"):
            with self.subTest(kind=kind):
                sub = self.base / kind
                sub.mkdir(mode=0o700)
                store = c.Store(str(sub), lambda: self.now, runner=lambda: None)
                store.initialize()
                store.run("cleanup")
                store.run("append", row())
                file = next(p for p in sub.glob("*.json") if p.name != "state.json")
                if kind == "symlink":
                    file.unlink()
                    file.symlink_to(self.base / "state.json")
                elif kind == "owner":
                    os.chown(file, 65534, 65534)
                else:
                    os.link(file, self.base / "outside-link")
                with self.assertRaises(Exception):
                    store.run("read", emit=lambda _: self.fail("unsafe read"))
                self.assertTrue(json.loads((sub / "state.json").read_text())["failed"])

    def test_ancestor_and_store_symlinks_denied(self):
        link = self.base / "link"
        link.symlink_to(self.base, target_is_directory=True)
        with self.assertRaises(OSError):
            c.open_directory(str(link))
        writable = self.base / "writable"
        writable.mkdir(mode=0o777)
        writable.chmod(0o777)
        with self.assertRaises(c.CaptureUnavailable):
            c.open_directory(str(writable))

    def test_partial_write_is_unknown_and_latched(self):
        with mock.patch.object(c.os, "write", return_value=1):
            with self.assertRaises(c.CaptureUnavailable):
                self.store.run("append", row())
        self.assertTrue(any(p.name.startswith(".pending-") for p in self.base.iterdir()))
        with self.assertRaises(Exception):
            self.store.run("health")

    def test_unknown_delete_never_reports_success(self):
        self.store.run("append", row())
        self.advance_with_fresh_runner(NOW + 30 * c.DAY)
        with mock.patch.object(c.os, "unlink", side_effect=OSError("private failure")):
            with self.assertRaises(OSError):
                self.store.run("cleanup")
        self.assertEqual(len(self.records()), 1)
        self.assertTrue(self.state()["failed"])

    def test_concurrent_helper_refuses_before_mutation(self):
        with self.store.locked():
            script = ("import sys;sys.path.insert(0,sys.argv[1]);import diagnostic_capture as c;"
                      "c.Store(sys.argv[2]).run('append',{})")
            result = subprocess.run([sys.executable, "-I", "-c", script, str(Path(__file__).parent), str(self.base)],
                                    capture_output=True, timeout=5)
            self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.records(), [])
        self.store.run("health")

    def test_no_reinitialize_existing_store(self):
        self.store.run("append", row())
        with self.assertRaises(c.CaptureUnavailable):
            self.store.initialize()
        self.assertEqual(len(self.records()), 1)

    def test_interrupted_cleanup_intent_cannot_become_healthy_by_restart(self):
        with self.store.locked() as fd:
            state = self.state()
            state["sweeping"] = True
            c.write_at(fd, "state.json", state)
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("health")
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("cleanup")
        self.assertTrue(self.state()["failed"])

    def test_runner_failure_refuses_before_append_and_remains_failed(self):
        self.store.runner = lambda: c.require(False)
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("append", row())
        self.assertEqual(self.records(), [])
        self.store.runner = lambda: None
        with self.assertRaises(c.CaptureUnavailable):
            self.store.run("health")

    def test_entrypoint_error_is_sanitized(self):
        with mock.patch.object(c, "load_config", side_effect=OSError("private path/token")), \
                mock.patch.object(sys, "argv", ["helper", "health"]):
            import io
            output = io.StringIO()
            with contextlib.redirect_stderr(output):
                self.assertEqual(c.main(), 1)
            self.assertEqual(output.getvalue(), "CAPTURE_UNAVAILABLE\n")


if __name__ == "__main__":
    unittest.main()
