"""Synthetic Tailscale state and owned Linux files; no Tailscale runtime calls."""
import base64
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch

import prepare_tailscale_phone_route as target


def online():
    return {"BackendState": "Running", "Self": {"Online": True,
            "TailscaleIPs": ["fd7a:115c:a1e0::1234", "100.70.80.90"]},
            "Peer": {"not-authorization": {"Online": True, "AllowedIPs": ["0.0.0.0/0"]}}}


class StateTests(unittest.TestCase):
    def test_prefers_current_self_ipv4_and_accepts_self_ipv6_fallback(self):
        value = online()
        self.assertEqual(target.self_address(value), "100.70.80.90")
        value["Self"]["TailscaleIPs"].pop()
        self.assertEqual(target.self_address(value), "fd7a:115c:a1e0::1234")

    def test_only_running_online_self_is_usable(self):
        for state in ("NoState", "Starting", "Stopped", "NeedsLogin", "RUNNING", None):
            value = online()
            value["BackendState"] = state
            with self.subTest(state=state), self.assertRaises(target.Refused):
                target.self_address(value)
        for own in (None, [], {}, {"Online": 1}, {"Online": False}):
            value = online()
            value["Self"] = own
            with self.subTest(own=own), self.assertRaises(target.Refused):
                target.self_address(value)

    def test_rejects_dns_zone_ids_non_tailnet_addresses_and_bad_shapes(self):
        for addresses in ([], None, "100.70.80.90", [None], [123], ["device.ts.net"],
                          ["127.0.0.1"], ["8.8.8.8"], ["10.0.0.1"], ["100.63.255.255"],
                          ["100.128.0.1"], ["fd00::1"], ["::1"],
                          ["fd7a:115c:a1e0::1%eth0"], ["::ffff:100.70.80.90"]):
            value = online()
            value["Self"]["TailscaleIPs"] = addresses
            with self.subTest(addresses=addresses), self.assertRaises(target.Refused):
                target.self_address(value)

    def test_existing_https_443_is_accepted_without_modifying_any_entry(self):
        config = {"TCP": {"443": {"HTTPS": True}},
                  "Web": {"private-name:443": {"Handlers": {"/": {"Proxy": "http://127.0.0.1:3000"}}}},
                  "AllowFunnel": {"private-name:443": False},
                  "Foreground": {"other-owner": {"TCP": {"2222": {"TCPForward": "127.0.0.1:22"}}}}}
        before = copy.deepcopy(config)
        target.require_unused_private_ports(config, 42425)
        self.assertEqual(config, before)
        target.require_unused_private_ports({}, 42425)

    def test_desired_port_conflicts_are_refused_at_every_foreground_level(self):
        for port in ("42425", "9099"):
            for depth in range(3):
                config = {"TCP": {port: {"TCPForward": "127.0.0.1:" + port}}}
                for _ in range(depth):
                    config = {"Foreground": {"other-owner": config}}
                with self.subTest(port=port, depth=depth), self.assertRaisesRegex(target.Refused, "^serve_port_conflict$"):
                    target.require_unused_private_ports(config, 42425)

    def test_any_true_funnel_is_refused_even_on_unrelated_port(self):
        for depth in range(3):
            config = {"AllowFunnel": {"private-name:8443": True}}
            for _ in range(depth):
                config = {"Foreground": {"other-owner": config}}
            with self.subTest(depth=depth), self.assertRaisesRegex(target.Refused, "^funnel_enabled_refused$"):
                target.require_unused_private_ports(config, 42425)

    def test_malformed_or_uninterpreted_serve_state_fails_closed(self):
        for value in (None, [], {"TCP": []}, {"TCP": {"0": {}}},
                      {"TCP": {"0443": {}}}, {"TCP": {"65536": {}}},
                      {"TCP": {"443": None}}, {"AllowFunnel": {"private": "false"}},
                      {"AllowFunnel": None}, {"Foreground": []},
                      {"Foreground": {"id": None}}, {"Services": {"private": {}}}):
            with self.subTest(value=value), self.assertRaises(target.Refused):
                target.require_unused_private_ports(value, 42425)

    def test_backend_cannot_replace_443_or_overlap_auth(self):
        for port in (443, 9099, False, 0, 65536, "42425"):
            with self.subTest(port=port), self.assertRaisesRegex(target.Refused, "^backend_port_refused$"):
                target.require_unused_private_ports({}, port)


