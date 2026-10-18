"""Focused entry checks: synthetic inputs and owned loopback servers only."""
import base64
import copy
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import ssl
import shutil
import subprocess
import tempfile
import threading
import time
import unittest
from unittest.mock import MagicMock, patch

import check_reusable_phone_entry as target


NOW = 1_800_000_000.0  # Arbitrary host-status fixture clock; not an appointment.
GUARD = {"error": {"code": "AUTH_REQUIRED"}}
SETTINGS = {"settings": {"checkInVisibility": "private",
                         "optionalProcessingConsent": "accepted", "revision": 0}}
TOKEN = "SyntheticPrivateTokenCanary"


class NoAppointmentCliTests(unittest.TestCase):
    def test_connection_check_needs_only_apk_and_private_handoff(self):
        with patch.object(target, "check_connection", return_value={"status": "Pass", "category": None}) as check, \
                patch.object(target, "procedure_sha256", return_value="1" * 64) as procedure, \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            code = target.main(["connection-check", "--apk", "candidate.apk", "--handoff", "private.json"])
        self.assertEqual(code, 0)
        check.assert_called_once_with(Path("candidate.apk"), Path("private.json"))
        self.assertEqual(procedure.call_count, 2)
        self.assertEqual(json.loads(output.getvalue())["status"], "Pass")

    def test_host_check_needs_only_current_session(self):
        with patch.object(target, "check_host", return_value={"status": "Pass", "category": None}) as check, \
                patch.object(target, "procedure_sha256", return_value="1" * 64) as procedure, \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            code = target.main(["host-check", "--session", "current-session"])
        self.assertEqual(code, 0)
        check.assert_called_once_with(Path("current-session"))
        self.assertEqual(procedure.call_count, 2)
        self.assertEqual(json.loads(output.getvalue())["status"], "Pass")


class ConnectionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="enmori-entry-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve()
        self.apk = self.directory / "candidate.apk"
        self.apk.write_bytes(b"synthetic exact test candidate, not an Android artifact")
        self.digest = hashlib.sha256(self.apk.read_bytes()).hexdigest()
        self.handoff = self.directory / "handoff.json"
        self.value = {"email": "private-test-owner@example.invalid",
                      "password": "PrivatePasswordCanary!",
                      "baseUri": "https://127.0.0.1:42425/",
                      "certificateBase64": base64.b64encode(b"test certificate").decode()}
        self.raw = json.dumps(self.value).encode()
        self.tick = NOW
        self.calls = []
        self.loads = 0
        self.responses = [(401, copy.deepcopy(GUARD)), (200, {"idToken": TOKEN}),
                          (200, copy.deepcopy(SETTINGS))]
        self.context = MagicMock()

    def load(self, path):
        self.assertEqual(path, self.handoff)
        self.loads += 1
        return self.raw, 42425

    def request(self, **arguments):
        self.calls.append(arguments)
        if not self.responses:
            self.fail("Unexpected request or automatic retry")
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    def check(self, *, load=None, request=None, mock_tls=True, bind_fixture=True):
        # Binding the temporary byte fixture exercises the hash gate without
        # loading or installing the real retained 94 MB candidate.
        with patch.object(target, "APK_SHA256", self.digest if bind_fixture else target.APK_SHA256):
            if mock_tls:
                with patch.object(target.ssl, "SSLContext", return_value=self.context):
                    return target.check_connection(self.apk, self.handoff,
                                                   request=request or self.request,
                                                   load=load or self.load)
            return target.check_connection(self.apk, self.handoff,
                                           request=request or self.request,
                                           load=load or self.load)

    def assert_safe(self, report):
        public = json.dumps(report)
        for secret in (*self.value.values(), TOKEN, str(self.directory)):
            self.assertNotIn(secret, public)

    def test_handoff_is_reloaded_before_each_request_and_final_acceptance_without_clock(self):
        loads_at_dispatch = []
        def request(**arguments):
            loads_at_dispatch.append(self.loads)
            return self.request(**arguments)
        with patch.object(target.time, "time", side_effect=AssertionError("Connection check has no appointment clock")):
            report = self.check(request=request)
        self.assertEqual(report["status"], "Pass")
        self.assertEqual(loads_at_dispatch, [2, 3, 4])
        self.assertEqual(self.loads, 5)
        self.assert_safe(report)

    def test_success_is_three_requests_with_original_credentials_and_no_retry(self):
        report = self.check()
        self.assertEqual(report["status"], "Pass")
        self.assertTrue(report["authenticatedSettingsRead"])
        self.assertEqual(report["phoneFlow"], "Not Run")
        self.assertEqual([(r["tls"], r["port"], r["method"], r["path"]) for r in self.calls],
                         [(True, 42425, "GET", target.SETTINGS_PATH),
                          (False, 9099, "POST", target.AUTH_PATH),
                          (True, 42425, "GET", target.SETTINGS_PATH)])
        self.assertEqual(self.calls[0]["headers"], {})
        self.assertEqual(self.calls[2]["headers"], {"Authorization": "Bearer " + TOKEN})
        self.assertEqual(json.loads(self.calls[1]["body"]), {
            "email": self.value["email"], "password": self.value["password"], "returnSecureToken": True})
        self.assertTrue(all(r["context"] is self.context and 0 < r["timeout"] <= 10 for r in self.calls))
        self.context.load_verify_locations.assert_called_once_with(cadata="test certificate")
        self.assert_safe(report)

    def test_original_apk_mismatch_refuses_before_private_read_or_network(self):
        report = self.check(bind_fixture=False)
        self.assertEqual(report["category"], "candidate_apk_mismatch")
        self.assertFalse(report["apkMatched"])
        self.assertEqual((self.loads, len(self.calls)), (0, 0))

    def test_certificate_parse_failure_prevents_all_requests(self):
        report = self.check(mock_tls=False)
        self.assertEqual(report["status"], "Blocked")
        self.assertEqual(len(self.calls), 0)
        self.assert_safe(report)

    def test_tls_trust_failure_prevents_auth_and_redacts_exception(self):
        self.responses = [ssl.SSLCertVerificationError(self.value["password"])]
        report = self.check()
        self.assertEqual(report["category"], "backend_tls_or_auth_guard_failed")
        self.assertEqual(len(self.calls), 1)
        self.assertFalse(report["authSignIn"])
        self.assert_safe(report)

    def test_backend_guard_must_be_unauthenticated_401_auth_required(self):
        for response in ((200, GUARD), (302, GUARD), (401, {}),
                         (401, {"error": "AUTH_REQUIRED"}),
                         (401, {"error": {"code": "OTHER"}})):
            with self.subTest(response=response):
                self.calls.clear()
                self.responses = [response]
                report = self.check()
                self.assertEqual(report["category"], "backend_tls_or_auth_guard_failed")
                self.assertEqual(len(self.calls), 1)
                self.assertFalse(report["authSignIn"])
                self.assert_safe(report)

    def test_auth_failure_or_unsafe_token_never_reaches_authenticated_backend(self):
        responses = [(401, {"error": {"message": self.value["password"]}}),
                     (500, {"idToken": TOKEN}), (200, {})]
        responses += [(200, {"idToken": token}) for token in
                      (None, True, 1, "", "with space", "comma,token", "token\n", "x" * 16385)]
        for response in responses:
            with self.subTest(status=response[0], token_type=type(response[1].get("idToken"))):
                self.calls.clear()
                self.responses = [(401, GUARD), response]
                report = self.check()
                self.assertEqual(report["category"], "auth_sign_in_failed")
                self.assertEqual(len(self.calls), 2)
                self.assertFalse(report["authenticatedSettingsRead"])
                self.assert_safe(report)

    def test_authenticated_backend_requires_exact_settings_shape(self):
        invalid = [{}, {**SETTINGS, "extra": True}, {"settings": []}]
        for key, value in (("revision", True), ("revision", -1),
                           ("revision", 9007199254740992), ("revision", 1.0),
                           ("checkInVisibility", "everyone"),
                           ("optionalProcessingConsent", "pending"), ("extra", TOKEN)):
            settings = copy.deepcopy(SETTINGS)
            settings["settings"][key] = value
            invalid.append(settings)
        responses = [(500, SETTINGS), (401, GUARD)] + [(200, value) for value in invalid]
        for response in responses:
            with self.subTest(response=response):
                self.calls.clear()
                self.responses = [(401, GUARD), (200, {"idToken": TOKEN}), response]
                report = self.check()
                self.assertEqual(report["category"], "authenticated_backend_read_failed")
                self.assertEqual(len(self.calls), 3)
                self.assertFalse(report["authenticatedSettingsRead"])
                self.assert_safe(report)

    def test_request_failure_at_each_stage_is_not_retried_or_disclosed(self):
        phases = ("backend_tls_or_auth_guard_failed", "auth_sign_in_failed",
                  "authenticated_backend_read_failed")
        original = copy.deepcopy(self.responses)
        for stage, phase in enumerate(phases):
            with self.subTest(stage=stage):
                self.calls.clear()
                self.responses = original[:stage] + [TimeoutError(self.value["password"])]
                with patch("sys.stdout", new_callable=io.StringIO) as output:
                    report = self.check()
                self.assertEqual(report["category"], phase)
                self.assertEqual(len(self.calls), stage + 1)
                self.assertEqual(output.getvalue(), "")
                self.assert_safe(report)

    def test_wall_clock_jump_at_each_stage_does_not_impose_operation_expiry(self):
        original = copy.deepcopy(self.responses)
        for stage in (1, 2, 3):
            with self.subTest(stage=stage):
                self.tick = NOW
                self.calls.clear()
                self.responses = copy.deepcopy(original)
                def jump(**arguments):
                    result = self.request(**arguments)
                    if len(self.calls) == stage:
                        self.tick = NOW + 365 * 24 * 3600
                    return result
                with patch.object(target.time, "time", side_effect=lambda: self.tick):
                    report = self.check(request=jump)
                self.assertEqual(report["status"], "Pass")
                self.assertEqual(len(self.calls), 3)
                self.assertTrue(report["authenticatedSettingsRead"])

    def test_private_reload_leaves_each_request_its_own_ten_second_timeout(self):
        def slow_load(path):
            result = self.load(path)
            self.tick += 300
            return result
        with patch.object(target.time, "time", side_effect=lambda: self.tick):
            report = self.check(load=slow_load)
        self.assertEqual(report["status"], "Pass")
        self.assertEqual([call["timeout"] for call in self.calls], [10.0, 10.0, 10.0])

    def test_changed_handoff_bytes_or_port_stop_each_boundary(self):
        original = copy.deepcopy(self.responses)
        for boundary in (2, 3, 4, 5):
            for changed_port in (False, True):
                with self.subTest(boundary=boundary, changed_port=changed_port):
                    self.calls.clear()
                    self.loads = 0
                    self.responses = copy.deepcopy(original)
                    def changed(path):
                        raw, port = self.load(path)
                        if self.loads == boundary:
                            return (raw, port + 1) if changed_port else (raw + b" ", port)
                        return raw, port
                    report = self.check(load=changed)
                    self.assertEqual(report["category"], "private_handoff_changed")
                    self.assertEqual(len(self.calls), boundary - 2)
                    self.assertFalse(report["authenticatedSettingsRead"])
                    self.assert_safe(report)


