import 'package:integration_test/integration_test.dart';

import '../test/app/ai_conversation_shared_router_test.dart' as shared_flow;

// Reuse the same seven assertions on an explicitly assigned test device.
// Device execution is a separate result, never inferred from widget or APK Pass.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  shared_flow.main();
}
