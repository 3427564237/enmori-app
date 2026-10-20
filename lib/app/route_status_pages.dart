import 'package:flutter/material.dart';

import '../core/presentation/status_panel.dart';

final class StartupPage extends StatelessWidget {
  const StartupPage({super.key});

  @override
  Widget build(BuildContext context) => const _StatusPage(
    routeKey: Key('route-startup'),
    panel: StatusPanel(
      title: 'Opening ENMORI',
      body: 'Checking your session. Please wait.',
      icon: Icons.hourglass_top,
      loading: true,
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
      title: 'Service unavailable',
      body: 'This service is temporarily unavailable. Try again.',
      icon: Icons.cloud_off_outlined,
      isError: true,
      action: FilledButton.icon(
        key: const Key('startup-retry'),
        onPressed: onRetry,
        icon: const Icon(Icons.refresh),
        label: const Text('Retry'),
      ),
    ),
  );
}

final class ConfigurationUnavailablePage extends StatelessWidget {
  const ConfigurationUnavailablePage({super.key});

  @override
  Widget build(BuildContext context) => const _StatusPage(
    routeKey: Key('route-configuration-unavailable'),
    panel: StatusPanel(
      title: 'Setup unavailable',
      body: 'The required service configuration is unavailable.',
      icon: Icons.settings_outlined,
    ),
  );
}

final class AccountUnavailablePage extends StatelessWidget {
  const AccountUnavailablePage({super.key});

  @override
  Widget build(BuildContext context) => const _StatusPage(
    routeKey: Key('route-account-unavailable'),
    panel: StatusPanel(
      title: 'Account unavailable',
      body: 'This account cannot continue.',
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
