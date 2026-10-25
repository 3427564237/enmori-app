import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/ai_conversation/domain/ai_owned_sources.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../../features/proactive/domain/proactive.dart';

/// Enabled only by the explicitly selected companion candidate composition.
final companionFirstFlowEnabledProvider = Provider<bool>((ref) => false);

/// Ephemeral navigation data. It cannot survive a session replacement or be
/// reconstructed from a URL; the destination rereads current source authority.
final class FollowUpNavigation {
  const FollowUpNavigation({required this.session, required this.source});
  final AuthSessionAuthenticated session;
  final SavedFollowUpSource source;
}

/// Only an authenticated resolver supplies this ephemeral locator. The target
/// page still reads its current canonical anchor and never trusts cached text.
final class AiMessageNavigation {
  const AiMessageNavigation({required this.session, required this.locator});
  final AuthSessionAuthenticated session;
  final AiMessageLocator locator;
}

final class CompanionMessagePage {
  const CompanionMessagePage({required this.build});
  final Widget Function(
    BuildContext context, {
    required AiMessageLocator locator,
    required VoidCallback onBack,
    required VoidCallback onOpenSettings,
  })
  build;
}

final companionMessagePageProvider = Provider<CompanionMessagePage?>(
  (ref) => null,
);

/// The owner explicitly chose this record in its detail page. This is only an
/// ephemeral selection hint; the destination rereads it before preparation.
final class AiCheckInNavigation {
  const AiCheckInNavigation({required this.session, required this.checkInId});
  final AuthSessionAuthenticated session;
  final String checkInId;
}

final class CompanionCheckInPage {
  const CompanionCheckInPage({required this.build});
  final Widget Function(
    BuildContext context, {
    required String checkInId,
    required VoidCallback onBack,
    required VoidCallback onOpenSettings,
  })
  build;
}

final companionCheckInPageProvider = Provider<CompanionCheckInPage?>(
  (ref) => null,
);
