import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/presentation/local_time.dart';
import '../../auth/auth_providers.dart';
import '../../event_browse/domain/activity_repository.dart';
import '../domain/event_cover.dart';
import '../domain/event_detail_repository.dart';
import '../event_detail_providers.dart';

/// Information only. The app injects this into the participation/browse page;
/// their explicit ticket action and original source-expiry fences stay local.
final class EventInformation extends StatelessWidget {
  const EventInformation({required this.event, this.syntheticPreview = false, super.key});
  factory EventInformation.activity({required ActivityDetail activity, Key? key}) =>
      EventInformation(
        key: key,
        event: EventDetail(
          eventId: activity.summary.eventId ?? activity.summary.browseId,
          title: activity.summary.title,
          startAt: DateTime.parse(activity.summary.startAt),
          endAt: activity.summary.endAt == null ? null : DateTime.parse(activity.summary.endAt!),
          externalSourceUrl: activity.sourceUrl.toString(),
          locationLabel: activity.locationLabel,
          categoryLabel: activity.categoryLabel,
          shortDescription: activity.shortDescription,
          coverImageUrl: activity.coverImageUrl,
        ),
      );
  final EventDetail event;
  final bool syntheticPreview;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(event.title, key: const Key('event-detail-title'), style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 8),
      Text(syntheticPreview ? context.tr('Synthetic event preview', '合成活动预览') : context.tr('Source: Ticketmaster', '来源：Ticketmaster')),
      const SizedBox(height: 8),
      if (!syntheticPreview) Text(
        context.tr(
          'An available cover loads directly from Ticketmaster’s image service. '
          'It receives your connection information, without your ENMORI sign-in or private content. '
          'Event information is kept in memory for at most five minutes; reload after leaving or returning to the app.',
          '可用封面直接从 Ticketmaster 图片服务加载。该服务会收到你的连接信息，不会收到 ENMORI 登录信息或私人内容。活动信息最多在内存保留五分钟；离开或返回应用后请刷新。',
        ),
        style: Theme.of(context).textTheme.bodySmall,
      ),
      const SizedBox(height: 16),
      _EventCover(key: ObjectKey(event), url: syntheticPreview ? null : event.coverImageUrl),
      const SizedBox(height: 24),
      _Heading(context.tr('When', '活动时间')),
      Text(context.tr('Starts: ${localTimeLabel(context, event.startAt)}', '开始：${localTimeLabel(context, event.startAt)}')),
      Text(event.endAt == null
          ? context.tr('End time not provided.', '未提供结束时间。')
          : context.tr('Ends: ${localTimeLabel(context, event.endAt!)}', '结束：${localTimeLabel(context, event.endAt!)}')),
      const SizedBox(height: 24),
      _Heading(context.tr('Where', '活动地点')),
      SelectableText(event.locationLabel ?? (syntheticPreview ? context.tr('Location not provided.', '未提供地点。') : context.tr('Location not provided by Ticketmaster.', 'Ticketmaster 未提供地点。')), key: const Key('event-detail-location')),
      if (event.categoryLabel case final category?) ...[
        const SizedBox(height: 8),
        Text(category),
      ],
      const SizedBox(height: 24),
      _Heading(context.tr('About this event', '活动简介')),
      SelectableText(event.shortDescription ?? (syntheticPreview ? context.tr('Description not provided.', '未提供简介。') : context.tr('Ticketmaster has not provided a description for this event.', 'Ticketmaster 未提供此活动的简介。')), key: const Key('event-detail-description')),
    ],
  );
}

final class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Semantics(header: true, child: Text(text, style: Theme.of(context).textTheme.titleMedium)),
  );
}

/// RawImage avoids Flutter's global ImageCache. This state owns both request and
/// decoded image; no bytes or image survive its original detail snapshot.
final class _EventCover extends ConsumerStatefulWidget {
  const _EventCover({required this.url, super.key});
  final String? url;
  @override
  ConsumerState<_EventCover> createState() => _EventCoverState();
}

final class _EventCoverState extends ConsumerState<_EventCover> with WidgetsBindingObserver {
  EventCoverLoad? _load;
  ui.Image? _image;
  bool _loading = false;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (validEventCoverUrl(widget.url) &&
        (WidgetsBinding.instance.lifecycleState == null ||
         WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed)) {
      _loading = true;
      unawaited(_read());
    }
  }

  bool _current(int generation) => mounted && generation == _generation;

  Future<void> _read() async {
    final generation = ++_generation;
    ui.ImmutableBuffer? buffer;
    ui.ImageDescriptor? descriptor;
    ui.Codec? codec;
    ui.Image? image;
    try {
      final load = _load = ref.read(eventCoverLoaderProvider).start(widget.url!);
      final bytes = await load.bytes;
      if (!_current(generation) || bytes == null || bytes.length > 2 * 1024 * 1024) return;
      _load = null;
      buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
      if (!_current(generation)) return;
      descriptor = await ui.ImageDescriptor.encoded(buffer);
      if (!_current(generation) || descriptor.width <= 0 || descriptor.height <= 0 ||
          descriptor.width > 4096 || descriptor.height > 4096 || descriptor.width * descriptor.height > 8000000) return;
      final scale = math.min(1.0, 1280 / math.max(descriptor.width, descriptor.height));
      codec = await descriptor.instantiateCodec(
        targetWidth: math.max(1, (descriptor.width * scale).round()),
        targetHeight: math.max(1, (descriptor.height * scale).round()),
      );
      if (!_current(generation)) return;
      image = (await codec.getNextFrame()).image;
      if (!_current(generation)) return;
      setState(() { _image = image; _loading = false; });
      image = null; // ownership transferred to this detail widget
    } catch (_) {
      // Image failure never hides the title, venue, description or ticket action.
    } finally {
      image?.dispose();
      codec?.dispose();
      descriptor?.dispose();
      buffer?.dispose();
      if (_current(generation)) {
        _load?.cancel();
        _load = null;
        if (_loading) setState(() => _loading = false);
      }
    }
  }

  void _clear() {
    _generation++;
    _load?.cancel();
    _load = null;
    _image?.dispose();
    _image = null;
    _loading = false;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && mounted) setState(_clear);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(currentAuthSubjectProvider, (_, _) { if (mounted) setState(_clear); });
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: _image != null
          ? Semantics(
              image: true,
              label: context.tr('Event cover supplied by Ticketmaster', 'Ticketmaster 提供的活动封面'),
              child: RawImage(key: const Key('event-cover-image'), image: _image, fit: BoxFit.cover),
            )
          : ColoredBox(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    _loading ? context.tr('Loading event cover…', '正在加载活动封面…')
                        : context.tr('Event cover unavailable.', '暂无活动封面。'),
                    key: Key(_loading ? 'event-cover-loading' : 'event-cover-unavailable'),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
      ),
    );
  }

  @override
  void dispose() {
    _clear();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
