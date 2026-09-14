import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/interest_repository.dart';
import '../interests_providers.dart';

enum InterestEditorPhase {
  initial,
  loading,
  ready,
  saving,
  saved,
  failed,
  conflict,
}

final class InterestEditorOption {
  const InterestEditorOption({
    required this.interestTagId,
    required this.displayName,
    required this.lifecycleState,
    required this.isSelected,
  });

  final String interestTagId;
  final String displayName;
  final InterestLifecycleState lifecycleState;
  final bool isSelected;

  bool get canSelect => lifecycleState == InterestLifecycleState.active;

  InterestEditorOption copyWith({required bool isSelected}) =>
      InterestEditorOption(
        interestTagId: interestTagId,
        displayName: displayName,
        lifecycleState: lifecycleState,
        isSelected: isSelected,
      );
}

final class InterestEditorState {
  const InterestEditorState({
    this.phase = InterestEditorPhase.initial,
    this.options = const [],
    this.revision = 0,
    this.hasLoaded = false,
    this.failure,
    this.validationMessage,
    this.savedSelection,
  });

  final InterestEditorPhase phase;
  final List<InterestEditorOption> options;
  final int revision;
  final bool hasLoaded;
  final AppFailure? failure;
  final String? validationMessage;
  final InterestSelection? savedSelection;

  int get selectedCount => options.where((option) => option.isSelected).length;

  InterestEditorState copyWith({
    InterestEditorPhase? phase,
    List<InterestEditorOption>? options,
    int? revision,
    bool? hasLoaded,
    AppFailure? failure,
    bool clearFailure = false,
    String? validationMessage,
    bool clearValidationMessage = false,
    InterestSelection? savedSelection,
    bool clearSavedSelection = false,
  }) => InterestEditorState(
    phase: phase ?? this.phase,
    options: options ?? this.options,
    revision: revision ?? this.revision,
    hasLoaded: hasLoaded ?? this.hasLoaded,
    failure: clearFailure ? null : failure ?? this.failure,
    validationMessage: clearValidationMessage
        ? null
        : validationMessage ?? this.validationMessage,
    savedSelection: clearSavedSelection
        ? null
        : savedSelection ?? this.savedSelection,
  );
}

final interestEditorControllerProvider =
    NotifierProvider<InterestEditorController, InterestEditorState>(
      InterestEditorController.new,
    );

final class InterestEditorController extends Notifier<InterestEditorState> {
  int _operation = 0;
  late InterestRepository _repository;
  String? _authSubject;

  @override
  InterestEditorState build() {
    _repository = ref.watch(interestRepositoryProvider);
    final authSubject = ref.watch(currentAuthSubjectProvider);
    if (_authSubject != authSubject) _operation++;
    _authSubject = authSubject;
    return const InterestEditorState();
  }

  Future<void> load() async {
    final operation = ++_operation;
    state = const InterestEditorState(phase: InterestEditorPhase.loading);
    final catalogueFuture = _repository.readSelectableTags();
    final ownFuture = _repository.readOwn();
    final catalogue = await catalogueFuture;
    final own = await ownFuture;
    if (operation != _operation) return;

    if (catalogue case Failure<List<InterestTagOption>>(:final failure)) {
      state = InterestEditorState(
        phase: InterestEditorPhase.failed,
        failure: failure,
      );
      return;
    }
    if (own case Failure<InterestSelection>(:final failure)) {
      state = InterestEditorState(
        phase: InterestEditorPhase.failed,
        failure: failure,
      );
      return;
    }
    final catalogueValue =
        (catalogue as Success<List<InterestTagOption>>).value;
    final ownValue = (own as Success<InterestSelection>).value;
    state = InterestEditorState(
      phase: InterestEditorPhase.ready,
      options: _merge(catalogueValue, ownValue),
      revision: ownValue.revision,
      hasLoaded: true,
    );
  }