class HostTests(unittest.TestCase):
    def test_diagnostic_capture_health_is_optional_but_strict_when_present(self):
        for value in (True, False, 0, 1, None, "true"):
            with self.subTest(value=value):
                self.state["diagnosticCaptureHealthy"] = value
                self.write()
                report = self.check()
                if value is True:
                    self.assertEqual(report["status"], "Pass")
                else:
                    self.assertEqual(report["category"], "original_service_busy_or_held_do_not_reset")
                self.assertFalse(report["networkOrModelStarted"])

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="enmori-entry-host-test-")
        self.addCleanup(temporary.cleanup)
        self.session = Path(temporary.name).resolve()
        self.path = self.session / "status.json"
        self.tick = NOW
        self.state = dict(scope="isolated-phone-service", phase="running", admission="open",
                          adapterState="ready", accepting=True, maintenanceHealthy=True,
                          retirementConfirmed=True, httpsListening=True, hostPreflightPassed=True,
                          tokenizerReadinessPassed=True, quarantined=False, operatorHold=False,
                          stopRequested=False, modelPending=0, compilerPending=0, activeCalls=0,
                          nonTerminal=0, modelAttempts=2, eventControlFailed=False,
                          eventBrowse=dict(configured=False, enabled=False, pending=0))
        self.handoff = b'{"synthetic":"private-host-canary"}'
        self.reads = 0
        self.loads = 0
        self.sleeps = []
        self.write()

    def write(self):
        self.path.write_bytes(json.dumps(self.state).encode())
        os.utime(self.path, (self.tick, self.tick))

    def read(self, path):
        self.reads += 1
        self.assertEqual(path, self.path)
        return path.read_bytes()

    def load(self, path):
        self.loads += 1
        self.assertEqual(path, self.session / "handoff.json")
        return self.handoff, 42425

    def sleep(self, duration):
        self.sleeps.append(duration)
        self.tick += duration

    def check(self, *, read=None, load=None, sleep=None):
        return target.check_host(self.session, clock=lambda: self.tick,
                                 sleep=sleep or self.sleep, read=read or self.read, load=load or self.load)

    def test_configured_event_inflight_prevents_shared_quiet_snapshot(self):
        self.state["eventBrowse"] = dict(configured=True, enabled=True, pending=1)
        self.write()
        report = self.check()
        self.assertEqual(report["category"], "original_service_busy_or_held_do_not_reset")
        self.assertEqual(report["quietSamples"], 0)

    def test_two_quiet_samples_accept_unconfigured_event_and_do_not_start_network(self):
        report = self.check()
        self.assertEqual(report["status"], "Pass")
        self.assertEqual((report["quietSamples"], self.reads), (2, 2))
        self.assertEqual(self.sleeps, [0.7])
        self.assertFalse(report["networkOrModelStarted"])
        self.assertNotIn("private-host-canary", json.dumps(report))

    def test_second_read_must_remain_fresh_when_read_returns(self):
        self.tick = NOW + 4
        def slow_read(path):
            result = self.read(path)
            if self.reads == 2:
                self.tick = NOW + 10
            return result
        report = self.check(read=slow_read)
        self.assertEqual(report["category"], "host_status_stale")
        self.assertEqual(report["quietSamples"], 1)

    def test_status_age_boundaries_reject_stale_or_far_future_data(self):
        for age in (5, 6, -2.01):
            with self.subTest(age=age):
                self.tick = NOW
                self.reads = 0
                os.utime(self.path, (NOW - age, NOW - age))
                report = self.check()
                self.assertEqual(report["category"], "host_status_stale")
                self.assertEqual(self.reads, 0)

    def test_non_strict_booleans_and_pending_counts_refuse_snapshot(self):
        original = copy.deepcopy(self.state)
        boolean_keys = ("accepting", "maintenanceHealthy", "retirementConfirmed", "httpsListening",
                        "hostPreflightPassed", "tokenizerReadinessPassed", "quarantined",
                        "operatorHold", "stopRequested")
        cases = [(key, value) for key in boolean_keys for value in (0, 1, None, "true")]
        cases += [(key, value) for key in ("modelPending", "compilerPending", "activeCalls", "nonTerminal")
                  for value in (1, -1, False, 0.0, None)]
        cases += [("modelAttempts", value) for value in (-1, True, 0.0, None)]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                self.state = copy.deepcopy(original)
                self.state[key] = value
                self.write()
                report = self.check()
                self.assertEqual(report["category"], "original_service_busy_or_held_do_not_reset")
                self.assertEqual(report["quietSamples"], 0)

    def test_held_stopped_closed_or_unready_service_refuses(self):
        original = copy.deepcopy(self.state)
        for key, value in (("operatorHold", True), ("stopRequested", True),
                           ("quarantined", True), ("phase", "stopped"),
                           ("admission", "closed"), ("adapterState", "unknown"),
                           ("accepting", False), ("retirementConfirmed", False)):
            with self.subTest(key=key):
                self.state = copy.deepcopy(original)
                self.state[key] = value
                self.write()
                report = self.check()
                self.assertEqual(report["category"], "original_service_busy_or_held_do_not_reset")
                self.assertFalse(report["networkOrModelStarted"])

    def test_event_pending_must_be_a_strict_zero_integer(self):
        for pending in (1, -1, False, 0.0, None, "0"):
            with self.subTest(pending=pending):
                self.state["eventBrowse"]["pending"] = pending
                self.write()
                report = self.check()
                self.assertEqual(report["category"], "original_service_busy_or_held_do_not_reset")

    def test_event_local_control_failure_does_not_block_quiet_account_ai(self):
        self.state["eventControlFailed"] = True
        self.state["eventBrowse"] = dict(configured=True, enabled=False, pending=0)
        self.write()
        self.assertEqual(self.check()["status"], "Pass")

    def test_status_changed_during_read_is_refused(self):
        def changed_read(path):
            raw = self.read(path)
            path.write_bytes(raw + b" ")
            os.utime(path, (self.tick, self.tick))
            return raw
        report = self.check(read=changed_read)
        self.assertEqual(report["category"], "host_status_changed_during_read")
        self.assertEqual(report["quietSamples"], 0)

    def test_second_sample_must_still_be_quiet_with_same_model_attempt_count(self):
        for field, value, category in (("operatorHold", True, "original_service_busy_or_held_do_not_reset"),
                                       ("modelPending", 1, "original_service_busy_or_held_do_not_reset"),
                                       ("modelAttempts", 3, "model_activity_changed")):
            with self.subTest(field=field):
                self.state["operatorHold"] = False
                self.state["modelPending"] = 0
                self.state["modelAttempts"] = 2
                self.tick = NOW
                self.write()
                def changes_after_first(duration):
                    self.sleep(duration)
                    self.state[field] = value
                    self.write()
                report = self.check(sleep=changes_after_first)
                self.assertEqual(report["category"], category)
                self.assertEqual(report["quietSamples"], 1)

    def test_handoff_change_between_samples_refuses(self):
        def changes_after_first(duration):
            self.sleep(duration)
            self.handoff += b" "
        report = self.check(sleep=changes_after_first)
        self.assertEqual(report["category"], "private_handoff_changed")
        self.assertEqual(report["quietSamples"], 1)

    def test_handoff_reload_cannot_age_status_out_before_acceptance(self):
        def slow_reload(path):
            result = self.load(path)
            if self.loads == 3:
                self.tick = NOW + 6
            return result
        report = self.check(load=slow_reload)
        self.assertEqual(report["category"], "host_status_stale")
        self.assertEqual(report["quietSamples"], 1)

    def test_fresh_host_snapshot_is_usable_at_unrelated_current_dates(self):
        for current in (1_000_000_000.0, 2_000_000_000.0):
            with self.subTest(current=current):
                self.tick = current
                self.write()
                report = self.check()
                self.assertEqual(report["status"], "Pass")
                self.assertEqual(report["quietSamples"], 2)
                self.assertEqual(report["originalLeaseSettlement"],
                                 "Operator must independently confirm before startup")

    def test_slow_read_still_refuses_stale_status_without_operation_expiry(self):
        def slow_read(path):
            result = self.read(path)
            self.tick = NOW + 60
            return result
        report = self.check(read=slow_read)
        self.assertEqual(report["status"], "Blocked")
        self.assertEqual(report["category"], "host_status_stale")
        self.assertEqual(report["quietSamples"], 0)

    def test_exception_and_duplicate_status_fields_do_not_leak_private_data(self):
        for value in (OSError("private-host-canary"),
                      b'{"private":"private-host-canary","phase":"running","phase":"stopped"}'):
            def invalid_read(_):
                if isinstance(value, Exception):
                    raise value
                return value
            report = self.check(read=invalid_read)
            self.assertEqual(report["status"], "Blocked")
            self.assertEqual(report["quietSamples"], 0)
            self.assertNotIn("private-host-canary", json.dumps(report))


