import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../admin_interest_providers.dart';
import '../domain/interest_repository.dart';
import 'admin_interest_controller.dart';

final class AdminInterestCataloguePage extends ConsumerWidget {
  const AdminInterestCataloguePage({
    required this.onBack,
    this.onCreated,
    super.key,
  });

  final VoidCallback onBack;
  final ValueChanged<InterestTagOption>? onCreated;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = switch (ref.watch(authSessionProvider).asData?.value) {
      final AuthSessionAuthenticated value => value,
      _ => null,
    };
    return _CatalogueEditor(
      key: ValueKey(session),
      session: session,
      onBack: onBack,
      onCreated: onCreated,
    );
  }
}

final class _CatalogueEditor extends ConsumerStatefulWidget {
  const _CatalogueEditor({
    required this.session,
    required this.onBack,
    required this.onCreated,
    super.key,
  });
  final AuthSessionAuthenticated? session;
  final VoidCallback onBack;
  final ValueChanged<InterestTagOption>? onCreated;

  @override
  ConsumerState<_CatalogueEditor> createState() => _CatalogueEditorState();
}

final class _CatalogueEditorState extends ConsumerState<_CatalogueEditor> {
  final _name = TextEditingController();
  final _nameFocus = FocusNode();
  DialogRoute<bool>? _exitDialog;
  bool _leaving = false;
  bool _allowPop = false;

  bool get _currentSession =>
      mounted &&
      widget.session != null &&
      identical(ref.read(authSessionProvider).asData?.value, widget.session);

