import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/backend_api_client.dart';
import '../features/account/account_providers.dart';
import '../features/account/data/backend_account_repository.dart';
import '../features/auth/auth_providers.dart';
import '../features/auth/domain/auth_repository.dart';
import '../features/check_in/check_in_providers.dart';
import '../features/check_in/data/backend_check_in_repository.dart';
import '../features/check_in/history_device_port.dart';
import '../features/check_in/presentation/check_in_history_page.dart';
import 'app.dart';
import 'providers.dart';
import 'router/isolated_history_ai_pages.dart';

/// Explicit isolated harness composition; never used by ordinary bootstrap.
/// The harness owns its guarded synthetic Auth/Backend setup and teardown.
/// No synthetic AI transport or default credentials are supplied here.
final class IsolatedHistoryHomeApp extends StatelessWidget {
  const IsolatedHistoryHomeApp({
    required this.auth,
    required this.client,
    this.device,
    super.key,
  });

  final AuthRepository auth;
  final BackendApiClient client;
  final HistoryDevicePort? device;

  @override
  Widget build(BuildContext context) => ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      backendBaseUriProvider.overrideWithValue(null),
      backendApiClientProvider.overrideWithValue(client),
      if (device case final controlledDevice?)
        historyDevicePortProvider.overrideWithValue(controlledDevice),
      accountRepositoryProvider.overrideWith(
        (ref) => BackendAccountRepository(ref.watch(backendApiClientProvider)),
      ),
      checkInRepositoryProvider.overrideWith(
        (ref) => BackendCheckInRepository(ref.watch(backendApiClientProvider)),
      ),
      isolatedSlicesEnabledProvider.overrideWithValue(true),
      isolatedHistoryPageProvider.overrideWithValue(
        const IsolatedHistoryPage(build: _buildHistory),
      ),
    ],
    child: const EnmoriApp(),
  );
}

Widget _buildHistory(
  BuildContext context, {
  required VoidCallback onBack,
  required ValueChanged<String> onOpenSavedCheckIn,
}) => buildCheckInHistoryPage(
  context: context,
  onBack: onBack,
  onOpenSavedCheckIn: onOpenSavedCheckIn,
);
