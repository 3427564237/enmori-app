import '../../../core/result/result.dart';

enum AppLanguage {
  english('en'),
  chinese('zh');

  const AppLanguage(this.code);
  final String code;
}

/// Device interface preference, independent of account data and consent.
abstract interface class AppLanguageRepository {
  Future<Result<AppLanguage>> read();
  Future<Result<AppLanguage>> save(AppLanguage language);
}
