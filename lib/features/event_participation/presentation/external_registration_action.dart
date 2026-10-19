import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../event_browse/domain/activity_repository.dart';
import '../domain/external_registration_flow.dart';

/// Explicit opt-in builder: LI wires the real writer after contract approval.
/// Not installed into the existing browse path by default.
final class ExternalRegistrationAction extends ConsumerStatefulWidget {
  const ExternalRegistrationAction({
    required this.eventId,
    required this.sourceUrl,
    required this.opener,
    required this.confirmGoing,
    required this.readGoing,
    super.key,
  });
  final String eventId;
  final Uri sourceUrl;
  final ExternalActivityOpener opener;
  final Future<Result<void>> Function(String eventId) confirmGoing;
  final Future<Result<bool>> Function(String eventId) readGoing;

  @override
  ConsumerState<ExternalRegistrationAction> createState() =>
      _ExternalRegistrationActionState();
}

final class _ExternalRegistrationActionState
    extends ConsumerState<ExternalRegistrationAction>
    with WidgetsBindingObserver {
  ExternalRegistrationFlow? _flow;
  AuthSessionAuthenticated? _session;
  bool _dialog = false;
  AppLifecycleState? _lifecycle;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lifecycle = WidgetsBinding.instance.lifecycleState;
  }

  bool _current(AuthSessionAuthenticated session) =>
      mounted && identical(ref.read(authSessionProvider).value, session);

  @override
  void didUpdateWidget(ExternalRegistrationAction oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.eventId != widget.eventId ||
        oldWidget.sourceUrl != widget.sourceUrl ||
        oldWidget.opener != widget.opener ||
        oldWidget.confirmGoing != widget.confirmGoing ||
        oldWidget.readGoing != widget.readGoing) {
      _flow?.dispose();
      _flow = null;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycle = state;
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _flow?.background();
    } else if (state == AppLifecycleState.resumed) {
      _flow?.resume();
      _showReturn();
    }
  }

  Future<void> _open() async {
    if (_dialog) return;
    final session = _session;
    final flow = _flow;
    if (session == null || flow == null || !_current(session)) return;
    _dialog = true;
    final allowed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Continue to third-party registration?'),
        content: const SingleChildScrollView(
          child: Text(
            'Your browser opens the organiser website. Its privacy and payment '
            'terms apply. ENMORI does not verify registration or take payment. '
            'Opening the page does not mark you as Going.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Open website'),
          ),
        ],
      ),
    );
    _dialog = false;
    if (allowed != true || !_current(session) || !identical(flow, _flow)) {
      return;
    }
    final opening = flow.open();
    setState(() {});
    await opening;
    if (!_current(session) || !identical(flow, _flow)) return;
    setState(() {});
    _showReturn();
  }

  Future<void> _showReturn() async {
    final flow = _flow, session = _session;
    if (!mounted ||
        _dialog ||
        _lifecycle != AppLifecycleState.resumed ||
        flow?.phase != RegistrationPhase.confirmation ||
        session == null ||
        !_current(session)) {
      return;
    }
    _dialog = true;
    final completed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Did you complete registration?'),
        content: const Text(
          'Yes records your declaration as Going in ENMORI. '
          'It is not a booking or payment confirmation.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Yes, mark Going'),
          ),
        ],
      ),
    );
    _dialog = false;
    if (!_current(session) || !identical(flow, _flow)) return;
    final saving = flow!.answer(completed == true);
    setState(() {});
    await saving;
    if (_current(session) && identical(flow, _flow)) setState(() {});
  }

  Future<void> _read() async {
    final flow = _flow;
    if (flow == null) return;
    final reading = flow.reconcile();
    setState(() {});
    await reading;
    if (mounted && identical(flow, _flow)) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final observed = ref.watch(authSessionProvider).value;
    if (!identical(observed, _session)) {
      _flow?.dispose();
      _flow = null;
      _session = observed is AuthSessionAuthenticated ? observed : null;
    }
    final session = _session;
    if (session == null) return const Text('Sign in to record participation.');
    _flow ??= ExternalRegistrationFlow(
      eventId: widget.eventId,
      sourceUrl: widget.sourceUrl,
      opener: widget.opener,
      current: () => _current(session),
      confirmGoing: widget.confirmGoing,
      readGoing: widget.readGoing,
    );
    final phase = _flow!.phase;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (phase == RegistrationPhase.failed)
          const Text('Could not open the website. Try again or copy its link.'),
        if (phase == RegistrationPhase.saved)
          const Text('Going saved. This is your declaration, not a booking.'),
        if (phase == RegistrationPhase.unresolved) ...[
          const Text(
            'Save result is uncertain. Read participation before retrying.',
          ),
          OutlinedButton(
            onPressed: _read,
            child: const Text('Read participation'),
          ),
        ],
        if (phase == RegistrationPhase.saving)
          const Text('Checking participation…'),
        FilledButton.icon(
          onPressed:
              phase == RegistrationPhase.idle ||
                  phase == RegistrationPhase.failed ||
                  phase == RegistrationPhase.saved
              ? _open
              : null,
          icon: const Icon(Icons.open_in_new),
          label: const Text('Register on organiser website'),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _flow?.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