@unittest.skipUnless(sys.platform == "linux", "Actual owned POSIX file checks require Linux")
class LinuxPreparationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="enmori-private-route-fixture-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve()
        self.directory.chmod(0o700)
        self.session = self.directory / "session"
        self.session.mkdir(mode=0o700)
        self.output = self.directory / "route.json"
        self.executable = Path(sys.executable).resolve()
        certificate = b"-----BEGIN CERTIFICATE-----\nAQID\n-----END CERTIFICATE-----\n"
        value = {"schemaVersion": 1, "projectId": "demo-enmori-rmvp01a-r10",
                 "email": "synthetic-route@example.invalid", "password": "PrivatePasswordCanary!",
                 "baseUri": "https://127.0.0.1:42425/",
                 "certificateBase64": base64.b64encode(certificate).decode("ascii"),
                 "authEmulatorHost": "127.0.0.1:9099",
                 "lifetime": "until-explicit-stop-in-this-owned-process", "syntheticOwnerOnly": True}
        self.raw = (json.dumps(value, indent=2) + "\n").encode("ascii")
        self.handoff = self.session / "handoff.json"
        self.handoff.write_bytes(self.raw)
        self.handoff.chmod(0o600)
        self.state = online()
        self.serve = {"TCP": {"443": {"HTTPS": True}}}
        self.calls = []

    def runner(self, arguments):
        self.calls.append(arguments)
        expected = [str(self.executable), "status", "--json"]
        if arguments == expected:
            return json.dumps(self.state).encode("ascii")
        self.assertEqual(arguments, [str(self.executable), "serve", "status", "--json"])
        return json.dumps(self.serve).encode("ascii")

    def prepare(self, **kwargs):
        return target.prepare(self.session, self.executable, self.output,
                              **{"runner": self.runner, "check_host": lambda _: {"status": "Pass"}, **kwargs})

    def assert_blocked(self, report, category):
        self.assertEqual(report["status"], "Blocked")
        self.assertEqual(report["category"], category)
        self.assertFalse(report["privateRouteWritten"])
        self.assertFalse(self.output.exists())

    def test_exact_private_route_binds_original_bytes_and_only_reads_tailscale(self):
        before = copy.deepcopy(self.serve)
        report = self.prepare()
        self.assertEqual(report["status"], "Pass")
        self.assertEqual(report["scope"], "private-route-preparation-only")
        self.assertFalse(report["accessPolicyEstablished"])
        self.assertFalse(report["nativeServeStarted"])
        self.assertFalse(report["networkOrModelStarted"])
        self.assertEqual(json.loads(self.output.read_bytes()), {"schemaVersion": 1,
                         "tailnetHost": "100.70.80.90", "handoffSha256": hashlib.sha256(self.raw).hexdigest()})
        self.assertEqual(self.handoff.read_bytes(), self.raw)
        self.assertEqual(self.serve, before)
        self.assertEqual(self.calls, [[str(self.executable), "status", "--json"],
                                     [str(self.executable), "serve", "status", "--json"]])
        info = self.output.lstat()
        self.assertTrue(stat.S_ISREG(info.st_mode))
        self.assertEqual(stat.S_IMODE(info.st_mode), 0o600)
        self.assertEqual(info.st_uid, os.getuid())
        for canary in ("100.70.80.90", "PrivatePasswordCanary", str(self.directory), "synthetic-route"):
            self.assertNotIn(canary, json.dumps(report))

    def test_real_current_host_checker_is_used_without_window_arguments(self):
        status = {"scope": "isolated-phone-service", "phase": "running", "admission": "open",
                  "adapterState": "ready", "eventBrowse": {"pending": 0}, "modelAttempts": 0}
        status.update({key: True for key in ("accepting", "maintenanceHealthy", "retirementConfirmed",
                                             "httpsListening", "hostPreflightPassed", "tokenizerReadinessPassed")})
        status.update({key: False for key in ("quarantined", "operatorHold", "stopRequested")})
        status.update({key: 0 for key in ("modelPending", "compilerPending", "activeCalls", "nonTerminal")})
        path = self.session / "status.json"
        path.write_text(json.dumps(status), encoding="ascii")
        path.chmod(0o600)
        report = target.prepare(self.session, self.executable, self.output, runner=self.runner)
        self.assertEqual(report["status"], "Pass")
        self.assertTrue(report["currentHostReady"])

    def test_current_host_failure_creates_nothing(self):
        self.assert_blocked(self.prepare(check_host=lambda _: {"status": "Blocked"}), "current_host_not_ready")

    def test_changed_raw_handoff_after_checks_is_refused_even_when_json_equal(self):
        def changed(_):
            self.handoff.write_bytes(self.raw + b" ")
            return {"status": "Pass"}
        self.assert_blocked(self.prepare(check_host=changed), "private_handoff_changed")

    def test_handoff_permissions_and_symlink_are_refused(self):
        self.handoff.chmod(0o644)
        self.assert_blocked(self.prepare(), "preflight_refused")
        self.assertEqual(self.calls, [])
        self.handoff.chmod(0o600)
        original = self.session / "original.json"
        self.handoff.rename(original)
        self.handoff.symlink_to(original)
        self.assert_blocked(self.prepare(), "preflight_refused")

    def test_existing_output_is_never_overwritten(self):
        original = b"caller-owned-existing-output"
        self.output.write_bytes(original)
        self.output.chmod(0o600)
        identity = self.output.stat().st_ino
        report = self.prepare()
        self.assertEqual(report["category"], "output_already_exists")
        self.assertFalse(report["privateRouteWritten"])
        self.assertEqual(self.output.read_bytes(), original)
        self.assertEqual(self.output.stat().st_ino, identity)

    def test_output_symlink_does_not_replace_or_modify_its_target(self):
        self.output.symlink_to(self.handoff)
        report = self.prepare()
        self.assertEqual(report["category"], "output_already_exists")
        self.assertTrue(self.output.is_symlink())
        self.assertEqual(self.handoff.read_bytes(), self.raw)

    def test_output_parent_must_exist_and_be_exactly_owner_700(self):
        for mode in (0o755, 0o770, 0o777):
            with self.subTest(mode=mode):
                self.directory.chmod(mode)
                self.assert_blocked(self.prepare(), "private_output_parent_refused")
        self.directory.chmod(0o700)
        self.output = self.directory / "missing" / "route.json"
        self.assert_blocked(self.prepare(), "private_output_refused")
        self.assertFalse(self.output.parent.exists())

    def test_symlinked_output_parent_is_refused(self):
        link = self.directory / "linked"
        link.symlink_to(self.session, target_is_directory=True)
        self.output = link / "route.json"
        self.assert_blocked(self.prepare(), "private_output_parent_refused")
        self.assertFalse((self.session / "route.json").exists())

    def test_umask_cannot_make_successful_output_permission_ambiguous(self):
        previous = os.umask(0o777)
        try:
            report = self.prepare()
        finally:
            os.umask(previous)
        self.assertEqual(report["status"], "Pass")
        self.assertEqual(stat.S_IMODE(self.output.stat().st_mode), 0o600)

    def test_parent_identity_change_cleans_only_new_file_in_pinned_directory(self):
        moved = self.directory / "moved-session"
        self.output = self.session / "route.json"
        sync = os.fsync
        changed = False
        def replace_after_write(descriptor):
            nonlocal changed
            sync(descriptor)
            if not changed:
                changed = True
                self.session.rename(moved)
                self.session.mkdir(mode=0o700)
                (self.session / "route.json").write_bytes(b"replacement-must-survive")
        with patch.object(target.os, "fsync", side_effect=replace_after_write):
            report = self.prepare()
        self.assertEqual(report["category"], "private_output_parent_refused")
        self.assertFalse((moved / "route.json").exists())
        self.assertEqual(self.output.read_bytes(), b"replacement-must-survive")

    def test_write_failure_removes_only_its_new_file(self):
        with patch.object(target.os, "fsync", side_effect=OSError("PrivatePathCanary")):
            self.assert_blocked(self.prepare(), "private_output_refused")

    def test_conflict_or_funnel_refuses_without_output_or_native_commands(self):
        for config, category in (({"Foreground": {"id": {"TCP": {"9099": {}}}}}, "serve_port_conflict"),
                                 ({"AllowFunnel": {"private:443": True}}, "funnel_enabled_refused")):
            with self.subTest(category=category):
                self.calls = []
                self.serve = config
                self.assert_blocked(self.prepare(), category)
                self.assertEqual(len(self.calls), 2)

    def test_duplicate_json_and_native_error_are_sanitized(self):
        for response in (b'{"BackendState":"Running","BackendState":"PrivateCanary"}',
                         OSError("PrivatePathCanary endpoint token")):
            def bad_runner(_):
                if isinstance(response, Exception):
                    raise response
                return response
            report = self.prepare(runner=bad_runner)
            self.assert_blocked(report, "tailscale_status_unavailable")
            self.assertNotIn("Canary", json.dumps(report))


