import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../admin_interest_providers.dart';
import '../domain/admin_interest_repository.dart';
import '../domain/interest_repository.dart';

enum AdminInterestPhase {
  initial,
  loading,
  ready,
  creating,
  updating,
  checking,
  denied,
}

final class AdminInterestState {
  const AdminInterestState({
    this.phase = AdminInterestPhase.initial,
    this.tags = const [],
    this.hasLoaded = false,
    this.draft = '',
    this.failure,
    this.validationMessage,
    this.notice,
    this.needsReadback = false,
    this.acknowledged,
    this.confirmed,
    this.managedTags = const [],
    this.managementEnabled = false,
    this.permanentDeletionAvailable = false,
    this.editTarget,
    this.renameDraft = '',
    this.changeAcknowledged,
    this.deleteAcknowledged,
  });

  final AdminInterestPhase phase;
  final List<InterestTagOption> tags;
  final bool hasLoaded;
  final String draft;
  final AppFailure? failure;
  final String? validationMessage;
  final String? notice;
  final bool needsReadback;
  final CreatedInterestTag? acknowledged;
  final CreatedInterestTag? confirmed;
  final List<ManagedInterestTag> managedTags;
  final bool managementEnabled, permanentDeletionAvailable;
  final ManagedInterestTag? editTarget, changeAcknowledged;
  final String renameDraft;
  final String? deleteAcknowledged;

  bool get busy =>
      phase == AdminInterestPhase.loading ||
      phase == AdminInterestPhase.creating ||
      phase == AdminInterestPhase.updating ||
      phase == AdminInterestPhase.checking;
  bool get dirty =>
      draft.isNotEmpty ||
      editTarget != null && renameDraft != editTarget!.displayName;

  AdminInterestState copyWith({
    AdminInterestPhase? phase,
    List<InterestTagOption>? tags,
    bool? hasLoaded,
    String? draft,
    AppFailure? failure,
    String? validationMessage,
    String? notice,
    bool? needsReadback,
    CreatedInterestTag? acknowledged,
    CreatedInterestTag? confirmed,
    bool clearFeedback = false,
    bool clearAcknowledged = false,
    List<ManagedInterestTag>? managedTags,
    bool? managementEnabled,
    bool? permanentDeletionAvailable,
    ManagedInterestTag? editTarget,
    String? renameDraft,
    ManagedInterestTag? changeAcknowledged,
    String? deleteAcknowledged,
    bool clearEdit = false,
    bool clearChangeAcknowledged = false,
  }) => AdminInterestState(
    phase: phase ?? this.phase,
    tags: tags ?? this.tags,
    hasLoaded: hasLoaded ?? this.hasLoaded,
    draft: draft ?? this.draft,
    failure: clearFeedback ? failure : failure ?? this.failure,
    validationMessage: clearFeedback
        ? validationMessage
        : validationMessage ?? this.validationMessage,
    notice: clearFeedback ? notice : notice ?? this.notice,
    needsReadback: needsReadback ?? this.needsReadback,
    acknowledged: clearAcknowledged ? null : acknowledged ?? this.acknowledged,
    confirmed: clearFeedback ? confirmed : confirmed ?? this.confirmed,
    managedTags: managedTags ?? this.managedTags,
    managementEnabled: managementEnabled ?? this.managementEnabled,
    permanentDeletionAvailable:
        permanentDeletionAvailable ?? this.permanentDeletionAvailable,
    editTarget: clearEdit ? null : editTarget ?? this.editTarget,
    renameDraft: clearEdit ? '' : renameDraft ?? this.renameDraft,
    changeAcknowledged: clearChangeAcknowledged
        ? null
        : changeAcknowledged ?? this.changeAcknowledged,
    deleteAcknowledged: clearChangeAcknowledged
        ? null
        : deleteAcknowledged ?? this.deleteAcknowledged,
  );
}

final adminInterestControllerProvider =
    NotifierProvider.autoDispose<AdminInterestController, AdminInterestState>(
      AdminInterestController.new,
    );

final class AdminInterestController extends Notifier<AdminInterestState> {
  late AdminInterestRepository _repository;
  late AdminInterestCapabilityController _capability;
  AuthSessionAuthenticated? _session;
  int _operation = 0;

