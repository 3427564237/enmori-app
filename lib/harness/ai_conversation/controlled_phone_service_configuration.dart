import 'dart:convert';
import 'dart:io';

import '../../core/result/result.dart';
import '../../features/auth/domain/auth_repository.dart';

/// Private process-lifetime handoff for the dedicated connected candidate.
/// This is deliberately separate from the short-lived integration-test DTO.
final class ControlledPhoneServiceConfiguration {
  ControlledPhoneServiceConfiguration._({
    required this.baseUri,
    required this.certificate,
    required this._email,
    required this._password,
  });

  static const cacheFileName = 'enmori-controlled-phone-service.json';
  static const projectId = 'demo-enmori-rmvp01a-r10';
  static const maximumBytes = 32768;
  static const certificateMaximumBytes = 16384;
  static const _fields = {
    'schemaVersion',
    'projectId',
    'email',
    'password',
    'baseUri',
    'certificateBase64',
    'authEmulatorHost',
    'lifetime',
    'syntheticOwnerOnly',
  };
  static const _invalid = 'Controlled phone service configuration invalid.';
  static const _unavailable = AppFailure(
    kind: AppFailureKind.authRequired,
    message: 'The controlled service identity is unavailable.',
  );

  final Uri baseUri;
  final List<int> certificate;
  final String _email;
  String? _password;

  /// Delete the owned fixed-name handoff before parsing or issuing Auth work,
  /// including unreadable, oversized and malformed input. Never log its path.
  static Future<ControlledPhoneServiceConfiguration> consume(File file) async {
    if (file.uri.pathSegments.isEmpty ||
        file.uri.pathSegments.last != cacheFileName) {
      throw const FormatException(_invalid);
    }
    String? encoded;
    try {
      if (await FileSystemEntity.type(file.path, followLinks: false) !=
              FileSystemEntityType.file ||
          await file.length() > maximumBytes) {
        throw const FormatException();
      }
      encoded = await file.readAsString();
    } catch (_) {
      encoded = null;
    } finally {
      try {
        if (await FileSystemEntity.type(file.path, followLinks: false) !=
            FileSystemEntityType.notFound) {
          await file.delete();
        }
      } catch (_) {
        throw const FormatException(_invalid);
      }
    }
    if (encoded == null) throw const FormatException(_invalid);
    return parse(encoded);
  }

  static ControlledPhoneServiceConfiguration parse(String encoded) {
    try {
      if (utf8.encode(encoded).length > maximumBytes) {
        throw const FormatException();
      }
      final raw = jsonDecode(encoded);
      if (raw is! Map<String, dynamic> ||
          raw.length != _fields.length ||
          raw.keys.any((key) => !_fields.contains(key)) ||
          raw['schemaVersion'] is! int ||
          raw['schemaVersion'] != 1 ||
          raw['projectId'] != projectId ||
          raw['authEmulatorHost'] != '127.0.0.1:9099' ||
          raw['lifetime'] != 'until-explicit-stop-in-this-owned-process' ||
          raw['syntheticOwnerOnly'] != true) {
        throw const FormatException();
      }
      final base = raw['baseUri'] as String;
      // Reject forbidden authority syntax before Uri normalizes it away.
      if (!RegExp(r'^https://127\.0\.0\.1:[1-9][0-9]{0,4}/$').hasMatch(base)) {
        throw const FormatException();
      }
      final uri = Uri.parse(base);
      if (uri.scheme != 'https' ||
          uri.host != '127.0.0.1' ||
          !uri.hasPort ||
          uri.port < 1 ||
          uri.port > 65535 ||
          uri.authority.contains('@') ||
          uri.path != '/' ||
          uri.hasQuery ||
          uri.hasFragment) {
        throw const FormatException();
      }
      final email = raw['email'] as String;
      final password = raw['password'] as String;
      if (!RegExp(r'^[a-z0-9][a-z0-9._+-]{1,80}@example\.invalid$')
              .hasMatch(email) ||
          password.length < 12 ||
          password.length > 256 ||
          password.codeUnits.any((unit) => unit < 0x20 || unit == 0x7f)) {
        throw const FormatException();
      }
      final encodedCertificate = raw['certificateBase64'] as String;
      final certificate = base64Decode(encodedCertificate);
      if (certificate.length > certificateMaximumBytes ||
          base64Encode(certificate) != encodedCertificate) {
        throw const FormatException();
      }
      final pem = ascii.decode(certificate);
      final block = RegExp(
        r'^-----BEGIN CERTIFICATE-----\r?\n([A-Za-z0-9+/=\r\n]+)\r?\n-----END CERTIFICATE-----(?:\r?\n)?$',
      ).firstMatch(pem);
      if (block == null ||
          base64Decode(block[1]!.replaceAll(RegExp(r'[\r\n]'), '')).isEmpty) {
        throw const FormatException();
      }
      // This validates the bounded PEM handoff shape. The caller's local
      // SecurityContext still validates the X509 certificate before HTTP use.
      return ControlledPhoneServiceConfiguration._(
        baseUri: uri,
        certificate: List<int>.unmodifiable(certificate),
        email: email,
        password: password,
      );
    } catch (_) {
      throw const FormatException(_invalid);
    }
  }

  /// One command only; success never creates or emits an authenticated session.
  /// The existing AuthRepository observation remains the source of authority.
  Future<Result<void>> signIn(AuthRepository auth) async {
    final password = _password;
    _password = null;
    if (password == null) return const Failure(_unavailable);
    try {
      return await auth.signIn(email: _email, password: password);
    } catch (_) {
      return const Failure(_unavailable);
    }
  }
}
