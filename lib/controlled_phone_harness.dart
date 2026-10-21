import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/platform/external_activity_opener.dart';
import 'app/controlled_demo_app.dart';
import 'core/network/backend_api_client.dart';
import 'core/result/result.dart';
import 'features/account/data/backend_account_preferences_repository.dart';
import 'features/account/presentation/account_preferences_controller.dart';
import 'features/account/presentation/account_preferences_page.dart';
import 'features/auth/data/firebase_auth_repository.dart';
import 'features/auth/domain/auth_repository.dart';
import 'features/auth/auth_providers.dart';
import 'features/event_browse/data/backend_activity_repository.dart';
import 'features/event_browse/presentation/activity_page.dart';
import 'harness/ai_conversation/ai_network_harness_app.dart';
import 'harness/ai_conversation/controlled_phone_service_configuration.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ControlledPhoneHarness(activitiesEnabled: true));
}

/// Caller-owned local handles only. Closing never stops the host service.
final class ControlledPhoneConnection {
  ControlledPhoneConnection({
    required this.auth,
    required this.client,
    required this.release,
  });
  final AuthRepository auth;
  final http.Client client;
  final Future<void> Function() release;
  Future<void>? _closing;

  Future<void> close({bool signOut = true}) => _closing ??= _close(signOut);
  Future<void> _close(bool signOut) async {
    try {
      if (signOut) await auth.signOut();
    } catch (_) {
      // No credentials or SDK exception is published during local teardown.
    } finally {
      client.close();
      try {
        await release();
      } catch (_) {
        // A local Firebase handle is not host service ownership.
      }
    }
  }
}

typedef ControlledPhoneConnectionFactory =
    Future<ControlledPhoneConnection> Function(
      ControlledPhoneServiceConfiguration configuration,
    );

Future<ControlledPhoneConnection> _connect(
  ControlledPhoneServiceConfiguration configuration,
) async {
  final trust = SecurityContext(withTrustedRoots: false)
    ..setTrustedCertificatesBytes(configuration.certificate);
  final firebase = await Firebase.initializeApp(
    name: 'enmori-controlled-phone',
    options: const FirebaseOptions(
      apiKey: 'controlled-emulator-key',
      appId: '1:1234567890:android:controlledphone',
      messagingSenderId: '1234567890',
      projectId: ControlledPhoneServiceConfiguration.projectId,
    ),
  );
  try {
    final firebaseAuth = FirebaseAuth.instanceFor(app: firebase);
    await firebaseAuth.useAuthEmulator(
      '127.0.0.1',
      9099,
      automaticHostMapping: false,
    );
    final auth = FirebaseAuthRepository(firebaseAuth);
    // A cached local session cannot bypass the fresh run-owned handoff.
    final cleared = await auth.signOut();
    if (cleared is Failure<void>) throw StateError('Local Auth unavailable');
    return ControlledPhoneConnection(
      auth: auth,
      client: IOClient(HttpClient(context: trust)),
      release: firebase.delete,
    );
  } catch (_) {
    await firebase.delete();
    rethrow;
  }
}

/// Dedicated debug entrypoint; never composed by ordinary bootstrap.
/// Injection permits local widget tests without Firebase, TLS or device calls.
final class ControlledPhoneHarness extends StatefulWidget {
  const ControlledPhoneHarness({
    this.cacheDirectory,
    this.connectionFactory = _connect,
    this.handoffWait = const Duration(minutes: 5),
    this.activitiesEnabled = false,
    this.integratedDemo = false,
    super.key,
  });
  static const readyFileName = 'enmori-controlled-phone-ready.json';
  final Directory? cacheDirectory;
  final ControlledPhoneConnectionFactory connectionFactory;
  final Duration handoffWait;

  /// Client navigation only. The service's private source gate stays separate.
  final bool activitiesEnabled;
  final bool integratedDemo;
  @override
  State<ControlledPhoneHarness> createState() => _ControlledPhoneHarnessState();
}

final class _ControlledPhoneHarnessState extends State<ControlledPhoneHarness> {
  final _navigator = GlobalKey<NavigatorState>();
  late final Directory _directory =
      widget.cacheDirectory ?? Directory.systemTemp;
  Timer? _timer;
  ControlledPhoneConnection? _connection;
  ControlledPhoneServiceConfiguration? _configuration;
  String? _nonce;
  bool _polling = false;
  bool _failed = false;
  bool _preparing = true;
  int _generation = 0;
  late DateTime _deadline;
  File get _handoff => File(
    '${_directory.path}/${ControlledPhoneServiceConfiguration.cacheFileName}',
  );
  File get _ready =>
      File('${_directory.path}/${ControlledPhoneHarness.readyFileName}');

