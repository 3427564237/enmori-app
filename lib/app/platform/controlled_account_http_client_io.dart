import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

/// The supplied localhost certificate is the only trust root for this client.
/// Hostname, expiry and certificate-chain validation remain enabled.
http.Client createControlledAccountHttpClient(
  Uri baseUri,
  String certificateBase64,
) {
  if (baseUri.scheme != 'https' ||
      baseUri.host != '127.0.0.1' ||
      baseUri.port != 9381 ||
      baseUri.userInfo.isNotEmpty ||
      baseUri.hasQuery ||
      baseUri.hasFragment ||
      (baseUri.path.isNotEmpty && baseUri.path != '/') ||
      certificateBase64.isEmpty) {
    throw const FormatException('Invalid controlled account connection.');
  }
  final trust = SecurityContext(withTrustedRoots: false)
    ..setTrustedCertificatesBytes(base64Decode(certificateBase64));
  return IOClient(HttpClient(context: trust));
}
