import '../domain/event_content.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../domain/event_detail_repository.dart';
import '../event_detail_providers.dart';

final class EventActionButtons extends ConsumerStatefulWidget {
  const EventActionButtons({
    required this.event,
    required this.current,
    super.key,
  });
  final EventDetail event;
  final bool Function() current;
  @override
  ConsumerState<EventActionButtons> createState() => _EventActionButtonsState();
}

final class _EventActionButtonsState extends ConsumerState<EventActionButtons> {
  bool _busy = false;
  Future<void> _open(bool map) async {
    final session = ref.read(authSessionProvider).asData?.value;
    final event = widget.event;
    bool current() =>
        mounted &&
        identical(widget.event, event) &&
        widget.current() &&
        ref.read(currentAuthSubjectProvider) != null &&
        identical(session, ref.read(authSessionProvider).asData?.value) &&
        ref.read(contentAccessProvider).foreground &&
        ModalRoute.of(context)?.isCurrent == true;
    if (_busy || !current()) return;
    final actions = ref.read(eventActionsProvider);
    setState(() => _busy = true);
    var handedOff = false;
    try {
      if (actions != null) {
        handedOff = map
            ? await actions.openMap(event, current)
            : await actions.editCalendar(event, current);
      }
    } catch (_) {
      /* Fail closed; never display platform contents. */
    }
    if (!mounted) return;
    setState(() => _busy = false);
    if (!handedOff && current()) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            map
                ? context.tr(
                    'Could not open a maps app on this device.',
                    '此设备暂时无法打开地图应用。',
                  )
                : context.tr(
                    'Could not open a calendar editor on this device.',
                    '此设备暂时无法打开日历编辑页。',
                  ),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final address = widget.event.venueAddress;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 12),
        Text(
          address?.formatted ??
              widget.event.content?.address ??
              context.tr('Complete venue address unavailable.', '暂未提供完整场馆地址。'),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              key: const Key('event-open-map'),
              onPressed:
                  _busy ||
                      (address == null && widget.event.content?.address == null)
                  ? null
                  : () => _open(true),
              icon: const Icon(Icons.map_outlined),
              label: Text(context.tr('Open map', '打开地图')),
            ),
            OutlinedButton.icon(
              key: const Key('event-add-calendar'),
              onPressed: _busy ? null : () => _open(false),
              icon: const Icon(Icons.event_available_outlined),
              label: Text(context.tr('Add to calendar', '加入系统日历')),
            ),
          ],
        ),
        Text(
          context.tr(
            'Review and save in your calendar app. This does not register you for the event.',
            '请在日历应用中核对并保存，不会自动报名活动。',
          ),
        ),
        if (widget.event.endAt == null)
          Text(
            context.tr(
              'No source end time. Check any default duration in the calendar editor.',
              '来源未提供结束时间，请核对日历编辑页的默认时长。',
            ),
          ),
      ],
    );
  }
}
