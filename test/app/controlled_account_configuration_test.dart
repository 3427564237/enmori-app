import 'package:enmori/app/bootstrap.dart';
import 'package:enmori/app/platform/controlled_account_http_client.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';

FirebaseRuntimeConfiguration configuration({
  bool emulator = false,
  String project = 'enmori-rmvp-controlled',
}) => FirebaseRuntimeConfiguration(
  options: FirebaseOptions(
    apiKey: 'synthetic',
    appId: 'synthetic',
    messagingSenderId: 'synthetic',
    projectId: project,
  ),
  useAuthEmulator: emulator,
  authEmulatorHost: '127.0.0.1',
  authEmulatorPort: 9099,
);

void main() {
  test('real account build rejects emulator, other project and wrong edge before SDK initialization', () {
    bool valid(
      FirebaseRuntimeConfiguration config,
      String url, {
      String cert = 'present',
    }) => validAccountRuntimeConfiguration(
      config,
      controlledAccount: true,
      certificateBase64: cert,
      baseUri: Uri.tryParse(url),
    );
    expect(valid(configuration(), 'https://127.0.0.1:9381/'), isTrue);
    expect(
      valid(configuration(emulator: true), 'https://127.0.0.1:9381/'),
      isFalse,
    );
    expect(
      valid(
        configuration(project: 'demo-enmori-rmvp01a-r10'),
        'https://127.0.0.1:9381/',
      ),
      isFalse,
    );
    for (final url in [
      'http://127.0.0.1:9381/',
      'https://127.0.0.1:9380/',
      'https://example.invalid:9381/',
      'https://user@127.0.0.1:9381/',
      'https://127.0.0.1:9381/?other=true',
    ]) {
      expect(valid(configuration(), url), isFalse, reason: url);
    }
    expect(
      valid(configuration(), 'https://127.0.0.1:9381/', cert: ''),
      isFalse,
    );
  });
  test('ordinary bootstrap cannot accidentally consume a private controlled certificate', () {
    expect(
      validAccountRuntimeConfiguration(
        configuration(),
        controlledAccount: false,
        certificateBase64: 'present',
        baseUri: null,
      ),
      isFalse,
    );
    expect(
      validAccountRuntimeConfiguration(
        configuration(),
        controlledAccount: false,
        certificateBase64: '',
        baseUri: null,
      ),
      isTrue,
    );
  });
  test('invalid certificate or emulator port never produces a fallback HTTP client', () {
    expect(
      () => createControlledAccountHttpClient(
        Uri.parse('https://127.0.0.1:9381/'),
        'not-base64!',
      ),
      throwsA(anything),
    );
    expect(
      () => createControlledAccountHttpClient(
        Uri.parse('https://127.0.0.1:9380/'),
        'present',
      ),
      throwsFormatException,
    );
  });
}
