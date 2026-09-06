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
  const UnavailablePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ENMORI')),
      body: const SafeArea(
        child: Padding(
          key: Key('route-unavailable'),
          padding: EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_off, size: 40),
              SizedBox(height: 16),
              Text('Service unavailable'),
              SizedBox(height: 8),
              Text('The app cannot reach the required service configuration.'),
            ],
          ),
        ),
      ),
    );
  }
}