  @override
  AdminInterestState build() {
    _repository = ref.watch(adminInterestRepositoryProvider);
    _capability = ref.watch(adminInterestCapabilityProvider.notifier);
    _session = ref.watch(
      authSessionProvider.select(
        (value) => switch (value.asData?.value) {
          final AuthSessionAuthenticated session => session,
          _ => null,
        },
      ),
    );
    _operation++;
    ref.onDispose(() => _operation++);
    ref.listen(adminInterestCapabilityProvider, (_, next) {
      if (next.asData?.value == false &&
          state.phase != AdminInterestPhase.initial) {
        _operation++;
        state = state.copyWith(
          phase: AdminInterestPhase.denied,
          tags: const [],
          managedTags: const [],
          hasLoaded: false,
          managementEnabled: false,
          permanentDeletionAvailable: false,
          clearAcknowledged: true,
          clearChangeAcknowledged: true,
          notice: 'Admin access is not available for this session.',
          clearFeedback: true,
        );
      }
    });
    return const AdminInterestState();
  }

  bool _sameSession(AuthSessionAuthenticated? session) =>
      ref.mounted &&
      session != null &&
      identical(_session, session) &&
      identical(ref.read(authSessionProvider).asData?.value, session);

  bool _current(AuthSessionAuthenticated session, int operation) =>
      _sameSession(session) && operation == _operation;

  void editDraft(String value, {required AuthSessionAuthenticated? session}) {
    if (!_sameSession(session) ||
        state.busy ||
        state.needsReadback ||
        state.phase == AdminInterestPhase.denied) {
      return;
    }
    state = state.copyWith(draft: value, clearFeedback: true);
  }

  Future<void> load({required AuthSessionAuthenticated? session}) async {
    if (!_sameSession(session) || state.busy) return;
    final activeSession = session!;
    final operation = ++_operation;
    state = state.copyWith(
      phase: state.needsReadback
          ? AdminInterestPhase.checking
          : AdminInterestPhase.loading,
      clearFeedback: true,
    );
    final allowed = await _capability.refresh();
    if (!_current(activeSession, operation)) return;
    if (!allowed) {
      // A transient capability read failure must not masquerade as non-Admin.
      final capability = ref.read(adminInterestCapabilityProvider);
      final error = capability.error;
      state = state.copyWith(
        phase: capability.hasError
            ? AdminInterestPhase.ready
            : AdminInterestPhase.denied,
        failure: error is AppFailure ? error : null,
        notice: capability.hasError
            ? 'Admin access could not be checked. Reload to try again.'
            : 'Admin access is not available for this session.',
        clearFeedback: true,
      );
      return;
    }
    await _readCatalogue(activeSession, operation);
  }

  Future<void> create({
    required AuthSessionAuthenticated? session,
    required AdminInterestState expected,
  }) async {
    if (!_sameSession(session) ||
        !identical(state, expected) ||
        state.busy ||
        state.needsReadback ||
        state.editTarget != null ||
        !state.hasLoaded ||
        state.phase == AdminInterestPhase.denied ||
        !_capability.confirmedFor(session)) {
      return;
    }
    final validation = adminInterestNameError(state.draft);
    if (validation != null) {
      state = state.copyWith(
        validationMessage: validation,
        clearFeedback: true,
      );
      return;
    }
    final activeSession = session!;
    final operation = ++_operation;
    final submitted = state.draft;
    state = state.copyWith(
      phase: AdminInterestPhase.creating,
      clearFeedback: true,
    );
    final result = await _repository.create(
      displayName: submitted,
      current: () =>
          _current(activeSession, operation) &&
          _capability.confirmedFor(activeSession),
    );
    if (!_current(activeSession, operation)) return;
    switch (result) {
      case Success<CreatedInterestTag>(:final value):
        state = state.copyWith(
          phase: AdminInterestPhase.checking,
          needsReadback: true,
          acknowledged: value,
        );
        await _readCatalogue(activeSession, operation);
      case Failure<CreatedInterestTag>(:final failure):
        if (_isDenied(failure)) {
          _deny(failure);
          return;
        }
        final knownRejection = switch (failure.kind) {
          AppFailureKind.catalogueNameConflict ||
          AppFailureKind.catalogueInvalid ||
          AppFailureKind.requestInvalid ||
          AppFailureKind.configurationUnavailable => true,
          _ => false,
        };
        state = state.copyWith(
          phase: AdminInterestPhase.ready,
          failure: failure,
          needsReadback: !knownRejection,
          validationMessage: failure.kind == AppFailureKind.catalogueInvalid
              ? 'Use a name of 1–50 characters without control or direction characters.'
              : null,
          notice: knownRejection ? null : 'The create result is unknown. Reload the catalogue before trying again.',
          clearFeedback: true,
        );
    }
  }

