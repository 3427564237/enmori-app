import 'package:http/http.dart' as http;

http.Client createControlledAccountHttpClient(
  Uri baseUri,
  String certificateBase64,
) => throw UnsupportedError('Controlled account verification requires mobile.');
