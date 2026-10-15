import 'dart:convert';
import 'dart:io';

import '../../core/result/result.dart';
import '../../features/auth/domain/auth_repository.dart';

/// Run-owned test configuration delivered into the existing dedicated debug
/// package's private cache. No product launcher or ordinary composition reads it.
/// The password is never a Dart define, APK asset, argument or diagnostic.
final class ControlledMobileFixtureConfiguration {
  ControlledMobileFixtureConfiguration._({
    required this.baseUri,
    required this.certificate,
    required this.email,
    required this._password,
    required this.expiresAt,
  });

  final Uri baseUri;
  final List<int> certificate;
  final String email;
  final DateTime expiresAt;
  String? _password;

  static const cacheFileName = 'zhou-mobile-configuration.json';
  static const projectId = 'demo-enmori-rmvp01a-r10';
  static const maximumBytes = 32768;

  /// Deletes the run-owned file before parsing, including malformed input. The
  /// caller waits for delivery separately; missing configuration is never a skip.
  static Future<ControlledMobileFixtureConfiguration> consume(
    File file, {
    DateTime? now,
  }) async {
    String? encoded;
    try {
      if (await file.length() > maximumBytes) throw const FormatException();
      encoded = await file.readAsString();
    } catch (_) {
      throw const FormatException(
        'Controlled mobile configuration unavailable.',
      );
    } finally {
      if (await file.exists()) await file.delete();
    }
    return parse(encoded, now: now);
  }

  static ControlledMobileFixtureConfiguration parse(
    String encoded, {
    DateTime? now,
  }) {
    try {
      if (utf8.encode(encoded).length > maximumBytes) {
        throw const FormatException();
      }
      final decoded = jsonDecode(encoded);
      if (decoded is! Map<String, dynamic> ||
          decoded.length != 8 ||
          decoded['schemaVersion'] != 1 ||
          decoded['projectId'] != projectId) {
        throw const FormatException();
      }
      final uri = Uri.parse(decoded['baseUri'] as String);
      if (uri.scheme != 'https' ||
          !const {'127.0.0.1', '10.0.2.2'}.contains(uri.host) ||
          uri.userInfo.isNotEmpty ||
          uri.port < 1 ||
          uri.port > 65535 ||
          !const {'', '/'}.contains(uri.path) ||
          uri.hasQuery ||
          uri.hasFragment) {
        throw const FormatException();
      }
      final issuedAt = DateTime.parse(decoded['issuedAt'] as String);
      final expiresAt = DateTime.parse(decoded['expiresAt'] as String);
      final observed = (now ?? DateTime.now()).toUtc();
      if (!issuedAt.isUtc ||
          !expiresAt.isUtc ||
          issuedAt.isAfter(observed.add(const Duration(seconds: 30))) ||
          !expiresAt.isAfter(observed) ||
          !expiresAt.isAfter(issuedAt) ||
          expiresAt.difference(issuedAt) > const Duration(minutes: 5)) {
        throw const FormatException();
      }
      final email = decoded['email'] as String;
      final password = decoded['password'] as String;
      if (!RegExp(r'^[a-z0-9][a-z0-9._+-]{1,80}@example\.invalid$')
              .hasMatch(email) ||
          password.length < 12 ||
          password.length > 256 ||
          password.codeUnits.any((unit) => unit < 0x20 || unit == 0x7f)) {
        throw const FormatException();
      }
      final certificate = base64Decode(decoded['certificateBase64'] as String);
      final pem = ascii.decode(certificate);
      if (!pem.startsWith('-----BEGIN CERTIFICATE-----') ||
          !pem.trimRight().endsWith('-----END CERTIFICATE-----')) {
        throw const FormatException();
      }
      return ControlledMobileFixtureConfiguration._(
        baseUri: uri,
        certificate: List.unmodifiable(certificate),
        email: email,
        password: password,
        expiresAt: expiresAt,
      );
    } catch (_) {
      // Do not attach the decoded object, password or source text to an error.
      throw const FormatException('Controlled mobile configuration invalid.');
    }
  }

  /// Uses the existing email/password port once; session authority still comes
  /// from FirebaseAuthRepository's original authStateChanges observation.
  Future<Result<void>> signIn(AuthRepository auth) async {
    final password = _password;
    _password = null;
    if (password == null || !expiresAt.isAfter(DateTime.now().toUtc())) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.authRequired,
          message: 'The controlled test identity is unavailable.',
        ),
      );
    }
    return auth.signIn(email: email, password: password);
  }
}
