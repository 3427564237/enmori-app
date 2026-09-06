import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router/app_router.dart';

final class EnmoriApp extends ConsumerWidget {
  const EnmoriApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = ColorScheme.fromSeed(seedColor: const Color(0xff1f6f5b));
    return MaterialApp.router(
      title: 'ENMORI',
      theme: ThemeData(
        colorScheme: colorScheme,
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
        ),
        useMaterial3: true,
      ),
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
