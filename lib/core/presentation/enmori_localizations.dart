import 'package:flutter/widgets.dart';

/// Shared presentation lookup. Call only for application-owned interface copy;
/// user content, provider records and model replies retain their original text.
extension EnmoriTranslations on BuildContext {
  bool get usesChinese => Localizations.maybeLocaleOf(this)?.languageCode == 'zh';

  String tr(String english, String chinese) => usesChinese ? chinese : english;
}