class OutputTests(unittest.TestCase):
    def test_procedure_change_during_check_blocks_and_retains_initial_identity(self):
        first, changed = "1" * 64, "2" * 64
        with patch.object(target, "procedure_sha256", side_effect=[first, changed]), \
                patch.object(target, "check_connection", return_value={"status": "Pass", "category": None}), \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            code = target.main(["connection-check", "--apk", "fixture.apk", "--handoff", "fixture.json"])
        report = json.loads(output.getvalue())
        self.assertEqual(code, 2)
        self.assertEqual(report["category"], "procedure_changed")
        self.assertEqual(report["procedureSha256"], first)

    def test_cli_exception_produces_only_one_safe_json_line(self):
        arguments = ["connection-check", "--apk", "PrivatePathCanary.apk", "--handoff", "PrivatePathCanary.json"]
        with patch.object(target, "check_connection", side_effect=OSError("PrivateExceptionCanary")), \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            code = target.main(arguments)
        self.assertEqual(code, 2)
        self.assertEqual(output.getvalue().count("\n"), 1)
        report = json.loads(output.getvalue())
        self.assertEqual(report["status"], "Blocked")
        self.assertEqual(report["category"], "preflight_refused")
        self.assertNotIn("PrivateExceptionCanary", output.getvalue())
        self.assertNotIn("PrivatePathCanary", output.getvalue())

    def test_cli_wrong_mode_arguments_do_not_dispatch_checker(self):
        with patch.object(target, "check_host") as check, patch("sys.stdout", new_callable=io.StringIO) as output:
            code = target.main(["host-check", "--session", "PrivatePathCanary", "--apk", "candidate.apk"])
        self.assertEqual(code, 2)
        check.assert_not_called()
        self.assertEqual(json.loads(output.getvalue())["category"], "arguments_refused")


