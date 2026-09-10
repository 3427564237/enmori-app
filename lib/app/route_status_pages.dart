import 'package:flutter/material.dart';

final class StartupPage extends StatelessWidget {
  const StartupPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Center(
          key: Key('route-startup'),
          child: CircularProgressIndicator(),
        ),
      ),
    );
  }
}

final class UnavailablePage extends StatelessWidget {
  const UnavailablePage({required this.onRetry, super.key});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ENMORI')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              key: const Key('route-unavailable'),
              padding: const EdgeInsets.all(24),
              shrinkWrap: true,
              children: [
                const Icon(Icons.cloud_off, size: 40),
                const SizedBox(height: 16),
                const Text('Service unavailable'),
                const SizedBox(height: 8),
                const Text(
                  'This service is temporarily unavailable. Try again.',
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  key: const Key('startup-retry'),
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

final class ConfigurationUnavailablePage extends StatelessWidget {
  const ConfigurationUnavailablePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ENMORI')),
      body: const SafeArea(
        child: Center(
          key: Key('route-configuration-unavailable'),
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('The required service configuration is unavailable.'),
          ),
        ),
      ),
    );
  }
}

final class AccountUnavailablePage extends StatelessWidget {
  const AccountUnavailablePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ENMORI')),
      body: const SafeArea(
        child: Center(
          key: Key('route-account-unavailable'),
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('This account cannot continue.'),
          ),
        ),
      ),
    );
  }
}
