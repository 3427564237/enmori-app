import 'package:flutter/widgets.dart';

import 'controlled_phone_harness.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ControlledPhoneHarness(activitiesEnabled: true, integratedDemo: true),
  );
}
