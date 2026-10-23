import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';
import '../auth/domain/auth_repository.dart';

/// A local invalidation receipt, never authorization or a success receipt.
/// Contains no record, account identifier, coordinates or cached product data.
final class ContentAccess {
  const ContentAccess(this.revision, {required this.foreground});
  final int revision;
  final bool foreground;
}

final contentAccessProvider =
    NotifierProvider<ContentAccessController, ContentAccess>(
      ContentAccessController.new,
    );

final class ContentAccessController extends Notifier<ContentAccess> {
  int _revision = 0;
  bool _foreground = true;
  @override
  ContentAccess build() {
    // Initial loading -> signed out is not a revocation. Same UID with a
    // replacement authenticated session, sign-out or loss is new authority.
    ref.listen(
      authSessionProvider.select(
        (value) => value.asData?.value is AuthSessionAuthenticated
            ? value.asData?.value
            : null,
      ),
      (before, after) {
        if (!identical(before, after)) changed();
      },
    );
    return ContentAccess(++_revision, foreground: _foreground);
  }

  void changed() => state = ContentAccess(++_revision, foreground: _foreground);

  void mutationSettled(Object? session) {
    if (ref.mounted &&
        identical(session, ref.read(authSessionProvider).asData?.value)) {
      changed();
    }
  }

  void setForeground(bool value) {
    if (_foreground == value) return;
    _foreground = value;
    changed();
  }
}

/// Even a failed/unknown write requires a fresh read, never optimistic deletion.
/// An old session's completion cannot invalidate or populate the new session.
Future<T> afterContentMutation<T>(Ref ref, Future<T> Function() command) async {
  final session = ref.read(authSessionProvider).asData?.value;
  // Subscribe/create before the command can finish or its initiating view leave.
  final changes = ref.read(contentAccessProvider.notifier);
  try {
    return await command();
  } finally {
    changes.mutationSettled(session);
  }
}

/// One app-level hook also retires covered routes; no polling or background reads.
final class ContentAccessBoundary extends ConsumerStatefulWidget {
  const ContentAccessBoundary({required this.child, super.key});
  final Widget child;
  @override
  ConsumerState<ContentAccessBoundary> createState() =>
      _ContentAccessBoundaryState();
}

final class _ContentAccessBoundaryState
    extends ConsumerState<ContentAccessBoundary>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    if (lifecycle != null && lifecycle != AppLifecycleState.resumed) {
      Future.microtask(() {
        if (mounted) {
          ref.read(contentAccessProvider.notifier).setForeground(false);
        }
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    ref
        .read(contentAccessProvider.notifier)
        .setForeground(state == AppLifecycleState.resumed);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(contentAccessProvider);
    return widget.child;
  }
}