  bool _canManage(
    AuthSessionAuthenticated? session,
    AdminInterestState expected,
    ManagedInterestTag tag,
  ) =>
      _sameSession(session) &&
      identical(state, expected) &&
      !state.busy &&
      !state.needsReadback &&
      state.managementEnabled &&
      state.phase != AdminInterestPhase.denied &&
      _capability.confirmedFor(session) &&
      state.managedTags.any((item) => item.sameVersion(tag));

  void beginRename(
    ManagedInterestTag tag, {
    required AuthSessionAuthenticated? session,
    required AdminInterestState expected,
  }) {
    if (!_canManage(session, expected, tag)) return;
    state = state.copyWith(
      editTarget: tag,
      renameDraft: tag.displayName,
      clearFeedback: true,
    );
  }

  void editRename(String value, {required AuthSessionAuthenticated? session}) {
    if (!_sameSession(session) ||
        state.editTarget == null ||
        state.busy ||
        state.needsReadback ||
        state.phase == AdminInterestPhase.denied) {
      return;
    }
    state = state.copyWith(renameDraft: value, clearFeedback: true);
  }

  void cancelRename({required AuthSessionAuthenticated? session}) {
    if (!_sameSession(session) || state.busy || state.needsReadback) return;
    state = state.copyWith(clearEdit: true, clearFeedback: true);
  }

  Future<void> rename({
    required AuthSessionAuthenticated? session,
    required AdminInterestState expected,
  }) async {
    final tag = state.editTarget;
    if (tag == null || !_canManage(session, expected, tag)) return;
    final error = adminInterestNameError(state.renameDraft);
    if (error != null) {
      state = state.copyWith(validationMessage: error, clearFeedback: true);
      return;
    }
    await _change(tag, session!, displayName: state.renameDraft);
  }

  Future<void> changeLifecycle(
    ManagedInterestTag tag,
    InterestLifecycleState lifecycle, {
    required AuthSessionAuthenticated? session,
    required AdminInterestState expected,
  }) async {
    if (!_canManage(session, expected, tag) || state.editTarget != null) return;
    await _change(tag, session!, lifecycle: lifecycle);
  }

  Future<void> delete(
    ManagedInterestTag tag, {
    required AuthSessionAuthenticated? session,
    required AdminInterestState expected,
  }) async {
    if (!_canManage(session, expected, tag) ||
        !state.permanentDeletionAvailable ||
        tag.lifecycleState != InterestLifecycleState.inactive ||
        state.editTarget != null) {
      return;
    }
    await _change(tag, session!, deleting: true);
  }

  Future<void> _change(
    ManagedInterestTag tag,
    AuthSessionAuthenticated session, {
    String? displayName,
    InterestLifecycleState? lifecycle,
    bool deleting = false,
  }) async {
    final repository = _repository;
    if (repository is! AdminInterestManagementRepository) return;
    final operation = ++_operation;
    state = state.copyWith(
      phase: AdminInterestPhase.updating,
      clearFeedback: true,
    );
    bool current() =>
        _current(session, operation) && _capability.confirmedFor(session);
    final Result<Object?> result = deleting
        ? await repository.delete(expected: tag, current: current)
        : displayName != null
        ? await repository.rename(
            expected: tag,
            displayName: displayName,
            current: current,
          )
        : await repository.changeLifecycle(
            expected: tag,
            lifecycleState: lifecycle!,
            current: current,
          );
    if (!_current(session, operation)) return;
    if (result case Success<Object?>(:final value)) {
      state = state.copyWith(
        phase: AdminInterestPhase.checking,
        needsReadback: true,
        changeAcknowledged: value is ManagedInterestTag ? value : null,
        deleteAcknowledged: deleting ? tag.interestTagId : null,
      );
      await _readCatalogue(session, operation);
      return;
    }
    final failure = (result as Failure<Object?>).failure;
    if (_isDenied(failure)) {
      _deny(failure);
      return;
    }
    final stale =
        failure.kind == AppFailureKind.catalogueRevisionPreconditionFailed ||
        failure.kind == AppFailureKind.catalogueNotFound;
    final rejected = switch (failure.kind) {
      AppFailureKind.catalogueNameConflict ||
      AppFailureKind.catalogueInvalid ||
      AppFailureKind.catalogueReferenced ||
      AppFailureKind.catalogueStateConflict ||
      AppFailureKind.catalogueRevisionPreconditionFailed ||
      AppFailureKind.catalogueNotFound ||
      AppFailureKind.requestInvalid ||
      AppFailureKind.configurationUnavailable => true,
      _ => false,
    };
    state = state.copyWith(
      phase: stale ? AdminInterestPhase.checking : AdminInterestPhase.ready,
      failure: failure,
      needsReadback: stale || !rejected,
      notice: !rejected
          ? 'The change result is unknown. Reload the catalogue before trying again.'
          : null,
      clearFeedback: true,
    );
    if (stale) {
      await _readCatalogue(session, operation);
      if (_current(session, operation) &&
          state.phase != AdminInterestPhase.denied) {
        state = state.copyWith(
          failure: failure,
          notice: 'This interest changed. Review the current catalogue before saving again.',
          clearFeedback: true,
        );
      }
    }
  }

