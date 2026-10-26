import 'package:enmori/core/presentation/refresh_on_return.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void pauseAndResume(WidgetTester tester) {
  for (final state in [
    AppLifecycleState.inactive,
    AppLifecycleState.hidden,
    AppLifecycleState.paused,
    AppLifecycleState.hidden,
    AppLifecycleState.inactive,
    AppLifecycleState.resumed,
  ]) {
    tester.binding.handleAppLifecycleStateChanged(state);
  }
}

void main() {
  testWidgets('hidden routes wait for visibility and coalesce returns', (
    tester,
  ) async {
    final navigator = GlobalKey<NavigatorState>();
    var reads = 0;
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigator,
        home: RefreshOnReturn(
          onRefresh: () => reads++,
          child: const Scaffold(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(reads, 0);
    navigator.currentState!.push<void>(
      MaterialPageRoute(builder: (_) => const Scaffold()),
    );
    await tester.pumpAndSettle();
    pauseAndResume(tester);
    await tester.pumpAndSettle();
    expect(reads, 0);
    navigator.currentState!.pop();
    await tester.pumpAndSettle();
    expect(reads, 1);
    pauseAndResume(tester);
    await tester.pumpAndSettle();
    expect(reads, 2);
  });

  testWidgets('a disposed route cannot perform a queued return read', (
    tester,
  ) async {
    var reads = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: RefreshOnReturn(
          onRefresh: () => reads++,
          child: const Scaffold(),
        ),
      ),
    );
    pauseAndResume(tester);
    await tester.pumpWidget(const SizedBox.shrink());
    expect(reads, 0);
  });
}
