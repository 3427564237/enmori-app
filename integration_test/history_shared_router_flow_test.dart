import 'package:integration_test/integration_test.dart';

import '../test/app/check_in_history_shared_router_test.dart' as shared_flow;

// Synthetic HTTP and injected device fixtures exercise the actual Home/router,
// real feature pages and Backend repository mapping. No real persistence claim.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  shared_flow.main();
}
