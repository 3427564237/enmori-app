import 'activity_device_flow_test.dart' as activity;
import 'offline_baseline_device_flow_test.dart' as offline;

// One assigned-device installation runs the two independently attributed flows.
void main() {
  activity.main();
  offline.main();
}
