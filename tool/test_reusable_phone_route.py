"""Real checker/opaque-relay composition against owned loopback fixtures only.

Private-file reads and APK identity are synthetic. Numeric tailnet endpoints
are never contacted: an instance-only test hook connects to owned loopback
servers. This is not private-ACL, real Backend/Auth, model or Android evidence.
"""
import base64
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import shutil
import socket
import ssl
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch

import check_reusable_phone_entry as checker
import li_controlled_phone_handoff as handoff_tool
import tailscale_phone_relay as relay_module


TOKEN = "SyntheticRouteTokenCanary"
PASSWORD = "SyntheticRoutePasswordCanary!"
SETTINGS = {"settings": {"checkInVisibility": "private",
                         "optionalProcessingConsent": "accepted", "revision": 1}}


class ReusablePhoneRouteTests(unittest.TestCase):
    def setUp(self):
        openssl = shutil.which("openssl")
        git_openssl = Path("C:/Program Files/Git/usr/bin/openssl.exe")
        if openssl is None and os.name == "nt" and git_openssl.is_file():
            openssl = str(git_openssl)
        if openssl is None:
            self.skipTest("Existing OpenSSL unavailable: loopback TLS composition Not Run")
        temporary = tempfile.TemporaryDirectory(prefix="enmori-route-composition-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve()
        self.certificates = []
        for index in range(2):
            certificate = self.directory / f"fixture-{index}.pem"
            key = self.directory / f"fixture-{index}.key"
            result = subprocess.run(
                [openssl, "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", str(key),
                 "-out", str(certificate), "-days", "1", "-subj", "/CN=owned-route-fixture",
                 "-addext", "subjectAltName=IP:127.0.0.1"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20, check=False)
            self.assertEqual(result.returncode, 0, "Existing OpenSSL fixture generation failed")
            self.certificates.append((certificate, key))
        self.apk = self.directory / "synthetic.apk"
        self.apk.write_bytes(b"Synthetic route-check APK fixture, never installable")
        self.apk_hash = hashlib.sha256(self.apk.read_bytes()).hexdigest()
        self.requests = []
        self.upstreams = []
        self.events = []
        self.errors = []
        self.connection_attempts = []
        self.relay = None
        self.relay_thread = None

    def start_server(self, kind):
        owner = self
        workers = []

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *unused):
                pass

            def reply(self, status, value):
                body = json.dumps(value, separators=(",", ":")).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):
                workers.append(threading.current_thread())
                owner.requests.append((kind, self.path, self.headers.get("Authorization"), None))
                if kind != "backend" or self.path != checker.SETTINGS_PATH:
                    self.reply(404, {"error": {"code": "FIXTURE_PATH_REFUSED"}})
                elif self.headers.get("Authorization") is None:
                    self.reply(401, {"error": {"code": "AUTH_REQUIRED"}})
                elif self.headers.get("Authorization") == "Bearer " + TOKEN:
                    self.reply(200, SETTINGS)
                else:
                    self.reply(401, {"error": {"code": "AUTH_INVALID"}})

            def do_POST(self):
                workers.append(threading.current_thread())
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 4096:
                    self.reply(400, {"error": {"code": "FIXTURE_BODY_REFUSED"}})
                    return
                payload = json.loads(self.rfile.read(length))
                owner.requests.append((kind, self.path, self.headers.get("Authorization"), payload))
                if kind == "auth" and self.path == checker.AUTH_PATH and payload == {
                        "email": "route-fixture@example.invalid", "password": PASSWORD, "returnSecureToken": True}:
                    self.reply(200, {"idToken": TOKEN})
                else:
                    self.reply(400, {"error": {"code": "FIXTURE_AUTH_REFUSED"}})

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        server.daemon_threads = True
        if kind == "backend":
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(*self.certificates[0])
            server.socket = context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
        thread.start()

        def cleanup():
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
            self.assertFalse(thread.is_alive(), "Owned fixture listener did not stop")
            self.assertEqual(server.socket.fileno(), -1)
            for worker in workers:
                worker.join(timeout=2)
                self.assertFalse(worker.is_alive(), "Owned fixture request worker did not stop")
        self.addCleanup(cleanup)
        return server.server_port

    def start_route(self, *, trusted):
        backend_upstream = self.start_server("backend")
        auth_upstream = self.start_server("auth")
        # Reserve distinct available ports, then release them for Relay.start.
        # The production Auth port is never bound or adopted by this fixture.
        with socket.socket() as backend_reservation, socket.socket() as auth_reservation:
            backend_reservation.bind(("127.0.0.1", 0))
            auth_reservation.bind(("127.0.0.1", 0))
            self.backend_port = backend_reservation.getsockname()[1]
            self.auth_port = auth_reservation.getsockname()[1]
        self.assertNotIn(9099, (self.backend_port, self.auth_port, backend_upstream, auth_upstream))
        self.handoff_path = self.directory / "synthetic-private-handoff.json"
        route_path = self.directory / "synthetic-private-route.json"
        certificate = self.certificates[0 if trusted else 1][0].read_bytes()
        handoff = json.dumps({
            "schemaVersion": 1, "projectId": "demo-enmori-rmvp01a-r10",
            "email": "route-fixture@example.invalid", "password": PASSWORD,
            "baseUri": f"https://127.0.0.1:{self.backend_port}/",
            "certificateBase64": base64.b64encode(certificate).decode(),
            "authEmulatorHost": "127.0.0.1:9099",
            "lifetime": "until-explicit-stop-in-this-owned-process", "syntheticOwnerOnly": True,
        }).encode()
        route = json.dumps({"schemaVersion": 1, "tailnetHost": "100.64.0.23",
                            "handoffSha256": hashlib.sha256(handoff).hexdigest()}).encode()
        contents = {self.handoff_path: handoff, route_path: route}

        def read_private(path, limit=65536):
            data = contents[path]
            self.assertLessEqual(len(data), limit)
            return data
        self.enterContext(patch.object(relay_module, "read_private_handoff_file", side_effect=read_private))
        self.enterContext(patch.object(handoff_tool, "read_private_handoff_file", side_effect=read_private))
        self.enterContext(patch.object(relay_module, "AUTH_PORT", self.auth_port))
        configuration = relay_module.load_configuration(self.handoff_path, route_path)
        self.assertEqual(configuration.host, "100.64.0.23")
        self.relay = relay_module.Relay(configuration, emit=self.events.append)

        def connect_owned_upstream(port):
            self.assertIn(port, (self.backend_port, self.auth_port))
            destination = backend_upstream if port == self.backend_port else auth_upstream
            self.connection_attempts.append(port)
            upstream = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.upstreams.append(upstream)
            try:
                upstream.setblocking(False)
                code = upstream.connect_ex(("127.0.0.1", destination))
                if code != 0 and code not in relay_module._PENDING:
                    raise OSError("Owned fixture connect failed")
                return upstream, code != 0
            except BaseException:
                upstream.close()
                raise
        # Instance-only Python test hook; no CLI or public-route override exists.
        self.relay._open_upstream = connect_owned_upstream
        self.addCleanup(self.stop_route)
        self.relay.start()
        self.listeners = list(self.relay.listeners)

        def run():
            try:
                self.relay.run()
            except BaseException as error:
                self.errors.append(type(error).__name__)
        self.relay_thread = threading.Thread(target=run, daemon=True)
        self.relay_thread.start()

    def stop_route(self):
        if self.relay is None:
            return
        self.relay.request_stop()
        if self.relay_thread is not None:
            self.relay_thread.join(timeout=3)
            self.assertFalse(self.relay_thread.is_alive(), "Owned relay selector thread did not stop")
        self.relay.close()
        self.assertTrue(self.relay.closed)
        self.assertEqual(self.relay.listeners, [])
        self.assertFalse(self.relay.pairs)
        self.assertTrue(all(sock.fileno() == -1 for sock in self.upstreams))
        self.assertTrue(all(sock.fileno() == -1 for sock in getattr(self, "listeners", [])))
        self.assertEqual(self.errors, [])

    def check(self):
        def real_request(**arguments):
            self.assertIn(arguments["port"], (self.backend_port, 9099))
            if arguments["port"] == 9099:
                arguments["port"] = self.auth_port
            return checker.request_json(**arguments)
        with patch.object(checker, "APK_SHA256", self.apk_hash), \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            report = checker.check_connection(self.apk, self.handoff_path, request=real_request)
        self.assertEqual(output.getvalue(), "")
        public = json.dumps([report, self.events])
        for value in (PASSWORD, TOKEN, "route-fixture@example.invalid"):
            self.assertNotIn(value, public)
        self.assertEqual(hashlib.sha256(self.apk.read_bytes()).hexdigest(), self.apk_hash)
        self.assertEqual(report["phoneFlow"], "Not Run")
        return report

    def test_real_checker_completes_guard_auth_settings_through_opaque_relay(self):
        self.start_route(trusted=True)
        report = self.check()
        self.assertEqual(report["status"], "Pass")
        self.assertTrue(report["backendTlsAndAuthGuard"])
        self.assertTrue(report["authSignIn"])
        self.assertTrue(report["authenticatedSettingsRead"])
        self.assertEqual([(kind, path) for kind, path, _, _ in self.requests],
                         [("backend", checker.SETTINGS_PATH), ("auth", checker.AUTH_PATH),
                          ("backend", checker.SETTINGS_PATH)])
        self.assertEqual(self.requests[2][2], "Bearer " + TOKEN)
        self.assertEqual(self.connection_attempts, [self.backend_port, self.auth_port, self.backend_port])
        self.assertTrue(all(event["upstreamConnectivityVerified"] is False for event in self.events))
        self.stop_route()

    def test_untrusted_backend_certificate_through_relay_blocks_before_auth(self):
        self.start_route(trusted=False)
        report = self.check()
        self.assertEqual(report["status"], "Blocked")
        self.assertEqual(report["category"], "backend_tls_or_auth_guard_failed")
        self.assertFalse(report["backendTlsAndAuthGuard"])
        self.assertFalse(report["authSignIn"])
        self.assertEqual(self.requests, [], "TLS rejection must occur before HTTP or Auth")
        self.assertEqual(self.connection_attempts, [self.backend_port])
        self.stop_route()


if __name__ == "__main__":
    unittest.main()
