import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/result/result.dart';
import 'data/platform_app_language_repository.dart';
import 'domain/app_language_repository.dart';

final appLanguageRepositoryProvider = Provider<AppLanguageRepository>(
  (ref) => const PlatformAppLanguageRepository(),
);

final appLanguageProvider =
    NotifierProvider<AppLanguageController, AppLanguageState>(
      AppLanguageController.new,
    );

final class AppLanguageState {
  const AppLanguageState({
    this.language = AppLanguage.english,
    this.loading = false,
    this.saving = false,
    this.failed = false,
  });
  final AppLanguage language;
  final bool loading, saving, failed;
  bool get busy => loading || saving;
}

final class AppLanguageController extends Notifier<AppLanguageState> {
  late AppLanguageRepository _repository;
  int _operation = 0;

  @override
  AppLanguageState build() {
    _repository = ref.watch(appLanguageRepositoryProvider);
    final operation = ++_operation;
    ref.onDispose(() => _operation++);
    scheduleMicrotask(() {
      if (ref.mounted && operation == _operation) unawaited(reload());
    });
    return const AppLanguageState(loading: true);
  }

  Future<void> reload() async {
    if (state.saving) return;
    final previous = state.language;
    final operation = ++_operation;
    state = AppLanguageState(language: previous, loading: true);
    Result<AppLanguage> result;
    try {
      result = await _repository.read();
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Device language unavailable.',
        ),
      );
    }
    if (!ref.mounted || operation != _operation) return;
    state = AppLanguageState(
      language: result is Success<AppLanguage> ? result.value : previous,
      failed: result is Failure<AppLanguage>,
    );
  }

  Future<void> select(AppLanguage language) async {
    if (state.busy || state.failed || language == state.language) return;
    final previous = state.language;
    final operation = ++_operation;
    state = AppLanguageState(language: previous, saving: true);
    Result<AppLanguage> result;
    try {
      result = await _repository.save(language);
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Device language save unconfirmed.',
        ),
      );
    }
    if (!ref.mounted || operation != _operation) return;
    state = AppLanguageState(
      language: result is Success<AppLanguage> ? result.value : previous,
      failed: result is Failure<AppLanguage>,
    );
  }
}