  @override
  void initState() {
    super.initState();
    ref.listenManual(adminInterestControllerProvider, (previous, next) {
      if (!_currentSession) return;
      if (previous?.confirmed == next.confirmed || next.confirmed == null) {
        return;
      }
      final confirmed = next.confirmed!;
      // The verified readback is the only path that clears an entered draft.
      _name.clear();
      widget.onCreated?.call(
        InterestTagOption(
          interestTagId: confirmed.interestTagId,
          displayName: confirmed.displayName,
        ),
      );
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        unawaited(
          ref
              .read(adminInterestControllerProvider.notifier)
              .load(session: widget.session),
        );
      }
    });
  }

  @override
  void dispose() {
    final dialog = _exitDialog;
    if (dialog != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        dialog.navigator?.removeRoute(dialog);
      });
    }
    _name.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminInterestControllerProvider);
    final capability = ref.watch(adminInterestCapabilityProvider);
    final allowed = capability.asData?.value == true;
    final editable =
        _currentSession &&
        allowed &&
        !state.busy &&
        !state.needsReadback &&
        state.phase != AdminInterestPhase.denied;
    return PopScope(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_back());
      },
      child: Scaffold(
        key: const Key('admin-interest-page'),
        appBar: AppBar(
          leading: BackButton(onPressed: _back),
          title: const Text('Interest catalogue'),
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text(
                    'Add an interest',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Create one catalogue item at a time. Existing interests keep their IDs.',
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    key: const Key('admin-interest-name'),
                    controller: _name,
                    focusNode: _nameFocus,
                    enabled: editable,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText: 'Interest name',
                      helperText: 'Required. Use 1–50 characters.',
                      helperMaxLines: 3,
                      errorText: state.validationMessage,
                      errorMaxLines: 4,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (value) => ref
                        .read(adminInterestControllerProvider.notifier)
                        .editDraft(value, session: widget.session),
                    onSubmitted: editable && state.hasLoaded
                        ? (_) =>
                              _create(ref.read(adminInterestControllerProvider))
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      FilledButton.icon(
                        key: const Key('admin-interest-create'),
                        onPressed: editable && state.hasLoaded
                            ? () => _create(state)
                            : null,
                        icon: const Icon(Icons.add),
                        label: Text(
                          state.phase == AdminInterestPhase.creating
                              ? 'Creating…'
                              : 'Create interest',
                        ),
                      ),
                      OutlinedButton.icon(
                        key: const Key('admin-interest-reload'),
                        onPressed: state.busy || !_currentSession
                            ? null
                            : () => ref
                                  .read(
                                    adminInterestControllerProvider.notifier,
                                  )
                                  .load(session: widget.session),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Reload catalogue'),
                      ),
                    ],
                  ),
                  if (state.busy) ...[
                    const SizedBox(height: 16),
                    const LinearProgressIndicator(),
                    const SizedBox(height: 8),
                    Text(switch (state.phase) {
                      AdminInterestPhase.creating => 'Saving the new interest…',
                      AdminInterestPhase.checking =>
                        'Checking the saved catalogue…',
                      _ => 'Checking access and loading the catalogue…',
                    }),
                  ],
                  if (state.phase == AdminInterestPhase.denied ||
                      widget.session == null) ...[
                    const SizedBox(height: 16),
                    const Text(
                      'Admin access is not available for this session.',
                      key: Key('admin-interest-denied'),
                    ),
                  ],
                  if (state.failure case final failure?) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        _failureCopy(failure.kind),
                        key: const Key('admin-interest-failure'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  ],
                  if (state.notice case final notice?) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        notice,
                        key: const Key('admin-interest-notice'),
                      ),
                    ),
                  ],
                  if (state.confirmed case final tag?) ...[
                    const SizedBox(height: 16),
                    Text(
                      '${tag.displayName}\nID: ${tag.interestTagId}',
                      key: const Key('admin-interest-confirmed'),
                    ),
                  ],
                  const SizedBox(height: 32),
                  Text(
                    'Available interests',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  if (!state.hasLoaded)
                    const Text('The catalogue has not been loaded yet.')
                  else if (state.tags.isEmpty)
                    const Text('No active interests are available.')
                  else
                    for (final tag in state.tags)
                      ListTile(
                        key: Key('admin-interest-tag-${tag.interestTagId}'),
                        contentPadding: EdgeInsets.zero,
                        title: Text(tag.displayName),
                        subtitle: Text('ID: ${tag.interestTagId}'),
                      ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _create(AdminInterestState expected) async {
    if (!_currentSession) return;
    await ref
        .read(adminInterestControllerProvider.notifier)
        .create(session: widget.session, expected: expected);
    if (!_currentSession) return;
    if (ref.read(adminInterestControllerProvider).validationMessage != null) {
      _nameFocus.requestFocus();
    }
  }

  Future<void> _back() async {
    if (_leaving || !mounted) return;
    if (widget.session != null && !_currentSession) return;
    final sessionAtRequest = ref.read(authSessionProvider).asData?.value;
    if (widget.session == null &&
        sessionAtRequest is AuthSessionAuthenticated) {
      return;
    }
    _leaving = true;
    final snapshot = ref.read(adminInterestControllerProvider);
    if (snapshot.dirty || snapshot.busy || snapshot.needsReadback) {
      final dialog = DialogRoute<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Leave interest catalogue?'),
          content: Text(
            snapshot.busy || snapshot.needsReadback
                ? 'The create result may still need checking. Leaving will discard this draft and will not undo a request already sent.'
                : 'Your unsaved interest name will be discarded.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Keep editing'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Leave'),
            ),
          ],
        ),
      );
      _exitDialog = dialog;
      final leave = await Navigator.of(context).push(dialog);
      _exitDialog = null;
      if (!mounted) return;
      if (leave != true || !_currentSession) {
        _leaving = false;
        return;
      }
    }
    if (!mounted) return;
    setState(() => _allowPop = true);
    // Let PopScope observe the accepted exit before app-owned navigation.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          identical(
            ref.read(authSessionProvider).asData?.value,
            sessionAtRequest,
          )) {
        widget.onBack();
      }
    });
  }
}

String _failureCopy(AppFailureKind kind) => switch (kind) {
  AppFailureKind.catalogueNameConflict => 'That interest name already exists, including any inactive entry. Use a different name.',
  AppFailureKind.catalogueInvalid => 'The name is not valid. Use 1–50 characters without control or direction characters.',
  AppFailureKind.authRequired => 'Your session has expired. Sign in again.',
  AppFailureKind.authForbidden =>
    'Admin access was denied. Creating is disabled.',
  AppFailureKind.configurationUnavailable => 'The service is not configured.',
  AppFailureKind.unexpected =>
    'The service returned an invalid response. Reload the catalogue to check.',
  _ => 'The service could not complete this request. Your draft has been kept.',
};
