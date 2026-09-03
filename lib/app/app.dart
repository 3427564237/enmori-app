import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router/app_router.dart';

final class EnmoriApp extends ConsumerWidget {
  const EnmoriApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'ENMORI',
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
