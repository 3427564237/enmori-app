import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../event_browse/domain/activity_repository.dart';
import '../../event_detail/domain/event_detail_repository.dart';
import '../../event_detail/event_detail_providers.dart';
import '../domain/participation_repository.dart';
import '../participation_providers.dart';
import 'event_card.dart';
import 'external_registration_action.dart';
import 'participation_controller.dart';
import 'participation_controls.dart';

/// Stable-ID detail builder. It uses the existing real Detail repository and
/// preserves only the in-flight return coordinator while hiding stale content.
final class ParticipationEventPage extends ConsumerStatefulWidget {
  const ParticipationEventPage({
    required this.eventId,
    required this.opener,
    required this.onParticipants,
    super.key,
  });
  final String eventId;
  final ExternalActivityOpener opener;
  final ValueChanged<ParticipantSelection> onParticipants;
  @override
  ConsumerState<ParticipationEventPage> createState() =>
      _ParticipationEventPageState();
}

final class _ParticipationEventPageState
    extends ConsumerState<ParticipationEventPage>
    with WidgetsBindingObserver {
  EventDetail? _detail;
  Uri? _returnUrl;
  AppFailure? _failure;
  AuthSessionAuthenticated? _session;
  bool _loading = false;
  int _generation = 0;
  Timer? _expiry;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  @override
  void didUpdateWidget(ParticipationEventPage old) {
    super.didUpdateWidget(old);
    if (old.eventId != widget.eventId) {
      _reset();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
    }
  }

  void _reset() {
    _generation++;
    _expiry?.cancel();
    _detail = null;
    _returnUrl = null;
    _loading = false;
    _failure = null;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      setState(() {
        _generation++;
        _detail = null;
        _loading = false;
      });
    }
  }

  Future<void> _load() async {
    if (_loading || _session == null) return;
    final generation = ++_generation, session = _session;
    final repository = ref.read(eventDetailRepositoryProvider);
    setState(() {
      _loading = true;
      _detail = null;
      _failure = null;
    });
    Result<EventDetail> result;
    try {
      result = await repository.read(widget.eventId);
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Event information is unavailable. Reload to try again.',
        ),
      );
    }
    if (!mounted ||
        generation != _generation ||
        !identical(
          participationSession(ref.read(authSessionProvider)),
          session,
        )) {
      return;
    }
    setState(() {
      _loading = false;
      if (result case Success<EventDetail>(:final value)
          when value.eventId == widget.eventId) {
        _detail = value;
        _returnUrl = Uri.tryParse(value.externalSourceUrl);
        _expiry?.cancel();
        _expiry = Timer(const Duration(minutes: 5), () {
          if (mounted) setState(_reset);
        });
      } else {
        _failure = result is Failure<EventDetail>
            ? result.failure
            : const AppFailure(
                kind: AppFailureKind.unexpected,
                message: 'Invalid Event identity.',
              );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final observed = participationSession(ref.watch(authSessionProvider));
    if (!identical(observed, _session)) {
      _reset();
      _session = observed is AuthSessionAuthenticated ? observed : null;
    }
    final controller = ref.read(participationControllerProvider.notifier);
    final details = _detail;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Event details'),
        actions: [
          IconButton(
            tooltip: 'Reload Event information',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading) const Text('Loading Event information…'),
            if (_failure case final failure?) Text(failure.message),
            if (details != null)
              EventCard(event: details, onSelect: null)
            else if (!_loading)
              const Text(
                'Event information is currently unavailable. Your participation is retained.',
              ),
            ParticipationControls(
              key: ValueKey('participation-${widget.eventId}'),
              eventId: widget.eventId,
            ),
            if (_returnUrl case final url?)
              ExternalRegistrationAction(
                key: ValueKey('registration-${widget.eventId}'),
                eventId: widget.eventId,
                sourceUrl: url,
                opener: widget.opener,
                confirmGoing: controller.confirmGoing,
                readGoing: controller.readGoing,
                sourceAvailable: details != null,
              ),
            const SizedBox(height: 16),
            Text('People', style: Theme.of(context).textTheme.titleLarge),
            for (final status in [
              ParticipationStatus.interested,
              ParticipationStatus.going,
            ])
              for (final group in ParticipantGroup.values)
                ListTile(
                  leading: Icon(
                    status == ParticipationStatus.going
                        ? Icons.event_available
                        : Icons.star_outline,
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _session == null
                      ? null
                      : () => widget.onParticipants((
                          eventId: widget.eventId,
                          status: status,
                          group: group,
                        )),
                  title: Text('See all ${status.name} · ${group.name}'),
                ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _expiry?.cancel();
    _generation++;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
