# LI controlled phone handoff

Run only after the dedicated candidate is already installed and waiting. This
tool never installs, uninstalls or stops an app. It verifies local APK identity
and the installed `base.apk` SHA256 before accessing the dedicated app's private
ready file. It accepts the nine-field private #117 service handoff, not #115's
two-minute integration-test configuration.

```sh
python tool/li_controlled_phone_handoff.py --apk /absolute/candidate.apk \
  --handoff /private/session/handoff.json --serial EXPLICIT_USB_SERIAL
python -m unittest discover -s tool -p test_li_controlled_phone_handoff.py
```

The input handoff must be a regular, operator-owned mode600 file. Optional
`--adb` and `--aapt` select existing absolute tool paths. Defaults use the existing
Android SDK platform tools and build-tools36.0.0.

The app writes `enmori-controlled-phone-ready.json` with schemaVersion1 and a
fresh64-character lowercase-hex nonce in its system-temp directory. `code_cache`
is preferred, with `cache` fallback. The host rechecks that nonce inside the
fixed delivery shell, claims a separate host-attempt ownership token, and sends
the original private handoff through stdin to an atomic mode600 write. It waits
up to20seconds for the app to consume the configuration and remove ready before
reporting success and removing its ownership marker. This proves delivery and
consumption, not authentication, Backend health or a model response.

Only Auth9099 and the handoff's dynamic loopback HTTPS port are reversed. Existing
matching mappings are borrowed. Success retains mappings for the ongoing app;
the operator removes mappings created by this handoff after stopping that session.
Failure removes only mappings still matching its own acknowledged creations and
configuration files with its host-attempt owner token. Changed mappings and
unconfirmed ADB acknowledgments are preserved and reported as unconfirmed cleanup.
Ready belongs to the app and is never removed by failure cleanup. A stale owner
from a crashed helper is deliberately refused; inspect that original attempt
instead of overwriting an uncertain delivery. Public output contains only fixed
categories, booleans, counts and the APK hash.

Tests use command doubles plus a local temporary POSIX-shell fixture. They do not
exercise Android, a real service, Firebase or a model.
