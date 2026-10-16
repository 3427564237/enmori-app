import copy
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from li_sponsor_demo import Refused, installed, matching_models, private, quiet, twice_quiet, remote_json, require_deleted_page


class SponsorPreparationTests(unittest.TestCase):
    def setUp(self):
        self.state = dict(scope='isolated-phone-service', phase='running', accepting=True,
                          maintenanceHealthy=True, retirementConfirmed=True, admission='open',
                          httpsListening=True, adapterState='stopped', modelAttempts=1,
                          modelPending=0, compilerPending=0, activeCalls=0, nonTerminal=0,
                          quarantined=False, operatorHold=False, stopRequested=False,
                          eventControlFailed=False,
                          eventBrowse=dict(configured=True, enabled=False, pending=0))
        self.binding = dict(reference='owned-qwen', manifestDigest='a' * 64)
        self.model = dict(name='owned-qwen', digest='a' * 64, context_length=8192,
                          details=dict(parameter_size='9B', family='qwen3'))

    def test_held_or_inflight_original_is_refused(self):
        self.assertTrue(quiet(self.state))
        # Transport preflight failure leaves not_checked without a dispatched generation.
        self.assertTrue(quiet({**self.state, 'adapterState': 'not_checked'}))
        # Startup preflight may be ready with no invocation, after all authority/IO checks.
        self.assertTrue(quiet({**self.state, 'adapterState': 'ready'}))
        self.assertFalse(quiet({**self.state, 'adapterState': 'ready', 'modelPending': 1}))
        self.assertFalse(quiet({**self.state, 'adapterState': 'not_checked', 'retirementConfirmed': False}))
        for key, value in [('modelPending', 1), ('compilerPending', 1), ('activeCalls', 1),
                           ('nonTerminal', 1), ('operatorHold', True), ('quarantined', True),
                           ('adapterState', 'unknown'), ('retirementConfirmed', False),
                           ('maintenanceHealthy', False), ('stopRequested', True)]:
            with self.subTest(key=key):
                self.assertFalse(quiet({**self.state, key: value}))
        self.assertFalse(quiet({**self.state, 'eventBrowse': dict(configured=True, pending=1)}))
        self.assertFalse(quiet({}))

    def test_two_quiet_samples_do_not_hide_intervening_product_attempt(self):
        with patch('li_sponsor_demo.status', side_effect=[self.state, {**self.state, 'modelAttempts': 2}]), patch('li_sponsor_demo.time.sleep'):
            with self.assertRaises(Refused):
                twice_quiet(Path('/unused'))

    def test_health_or_wrong_model_is_not_residency(self):
        self.assertFalse(matching_models({'models': []}, self.binding, True))
        self.assertTrue(matching_models({'models': [self.model]}, self.binding, True))
        for change in [dict(digest='b' * 64), dict(context_length=4096),
                       dict(details=dict(parameter_size='4B', family='qwen3'))]:
            with self.subTest(change=list(change)):
                with self.assertRaises(Refused):
                    matching_models({'models': [{**self.model, **change}]}, self.binding, True)
        with self.assertRaises(Refused):
            matching_models({'models': [self.model, copy.deepcopy(self.model)]}, self.binding, True)

    def test_private_input_rejects_broad_permissions_and_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'config'
            path.write_text('{}')
            path.chmod(0o600)
            private(path)
            path.chmod(0o644)
            with self.assertRaises(Refused):
                private(path)
            path.chmod(0o600)
            link = Path(directory) / 'link'
            os.symlink(path, link)
            with self.assertRaises(Refused):
                private(link)

    def test_actual_android_tilde_install_path_and_hash_mismatch(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            apk = root / 'demo.apk'
            apk.write_bytes(b'bound-apk')
            digest = hashlib.sha256(apk.read_bytes()).hexdigest()
            identity = root / 'identity.json'
            identity.write_text(json.dumps(dict(package='com.enmori.app.personatest', relativePath='demo.apk', sha256=digest)))
            native_path = b'package:/data/app/~~abc==/com.enmori.app.personatest-abc==/base.apk\n'
            with patch('li_sponsor_demo.IDENTITY', identity), patch('li_sponsor_demo.ROOT', root):
                with patch('li_sponsor_demo.adb', side_effect=[b'device', native_path, digest.encode()+b'  /bound.apk']):
                    self.assertEqual(installed('owned-serial'), apk)
                with patch('li_sponsor_demo.adb', side_effect=[b'device', native_path, b'bad-hash /bound.apk']):
                    with self.assertRaises(Refused):
                        installed('owned-serial')

    def test_existing_loopback_origin_with_or_without_slash_and_no_public_origin(self):
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value.read.return_value = b'{}'
        with patch('li_sponsor_demo.urllib.request.build_opener', return_value=opener):
            for endpoint in ['http://127.0.0.1:11434', 'http://127.0.0.1:11434/', 'http://[::1]:11434/']:
                self.assertEqual(remote_json(dict(endpoint=endpoint), '/api/ps'), {})
            for endpoint in ['https://example.com/', 'http://127.0.0.1:11434/?token=private', 'http://user:pass@127.0.0.1/']:
                with self.assertRaises(Refused):
                    remote_json(dict(endpoint=endpoint), '/api/ps')

    def test_next_round_requires_owned_foreground_and_actual_terminal_deletion(self):
        focus = 'mCurrentFocus=Window{ com.enmori.app.personatest/.MainActivity }'
        deleted = '<?xml version="1.0"?><hierarchy><node text="Conversation deleted."/></hierarchy>'
        require_deleted_page(focus, deleted)
        for wrong_focus, wrong_xml in [('mCurrentFocus=other.package', deleted),
                                        (focus, deleted.replace('Conversation deleted.', 'Waiting for a reply…')),
                                        (focus, 'no hierarchy')]:
            with self.assertRaises(Refused):
                require_deleted_page(wrong_focus, wrong_xml)


if __name__ == '__main__':
    unittest.main()
