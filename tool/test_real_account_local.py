"""Launcher-boundary checks only; no service, credentials or network access."""
import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import real_account_local as runner


class StartOwnershipTest(unittest.TestCase):
    def test_existing_lock_is_delegated_to_atomic_runner_without_deletion(self):
        with tempfile.TemporaryDirectory(prefix='enmori-start-test-') as directory:
            root = Path(directory)
            config = root / 'local-backend.json'
            config.write_text(json.dumps({'projectId': 'enmori-rmvp-controlled',
                                          'host': '127.0.0.1', 'port': 9381}))
            config.chmod(0o600)
            lock = root / 'real-account.lock'
            original = '{"pid":123,"startTicks":"123","bootId":"synthetic"}'
            lock.write_text(original)
            lock.chmod(0o600)
            with patch('sys.argv', ['entry', 'start', '--directory', directory]), \
                    patch.dict(os.environ, {}, clear=True), \
                    patch.object(runner, 'node_path', return_value='/synthetic/node24'), \
                    patch.object(runner.subprocess, 'Popen') as start, \
                    contextlib.redirect_stdout(io.StringIO()) as output:
                start.return_value.pid = 456
                runner.main()
            self.assertEqual(lock.read_text(), original)
            self.assertEqual(start.call_args.args[0], ['/synthetic/node24',
                             'tool/run_real_account_local.mjs', str(config)])
            self.assertEqual(json.loads(output.getvalue()), {'phase': 'starting', 'pid': 456})


if __name__ == '__main__':
    unittest.main()
