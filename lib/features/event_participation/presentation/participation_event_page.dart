import '../../../core/presentation/refresh_on_return.dart';
import '../../../core/presentation/enmori_localizations.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../event_browse/domain/activity_repository.dart';
import '../../event_detail/domain/event_detail_repository.dart';
import '../../event_detail/event_detail_providers.dart';
import '../../event_detail/recent_events_provider.dart';
import '../participation_providers.dart';
import 'event_card.dart';
import 'external_registration_action.dart';
import 'participation_controller.dart';
import 'participation_controls.dart';
import 'participant_preview.dart';

/// Stable-ID detail builder. It uses the existing real Detail repository and
/// preserves only the in-flight return coordinator while hiding stale content.
final class ParticipationEventPage extends ConsumerStatefulWidget {
  const ParticipationEventPage({
    required this.eventId,
    required this.opener,
    required this.onParticipants,
    this.detailBuilder,
    this.actionsBuilder,
    super.key,
  });
  final String eventId;
  final ExternalActivityOpener opener;
  final ValueChanged<ParticipantSelection> onParticipants;
  final Widget Function(BuildContext, EventDetail)? detailBuilder;
  final Widget Function(BuildContext, EventDetail, bool Function())?
  actionsBuilder;
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
        if (!(_expiry?.isActive ?? false)) _detail = null;
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
        ref.read(recentEventsProvider.notifier).viewed(value.eventId);
        _returnUrl = Uri.tryParse(
          value.content?.bookingUrl ??
              value.content?.detailUrl ??
              value.externalSourceUrl,
        );
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
    final page = Scaffold(
      appBar: AppBar(
        title: Text(context.tr('Event details', '活动详情')),
        actions: [
          IconButton(
            tooltip: context.tr('Reload Event information', '刷新活动信息'),
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading)
              Text(context.tr('Loading Event information…', '正在加载活动信息…')),
            if (_failure case final failure?)
              Text(localizedFailure(context, failure)),
            if (details != null)
              widget.detailBuilder?.call(context, details) ??
                  EventCard(event: details, onSelect: null)
            else if (!_loading)
              Text(
                context.tr(
                  'Event details are unavailable right now. Tap the refresh icon '
                      'above to try again. If that does not help, return to Events, '
                      'refresh the list and reopen this event. '
                      'Your saved Interested/Going choice is unchanged.',
                  '暂时无法获取活动详情。请点击上方刷新图标重试；如果仍不可用，请返回活动列表刷新后再打开。你保存的感兴趣或将参加状态保持不变。',
                ),
              ),
            if (details != null && widget.actionsBuilder != null)
              widget.actionsBuilder!(
                context,
                details,
                () =>
                    mounted &&
                    identical(_detail, details) &&
                    (_expiry?.isActive ?? false),
              ),
            const SizedBox(height: 16),
            Text(
              context.tr('Your plans', '你的计划'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(
              context.tr(
                'Save your interest in ENMORI. This does not book a place.',
                '在 ENMORI 保存你的意向，不代表预约名额。',
              ),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            ParticipationControls(
              key: ValueKey('participation-${widget.eventId}'),
              eventId: widget.eventId,
            ),
            const Divider(height: 32),
            if (details?.content?.bookingUrl != null &&
                details!.content!.detailUrl != details.content!.bookingUrl)
              OutlinedButton.icon(
                onPressed: () async {
                  final session = _session;
                  final opened = await widget.opener.open(
                    Uri.parse(details.content!.detailUrl),
                    current: () =>
                        mounted &&
                        identical(_session, session) &&
                        identical(_detail, details) &&
                        (_expiry?.isActive ?? false) &&
                        ModalRoute.of(context)?.isCurrent == true,
                  );
                  if (context.mounted && !opened) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          context.tr(
                            'Could not open official details.',
                            '无法打开官网详情。',
                          ),
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.open_in_new),
                label: Text(context.tr('Official event details', '官网活动详情')),
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
            if (details != null)
              ParticipantPreview(
                key: ValueKey('people-${widget.eventId}'),
                eventId: widget.eventId,
                onSeeAll: widget.onParticipants,
              ),
          ],
        ),
      ),
    );
    return RefreshOnReturn(
      onRefresh: () {
        if (_detail == null || !(_expiry?.isActive ?? false)) {
          unawaited(_load());
        }
      },
      child: page,
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
