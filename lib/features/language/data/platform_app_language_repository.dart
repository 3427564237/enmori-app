import 'package:flutter/services.dart';

import '../../../core/result/result.dart';
import '../domain/app_language_repository.dart';

final class PlatformAppLanguageRepository implements AppLanguageRepository {
  const PlatformAppLanguageRepository();
  static const channel = MethodChannel('com.enmori.app/preferences');
  static const _unavailable = AppFailure(
    kind: AppFailureKind.serviceUnavailable,
    message: 'The saved device language could not be confirmed.',
  );

  @override
  Future<Result<AppLanguage>> read() async {
    try {
      final code = await channel.invokeMethod<String>('readLanguage');
      return switch (code) {
        null || 'en' => const Success(AppLanguage.english),
        'zh' => const Success(AppLanguage.chinese),
        _ => const Failure(_unavailable),
      };
    } catch (_) {
      return const Failure(_unavailable);
    }
  }

  @override
  Future<Result<AppLanguage>> save(AppLanguage language) async {
    try {
      final written = await channel.invokeMethod<bool>('writeLanguage', {
        'language': language.code,
      });
      if (written != true) return const Failure(_unavailable);
      final observed = await read();
      return observed is Success<AppLanguage> && observed.value == language
          ? observed
          : const Failure(_unavailable);
    } catch (_) {
      return const Failure(_unavailable);
    }
  }
}