class LoopbackTransportTests(unittest.TestCase):
    """Owned fixture HTTP(S) only: these are not remote service or phone evidence."""

    def start_server(self, *, tls_context=None, mode="json"):
        state = {"requests": [], "workers": [], "mode": mode}

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *unused):
                pass

            def do_GET(self):
                state["workers"].append(threading.current_thread())
                state["requests"].append(self.path)
                body = b'{"ok":true}'
                content_type = "application/json"
                status = 200
                if state["mode"] == "redirect":
                    status = 302
                elif state["mode"] == "html":
                    content_type = "text/html"
                elif state["mode"] == "oversized":
                    body = b" " * (target.MAX_RESPONSE + 1)
                elif state["mode"] == "duplicate":
                    body = b'{"private":"FixtureCanary","private":"duplicate"}'
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(body)))
                if status == 302:
                    self.send_header("Location", f"http://127.0.0.1:{self.server.server_port}/followed")
                self.end_headers()
                try:
                    if state["mode"] == "slow-drip":
                        # Every socket read has data within 0.15 s, but the whole
                        # body takes >0.7 s. A per-read timeout alone is inadequate.
                        for byte in body:
                            self.wfile.write(bytes([byte]))
                            self.wfile.flush()
                            time.sleep(0.07)
                    else:
                        self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, ssl.SSLError):
                    pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        server.daemon_threads = True
        if tls_context is not None:
            server.socket = tls_context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
        thread.start()

        def cleanup():
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
            self.assertFalse(thread.is_alive(), "Owned loopback listener was not settled")
            for worker in state["workers"]:
                worker.join(timeout=2)
                self.assertFalse(worker.is_alive(), "Owned loopback handler was not settled")
        self.addCleanup(cleanup)
        return server.server_port, state

    def request(self, port, *, tls=False, context=None, timeout=1):
        return target.request_json(tls=tls, port=port, path="/fixture", method="GET", body=None,
                                   headers={}, context=context, timeout=timeout)

    def test_slow_drip_body_cannot_extend_whole_request_deadline(self):
        port, state = self.start_server(mode="slow-drip")
        error = None
        started = time.monotonic()
        try:
            self.request(port, timeout=0.15)
        except (OSError, http.client.HTTPException, target.Refused) as caught:
            error = caught
        elapsed = time.monotonic() - started
        self.assertIsNotNone(error, "A slow-drip response outlived the whole request budget")
        self.assertLess(elapsed, 0.6, "The whole-call deadline must interrupt response reads")
        self.assertEqual(state["requests"], ["/fixture"], "The request must not retry")

    def test_deadline_failure_closes_response_body_before_returning(self):
        port, state = self.start_server(mode="slow-drip")
        responses = []
        getresponse = http.client.HTTPConnection.getresponse
        def capture(connection):
            response = getresponse(connection)
            responses.append(response)
            return response
        with patch.object(http.client.HTTPConnection, "getresponse", capture):
            with self.assertRaises((OSError, http.client.HTTPException, target.Refused)):
                self.request(port, timeout=0.15)
        try:
            self.assertEqual(state["requests"], ["/fixture"])
            self.assertEqual(len(responses), 1)
            self.assertTrue(responses[0].isclosed(), "Failed response body must close without waiting for GC")
        finally:
            for response in responses:
                response.close()

    def test_loopback_transport_ignores_proxy_environment(self):
        port, state = self.start_server()
        proxy = "http://127.0.0.1:1"
        with patch.dict(os.environ, {name: proxy for name in
                                     ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy")}):
            self.assertEqual(self.request(port), (200, {"ok": True}))
        self.assertEqual(state["requests"], ["/fixture"])

    def test_redirect_response_is_returned_without_following_it(self):
        port, state = self.start_server(mode="redirect")
        self.assertEqual(self.request(port), (302, {"ok": True}))
        self.assertEqual(state["requests"], ["/fixture"])

    def test_content_type_size_and_duplicate_json_are_refused_without_retry(self):
        for mode in ("html", "oversized", "duplicate"):
            with self.subTest(mode=mode):
                port, state = self.start_server(mode=mode)
                with self.assertRaises(target.Refused) as error:
                    self.request(port)
                self.assertEqual(str(error.exception), "response_shape_refused")
                self.assertEqual(state["requests"], ["/fixture"])

    def test_tls_accepts_only_fixture_certificate_with_matching_loopback_name(self):
        # Use an already installed OpenSSL, never install a package or retain a
        # private key in this repository. Report missing capability as Not Run.
        openssl = shutil.which("openssl")
        git_openssl = Path("C:/Program Files/Git/usr/bin/openssl.exe")
        if openssl is None and os.name == "nt" and git_openssl.is_file():
            openssl = str(git_openssl)
        if openssl is None:
            self.skipTest("Existing OpenSSL unavailable: real loopback TLS proof Not Run")
        temporary = tempfile.TemporaryDirectory(prefix="enmori-entry-tls-test-")
        self.addCleanup(temporary.cleanup)
        directory = Path(temporary.name).resolve()
        certificates = []
        for index, hostname in enumerate(("127.0.0.1", "127.0.0.2")):
            certificate, key = directory / f"fixture-{index}.pem", directory / f"fixture-{index}.key"
            result = subprocess.run([openssl, "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                                     "-keyout", str(key), "-out", str(certificate), "-days", "1",
                                     "-subj", "/CN=owned-loopback-fixture",
                                     "-addext", f"subjectAltName=IP:{hostname}"],
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20, check=False)
            self.assertEqual(result.returncode, 0, "Existing OpenSSL could not create owned fixture certificate")
            server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            server_context.load_cert_chain(certificate, key)
            client_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            client_context.load_verify_locations(cadata=certificate.read_text())
            self.assertTrue(client_context.check_hostname)
            self.assertEqual(client_context.verify_mode, ssl.CERT_REQUIRED)
            certificates.append((server_context, client_context))
        correct_server, correct_client = certificates[0]
        wrong_server, wrong_client = certificates[1]
        port, state = self.start_server(tls_context=correct_server)
        self.assertEqual(self.request(port, tls=True, context=correct_client), (200, {"ok": True}))
        with self.assertRaises(ssl.SSLCertVerificationError):
            self.request(port, tls=True, context=wrong_client)
        self.assertEqual(state["requests"], ["/fixture"], "Untrusted TLS must never dispatch HTTP")
        wrong_port, wrong_state = self.start_server(tls_context=wrong_server)
        with self.assertRaises(ssl.SSLCertVerificationError):
            self.request(wrong_port, tls=True, context=wrong_client)
        self.assertEqual(wrong_state["requests"], [], "A trusted certificate still needs a matching hostname")


if __name__ == "__main__":
    unittest.main()
