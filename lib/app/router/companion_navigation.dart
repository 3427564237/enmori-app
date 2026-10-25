import 'package:flutter_riverpod/flutter_riverpod.dart';

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
