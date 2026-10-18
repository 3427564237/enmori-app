import 'package:flutter/widgets.dart';

import 'harness/social/offline_social_app.dart';

/// Dedicated manual Android HCI fixture; no private handoff or live AI client.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const OfflineSocialApp(hciRetryFixture: true));
}