  void toggle(String interestTagId) {
    if (!state.hasLoaded ||
        state.phase == InterestEditorPhase.saving ||
        state.phase == InterestEditorPhase.conflict) {
      return;
    }
    final index = state.options.indexWhere(
      (option) => option.interestTagId == interestTagId,
    );
    if (index < 0) return;
    final option = state.options[index];
    if (!option.isSelected && !option.canSelect) return;
    if (!option.isSelected && state.selectedCount >= 10) {
      state = state.copyWith(
        phase: InterestEditorPhase.ready,
        validationMessage: 'Choose no more than 10 interests.',
        clearFailure: true,
        clearSavedSelection: true,
      );
      return;
    }
    final options = [...state.options];
    options[index] = option.copyWith(isSelected: !option.isSelected);
    state = state.copyWith(
      phase: InterestEditorPhase.ready,
      options: options,
      clearFailure: true,
      clearValidationMessage: true,
      clearSavedSelection: true,
    );
  }

  void clear() {
    if (!state.hasLoaded ||
        state.phase == InterestEditorPhase.saving ||
        state.phase == InterestEditorPhase.conflict) {
      return;
    }
    state = state.copyWith(
      phase: InterestEditorPhase.ready,
      options: [
        for (final option in state.options) option.copyWith(isSelected: false),
      ],
      clearFailure: true,
      clearValidationMessage: true,
      clearSavedSelection: true,
    );
  }

  Future<void> save() async {
    if (!state.hasLoaded ||
        state.phase == InterestEditorPhase.saving ||
        state.phase == InterestEditorPhase.conflict) {
      return;
    }
    final selectedIds = [
      for (final option in state.options)
        if (option.isSelected) option.interestTagId,
    ];
    final operation = ++_operation;
    state = state.copyWith(
      phase: InterestEditorPhase.saving,
      clearFailure: true,
      clearValidationMessage: true,
      clearSavedSelection: true,
    );
    final result = await _repository.replaceOwn(
      interestTagIds: selectedIds,
      expectedRevision: state.revision,
    );
    if (operation != _operation) return;
    switch (result) {
      case Success<InterestSelection>(:final value):
        state = InterestEditorState(
          phase: InterestEditorPhase.saved,
          options: _merge([
            for (final option in state.options)
              if (option.lifecycleState == InterestLifecycleState.active)
                InterestTagOption(
                  interestTagId: option.interestTagId,
                  displayName: option.displayName,
                ),
          ], value),
          revision: value.revision,
          hasLoaded: true,
          savedSelection: value,
        );
      case Failure<InterestSelection>(:final failure):
        state = state.copyWith(
          phase:
              failure.kind == AppFailureKind.interestRevisionPreconditionFailed
              ? InterestEditorPhase.conflict
              : InterestEditorPhase.failed,
          failure: failure,
        );
    }
  }

  void abandon({bool resetState = true}) {
    _operation++;
    if (resetState) state = const InterestEditorState();
  }

  List<InterestEditorOption> _merge(
    List<InterestTagOption> catalogue,
    InterestSelection own,
  ) {
    final selectedById = {
      for (final tag in own.interestTags) tag.interestTagId: tag,
    };
    final options = <InterestEditorOption>[
      for (final tag in catalogue)
        InterestEditorOption(
          interestTagId: tag.interestTagId,
          displayName:
              selectedById[tag.interestTagId]?.displayName ?? tag.displayName,
          lifecycleState:
              selectedById[tag.interestTagId]?.lifecycleState ??
              InterestLifecycleState.active,
          isSelected: selectedById.containsKey(tag.interestTagId),
        ),
    ];
    final catalogueIds = catalogue.map((tag) => tag.interestTagId).toSet();
    for (final tag in own.interestTags) {
      if (catalogueIds.contains(tag.interestTagId)) continue;
      options.add(
        InterestEditorOption(
          interestTagId: tag.interestTagId,
          displayName: tag.displayName,
          lifecycleState: tag.lifecycleState,
          isSelected: true,
        ),
      );
    }
    return options;
  }
}
