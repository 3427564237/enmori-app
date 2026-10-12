import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Concrete owner-date feature and dependencies supplied by an isolated harness.
/// The page performs its own source/session reads; navigation grants no access.
final class IsolatedHistoryPage {
  const IsolatedHistoryPage({required this.build});

  final Widget Function(
    BuildContext context, {
    required VoidCallback onBack,
    required ValueChanged<String> onOpenSavedCheckIn,
  })
  build;
}

/// Selected Conversation client surface with explicitly controlled dependencies.
/// The page owns cancellation/exit checks before invoking these callbacks.
/// A handwritten test transport belongs only in an explicit synthetic harness.
final class IsolatedAiConversationPage {
  const IsolatedAiConversationPage({required this.build});

  final Widget Function(
    BuildContext context, {
    required VoidCallback onBack,
    required VoidCallback onOpenSettings,
  })
  build;
}

// Independent readiness: one feature never waits for the other. No default page,
// mock response or ordinary/demo runtime enablement is supplied by composition.
final isolatedHistoryPageProvider = Provider<IsolatedHistoryPage?>(
  (ref) => null,
);
final isolatedAiConversationPageProvider =
    Provider<IsolatedAiConversationPage?>((ref) => null);
