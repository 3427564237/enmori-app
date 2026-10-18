import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import install_diagnostic_capture as installer


class Render(unittest.TestCase):
    def test_helper_is_not_loaded_before_source_digest_matches(self):
        with self.assertRaisesRegex(ValueError, "CAPTURE_INSTALL_UNAVAILABLE"):
            installer.load_verified_helper(b'raise RuntimeError("unverified code executed")', "0" * 64)

    def test_no_arbitrary_user_or_systemd_path_interpolation(self):
        for user, path in (("a ALL=ALL", "/var/lib/synthetic"), ("root\n", "/var/lib/synthetic"),
                           ("synthetic", "/var/lib/%n"), ("synthetic", "/tmp/logs"),
                           ("synthetic", "/var/lib/a/../b"), ("synthetic", "/var/lib/a\nExecStart=x")):
            with self.subTest(user=user, path=path), self.assertRaises(Exception):
                installer.artifacts(user, path)

    def test_commands_are_exact_and_timer_independent_of_login(self):
        wrapper, sudoers, service, timer = installer.artifacts("synthetic", "/var/lib/synthetic")
        self.assertIn('/usr/bin/python3 -I -B ', wrapper)
        self.assertNotIn('*', sudoers)
        self.assertNotIn(' cleanup', sudoers)
        self.assertNotIn(' initialize', sudoers)
        self.assertIn('NOSETENV', sudoers)
        self.assertIn('!log_input, !log_output', sudoers)
        self.assertIn('User=root\n', service)
        self.assertIn('StandardOutput=null\nStandardError=null', service)
        self.assertIn('OnBootSec=1min', timer)
        self.assertIn('OnCalendar=hourly', timer)
        self.assertIn('Persistent=true', timer)
        self.assertIn('WantedBy=timers.target', timer)


@unittest.skipUnless(sys.platform == "linux" and hasattr(os, "geteuid") and os.geteuid() == 0, "requires Linux parsers/root-owned test directory")
class LinuxSyntax(unittest.TestCase):
    def test_actual_sudo_and_systemd_parsers_without_installing(self):
        root = Path(tempfile.mkdtemp(prefix="enmori-capture-install-test-", dir="/run"))
        try:
            wrapper, sudoers, service, timer = installer.artifacts("nobody", "/var/lib/synthetic")
            # Substitute ONLY the installation executable location for syntax
            # verification; no unit is loaded and no privilege rule installed.
            helper = root / "helper"
            helper.write_text(wrapper)
            helper.chmod(0o755)
            (root / "sudoers").write_text(sudoers)
            unit = root / (installer.UNIT + ".service")
            unit.write_text(service.replace(installer.WRAPPER, str(helper)))
            (root / (installer.UNIT + ".timer")).write_text(timer)
            for command in (("/usr/sbin/visudo", "-cf", str(root / "sudoers")),
                            ("/usr/bin/systemd-analyze", "verify", str(unit), str(root / (installer.UNIT + ".timer")))):
                result = subprocess.run(command, capture_output=True, timeout=10)
                self.assertEqual(result.returncode, 0, result.stderr.decode())
        finally:
            self.assertEqual(root.parent, Path("/run"))
            self.assertTrue(root.name.startswith("enmori-capture-install-test-"))
            shutil.rmtree(root)


if __name__ == "__main__":
    unittest.main()