  @override
  void initState() {
    super.initState();
    unawaited(_waitForHandoff());
  }

  Future<void> _delete(File file) async {
    if (await FileSystemEntity.type(file.path, followLinks: false) !=
        FileSystemEntityType.notFound) {
      await file.delete();
    }
  }

  Future<void> _removeReady(String? nonce) async {
    if (nonce == null || !await _ready.exists()) return;
    final raw = jsonDecode(await _ready.readAsString());
    if (raw is Map && raw['nonce'] == nonce) await _delete(_ready);
  }

  Future<void> _waitForHandoff() async {
    final generation = ++_generation;
    _timer?.cancel();
    _failed = false;
    _preparing = true;
    if (mounted) setState(() {});
    try {
      if (widget.handoffWait <= Duration.zero ||
          widget.handoffWait > const Duration(minutes: 5)) {
        throw StateError('Handoff wait');
      }
      await _delete(_ready);
      await _delete(_handoff);
      final readyTemporary = File('${_ready.path}.tmp');
      await _delete(readyTemporary);
      final random = Random.secure();
      final nonce = List.generate(
        32,
        (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      _nonce = nonce;
      await readyTemporary.writeAsString(
        jsonEncode({'schemaVersion': 1, 'nonce': nonce}),
        flush: true,
      );
      await readyTemporary.rename(_ready.path);
      if (!mounted || generation != _generation) {
        await _removeReady(nonce);
        return;
      }
      _deadline = DateTime.now().add(widget.handoffWait);
      setState(() => _preparing = false);
      _timer = Timer.periodic(
        const Duration(milliseconds: 200),
        (_) => unawaited(_poll(generation, nonce)),
      );
    } catch (_) {
      await _fail(generation);
    }
  }

  Future<void> _poll(int generation, String nonce) async {
    if (_polling || !mounted || generation != _generation) return;
    _polling = true;
    ControlledPhoneConnection? selected;
    try {
      if (!await _handoff.exists()) {
        if (DateTime.now().isAfter(_deadline)) {
          throw StateError('Handoff unavailable');
        }
        return;
      }
      _timer?.cancel();
      final configuration = await ControlledPhoneServiceConfiguration.consume(
        _handoff,
      );
      await _removeReady(nonce);
      if (!mounted || generation != _generation) return;
      selected = await widget.connectionFactory(configuration);
      if (!mounted || generation != _generation) {
        await selected.close();
        return;
      }
      final connection = selected;
      setState(() {
        _configuration = configuration;
        _connection = connection;
      });
      // The accepted network widget mounts its existing Auth observer first.
      // Command success cannot replace the observed session provider.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        unawaited(_signIn(generation, connection, configuration));
      });
    } catch (_) {
      await selected?.close();
      await _fail(generation);
    } finally {
      _polling = false;
    }
  }

  Future<void> _signIn(
    int generation,
    ControlledPhoneConnection connection,
    ControlledPhoneServiceConfiguration configuration,
  ) async {
    if (!mounted ||
        generation != _generation ||
        !identical(_connection, connection)) {
      return;
    }
    final result = await configuration.signIn(connection.auth);
    if (result is Failure<void>) await _fail(generation);
  }

  Future<void> _fail(int generation) async {
    if (!mounted || generation != _generation) return;
    _timer?.cancel();
    try {
      await _removeReady(_nonce);
      await _delete(_handoff);
    } catch (_) {
      // Failure stays generic and cannot publish the handoff or its location.
    }
    final old = _connection;
    if (!mounted || generation != _generation) return;
    setState(() {
      _connection = null;
      _configuration = null;
      _failed = false;
      _preparing = true;
    });
    await old?.close();
    if (mounted && generation == _generation) {
      setState(() {
        _failed = true;
        _preparing = false;
      });
    }
  }

