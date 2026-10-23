import 'package:flutter/material.dart';

import '../core/presentation/status_panel.dart';
import '../core/presentation/enmori_localizations.dart';

final class StartupPage extends StatelessWidget {
  const StartupPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          key: const Key('route-startup'),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('enmori', style: Theme.of(context).textTheme.headlineLarge),
              const SizedBox(height: 16),
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(height: 16),
              Semantics(
                liveRegion: true,
                child: Text(context.tr('Opening your space…', '正在打开你的空间…')),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

final class UnavailablePage extends StatelessWidget {
  const UnavailablePage({required this.onRetry, super.key});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => _StatusPage(
    routeKey: const Key('route-unavailable'),
    panel: StatusPanel(
      title: context.tr('Service unavailable', '服务暂时不可用'),
      body: context.tr(
        'This service is temporarily unavailable. Try again.',
        '服务暂时不可用，请稍后重试。',
      ),
      icon: Icons.cloud_off_outlined,
      isError: true,
      action: FilledButton.icon(
        key: const Key('startup-retry'),
        onPressed: onRetry,
        icon: const Icon(Icons.refresh),
        label: Text(context.tr('Retry', '重试')),
      ),
    ),
  );
}

final class ConfigurationUnavailablePage extends StatelessWidget {
  const ConfigurationUnavailablePage({super.key});

  @override
  Widget build(BuildContext context) => _StatusPage(
    routeKey: const Key('route-configuration-unavailable'),
    panel: StatusPanel(
      title: context.tr('Setup unavailable', '配置暂不可用'),
      body: context.tr(
        'The required service configuration is unavailable.',
        '所需服务配置暂不可用。',
      ),
      icon: Icons.settings_outlined,
    ),
  );
}

final class AccountUnavailablePage extends StatelessWidget {
  const AccountUnavailablePage({super.key});

  @override
  Widget build(BuildContext context) => _StatusPage(
    routeKey: const Key('route-account-unavailable'),
    panel: StatusPanel(
      title: context.tr('Account unavailable', '账号暂不可用'),
      body: context.tr('This account cannot continue.', '此账号暂时无法继续使用。'),
      icon: Icons.person_off_outlined,
      isError: true,
    ),
  );
}

final class _StatusPage extends StatelessWidget {
  const _StatusPage({required this.routeKey, required this.panel});

  final Key routeKey;
  final Widget panel;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('ENMORI')),
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: ListView(
            key: routeKey,
            padding: const EdgeInsets.all(24),
            shrinkWrap: true,
            children: [panel],
          ),
        ),
      ),
    ),
  );
}
