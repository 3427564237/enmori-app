import '../features/account/content_access.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/presentation/enmori_motion.dart';
import '../features/language/language_providers.dart';

import 'router/app_router.dart';
import 'enmori_theme.dart';

final class EnmoriApp extends ConsumerWidget {
  const EnmoriApp({this.environmentLabel, super.key});

  final String? environmentLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'ENMORI',
      locale: Locale(ref.watch(appLanguageProvider).language.code),
      supportedLocales: const [Locale('en'), Locale('zh')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: enmoriTheme(),
      builder: (context, child) => ContentAccessBoundary(
        child: EnmoriMotionPreferences(
          child: environmentLabel == null
              ? child!
              : Column(
                  children: [
                    Material(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      child: SafeArea(
                        bottom: false,
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Text(
                            environmentLabel!,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
                    Expanded(child: child ?? const SizedBox.shrink()),
                  ],
                ),
        ),
      ),
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