class CliTests(unittest.TestCase):
    def test_invalid_arguments_emit_only_safe_json(self):
        for arguments in ([], ["--private-path-canary", "PrivateValueCanary"],
                          ["--session", "PrivatePathCanary"]):
            with self.subTest(arguments=arguments), patch("sys.stdout", new_callable=io.StringIO) as output, \
                    patch("sys.stderr", new_callable=io.StringIO) as errors:
                code = target.main(arguments)
                self.assertEqual(code, 2)
                self.assertEqual(json.loads(output.getvalue())["category"], "arguments_refused")
                self.assertEqual(output.getvalue().count("\n"), 1)
                self.assertEqual(errors.getvalue(), "")
                self.assertNotIn("Canary", output.getvalue())

    def test_cli_passes_only_three_paths_and_never_claims_access_policy(self):
        report = target.base_report()
        report.update(status="Pass", category=None, privateRouteWritten=True)
        with patch.object(target, "prepare", return_value=report) as prepare, \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            code = target.main(["--session", "/private/session", "--tailscale", "/usr/bin/tailscale",
                                "--output", "/private/route.json"])
        self.assertEqual(code, 0)
        prepare.assert_called_once_with(Path("/private/session"), Path("/usr/bin/tailscale"), Path("/private/route.json"))
        value = json.loads(output.getvalue())
        self.assertFalse(value["accessPolicyEstablished"])
        self.assertNotIn("/private", output.getvalue())


if __name__ == "__main__":
    unittest.main()