  Future<void> _readCatalogue(
    AuthSessionAuthenticated session,
    int operation,
  ) async {
    bool current() =>
        _current(session, operation) && _capability.confirmedFor(session);
    final repository = _repository;
    List<ManagedInterestTag>? managed;
    final Result<List<InterestTagOption>> result;
    if (repository is AdminInterestManagementRepository) {
      final read = await repository.readManagementCatalogue(current: current);
      if (read case Success<List<ManagedInterestTag>>(:final value)) {
        managed = value;
        result = Success(
          value
              .map(
                (tag) => InterestTagOption(
                  interestTagId: tag.interestTagId,
                  displayName: tag.displayName,
                ),
              )
              .toList(),
        );
      } else {
        result = Failure((read as Failure<List<ManagedInterestTag>>).failure);
      }
    } else {
      result = await repository.readCatalogue(current: current);
    }
    if (!_current(session, operation)) return;
    switch (result) {
      case Failure<List<InterestTagOption>>(:final failure):
        if (_isDenied(failure)) {
          _deny(failure);
        } else {
          state = state.copyWith(
            phase: AdminInterestPhase.ready,
            failure: failure,
            clearFeedback: true,
          );
        }
      case Success<List<InterestTagOption>>(:final value):
        if (managed != null) {
          final edit = state.editTarget;
          final updatedEdit = edit == null
              ? null
              : managed
                    .where((tag) => tag.interestTagId == edit.interestTagId)
                    .firstOrNull;
          state = state.copyWith(
            managedTags: List.unmodifiable(managed),
            managementEnabled: true,
            permanentDeletionAvailable:
                (repository as AdminInterestManagementRepository)
                    .permanentDeletionAvailable,
            editTarget: updatedEdit,
          );
        }
        final change = state.changeAcknowledged,
            deletion = state.deleteAcknowledged;
        if (change != null || deletion != null) {
          final confirmed =
              managed != null &&
              (change != null
                  ? managed.any((tag) => tag.sameVersion(change))
                  : managed.every((tag) => tag.interestTagId != deletion));
          state = state.copyWith(
            phase: AdminInterestPhase.ready,
            tags: List.unmodifiable(value),
            hasLoaded: true,
            needsReadback: false,
            clearChangeAcknowledged: true,
            clearEdit: confirmed,
            notice: confirmed
                ? 'The change is confirmed in the current catalogue.'
                : 'The saved change is not confirmed. Review the current catalogue before making another change.',
            clearFeedback: true,
          );
          return;
        }
        final acknowledged = state.acknowledged;
        if (acknowledged != null) {
          final found = value.any(
            (tag) =>
                tag.interestTagId == acknowledged.interestTagId &&
                tag.displayName == acknowledged.displayName,
          );
          state = state.copyWith(
            phase: AdminInterestPhase.ready,
            tags: List.unmodifiable(value),
            hasLoaded: true,
            needsReadback: !found,
            draft: found ? '' : state.draft,
            confirmed: found ? acknowledged : null,
            clearAcknowledged: found,
            notice: found ? 'Interest created and confirmed in the catalogue.' : 'Creation was accepted, but this catalogue does not confirm the saved item yet. Reload to check again.',
            clearFeedback: true,
          );
        } else {
          final wasUnknown = state.needsReadback;
          state = state.copyWith(
            phase: AdminInterestPhase.ready,
            tags: List.unmodifiable(value),
            hasLoaded: true,
            needsReadback: false,
            notice: wasUnknown
                ? 'Catalogue reloaded. Check the list before trying again; the earlier request may have saved.'
                : null,
            clearFeedback: true,
          );
        }
    }
  }

  void _deny(AppFailure failure) {
    _capability.revoke();
    state = state.copyWith(
      phase: AdminInterestPhase.denied,
      tags: const [],
      managedTags: const [],
      hasLoaded: false,
      managementEnabled: false,
      permanentDeletionAvailable: false,
      clearAcknowledged: true,
      clearChangeAcknowledged: true,
      failure: failure,
      clearFeedback: true,
    );
  }
}

bool _isDenied(AppFailure failure) =>
    failure.kind == AppFailureKind.authRequired ||
    failure.kind == AppFailureKind.authForbidden;
