import copy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from li_sponsor_demo import Refused, matching_models, private, quiet, twice_quiet


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


if __name__ == '__main__':
    unittest.main()