  Future<Result<void>> _exit(ControlledPhoneConnection connection) async {
    Result<void> result;
    try {
      result = await connection.auth.signOut();
    } catch (_) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Could not sign out. Try again.',
        ),
      );
    }
    if (result is Failure<void>) return result;
    if (!mounted || !identical(_connection, connection)) return result;
    ++_generation;
    setState(() {
      _connection = null;
      _configuration = null;
      _failed = false;
      _preparing = true;
    });
    await connection.close(signOut: false);
    if (mounted) {
      setState(() {
        _failed = true;
        _preparing = false;
      });
    }
    return const Success(null);
  }

  void _settings(ControlledPhoneConnection connection) {
    if (!identical(_connection, connection)) return;
    final navigator = _navigator.currentState;
    if (navigator == null) return;
    unawaited(
      navigator.push<void>(
        MaterialPageRoute(
          builder: (_) => AccountPreferencesPage(
            view: PreferencesView.settings,
            onEditProfile: () => navigator.push<void>(
              MaterialPageRoute(
                builder: (_) =>
                    const AccountPreferencesPage(view: PreferencesView.profile),
              ),
            ),
            onSignOut: () => _exit(connection),
          ),
        ),
      ),
    );
  }

  void _activities(ControlledPhoneConnection connection) {
    if (!mounted || !identical(_connection, connection)) return;
    final navigator = _navigator.currentState;
    if (navigator == null || navigator.canPop()) return;
    final scope = ProviderScope.containerOf(navigator.context, listen: false);
    final session = scope.read(authSessionProvider).value;
    if (session is! AuthSessionAuthenticated) return;
    unawaited(
      navigator.push<void>(
        MaterialPageRoute(
          builder: (_) => Consumer(
            builder: (context, ref, _) {
              // Refresh the selectable callback with the whole observation,
              // while the existing controller requires explicit Reload.
              final observed = ref.watch(authSessionProvider).value;
              return ActivityPage(
                onSelect: (id) {
                  if (!mounted ||
                      !context.mounted ||
                      !identical(_connection, connection) ||
                      observed is! AuthSessionAuthenticated ||
                      !identical(
                        ref.read(authSessionProvider).value,
                        observed,
                      ) ||
                      ModalRoute.of(context)?.isCurrent != true ||
                      !validBrowseId(id)) {
                    return;
                  }
                  unawaited(
                    navigator.push<void>(
                      MaterialPageRoute(
                        builder: (_) => ActivityPage(browseId: id),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    ++_generation;
    _timer?.cancel();
    final nonce = _nonce;
    unawaited(_removeReady(nonce).catchError((_) {}));
    unawaited(_connection?.close() ?? Future<void>.value());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final connection = _connection;
    final configuration = _configuration;
    if (connection != null && configuration != null) {
      if (widget.integratedDemo) {
        return ControlledDemoApp(
          key: ObjectKey(connection),
          baseUri: configuration.baseUri,
          auth: connection.auth,
          client: connection.client,
          onClose: () => _exit(connection),
          dualAccounts: configuration.dualAccounts,
          eventParticipationEnabled: configuration.dualAccounts,
        );
      }
      return AiNetworkHarnessApp(
        navigatorKey: _navigator,
        baseUri: configuration.baseUri,
        auth: connection.auth,
        client: connection.client,
        activityRepository: widget.activitiesEnabled
            ? BackendActivityRepository(
                BackendApiClient(
                  configuration.baseUri,
                  connection.auth.getIdToken,
                  httpClient: connection.client,
                ),
              )
            : null,
        activityOpener: widget.activitiesEnabled
            ? const PlatformExternalActivityOpener()
            : null,
        onOpenActivities: widget.activitiesEnabled
            ? () => _activities(connection)
            : null,
        accountPreferencesRepository: BackendAccountPreferencesRepository(
          BackendApiClient(
            configuration.baseUri,
            connection.auth.getIdToken,
            httpClient: connection.client,
          ),
        ),
        environmentLabel: widget.activitiesEnabled
            ? 'Controlled AI, Persona, Account Settings and Activity reads. Synthetic owner; host-process-lifetime data. Activity availability is controlled by the host.'
            : 'Connected scope: AI, Persona and Account Settings only. Synthetic owner. Data lasts while the owned host service process is alive.',
        onOpenSettings: () => _settings(connection),
      );
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        appBar: AppBar(title: const Text('ENMORI controlled connection')),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                widget.activitiesEnabled
                    ? 'Controlled AI, Persona, Account Settings and Activity preview. Synthetic owner; host-process-lifetime data. Activity information may be unavailable.'
                    : 'AI, Persona and Account Settings only. Synthetic owner; host-process-lifetime data. This does not connect the offline social preview.',
              ),
              const SizedBox(height: 16),
              Text(
                _failed
                    ? 'The controlled connection is unavailable or closed. Retry to prepare a fresh private handoff.'
                    : _preparing
                    ? 'Preparing a fresh private connection…'
                    : 'Waiting for the host’s private handoff. No credentials are included in this APK.',
                key: const Key('controlled-phone-status'),
              ),
              if (_failed)
                FilledButton(
                  key: const Key('controlled-phone-retry'),
                  onPressed: () => unawaited(_waitForHandoff()),
                  child: const Text('Retry connection'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
