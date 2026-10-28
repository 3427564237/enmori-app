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
  const EventInformation({
    required this.event,
    this.syntheticPreview = false,
    super.key,
  });
  factory EventInformation.activity({
    required ActivityDetail activity,
    Key? key,
  }) => EventInformation(
    key: key,
    event: EventDetail(
      eventId: activity.summary.eventId ?? activity.summary.browseId,
      title: activity.summary.title,
      startAt: DateTime.parse(activity.summary.startAt),
      endAt: activity.summary.endAt == null
          ? null
          : DateTime.parse(activity.summary.endAt!),
      externalSourceUrl: activity.sourceUrl.toString(),
      locationLabel: activity.locationLabel,
      categoryLabel: activity.categoryLabel,
      shortDescription: activity.shortDescription,
      coverImageUrl: activity.coverImageUrl,
      content: activity.content,
    ),
  );
  final EventDetail event;
  final bool syntheticPreview;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        event.title,
        key: const Key('event-detail-title'),
        style: Theme.of(context).textTheme.headlineSmall,
      ),
      const SizedBox(height: 8),
      Text(
        syntheticPreview
            ? context.tr('Synthetic event preview', '合成活动预览')
            : context.tr(
                'Source: ${event.content?.sourceName ?? 'Ticketmaster'}',
                '来源：${event.content?.sourceName ?? 'Ticketmaster'}',
              ),
      ),
      const SizedBox(height: 8),
      const SizedBox(height: 16),
      EventCover(
        key: ObjectKey(event),
        url: syntheticPreview ? null : event.coverImageUrl,
      ),
      const SizedBox(height: 24),
      _Heading(context.tr('When', '活动时间')),
      Text(
        context.tr(
          'Starts: ${singaporeEventTimeLabel(context, event.startAt)}',
          '开始：${singaporeEventTimeLabel(context, event.startAt)}',
        ),
      ),
      Text(
        event.endAt == null
            ? context.tr('End time not provided.', '未提供结束时间。')
            : context.tr(
                'Ends: ${singaporeEventTimeLabel(context, event.endAt!)}',
                '结束：${singaporeEventTimeLabel(context, event.endAt!)}',
              ),
      ),
      const SizedBox(height: 24),
      _Heading(context.tr('Where', '活动地点')),
      SelectableText(
        event.locationLabel ??
            (syntheticPreview
                ? context.tr('Location not provided.', '未提供地点。')
                : context.tr(
                    'Location not provided by the source.',
                    '来源未提供地点。',
                  )),
        key: const Key('event-detail-location'),
      ),
      if (event.categoryLabel case final category?) ...[
        const SizedBox(height: 8),
        Text(category),
      ],
      const SizedBox(height: 24),
      _Heading(context.tr('About this event', '活动简介')),
      SelectableText(
        event.content?.fullDescription ??
            event.shortDescription ??
            (event.content?.detailsStatus == 'unavailable'
                ? context.tr(
                    'Official details could not be read. Open the official site to check.',
                    '官网详情暂时读取失败，请前往官网查看。',
                  )
                : syntheticPreview
                ? context.tr('Description not provided.', '未提供简介。')
                : context.tr(
                    'The current event source has not supplied an introduction. The ticket link may open seat selection directly.',
                    '当前活动来源未提供介绍。购票链接可能直接进入选座页面。',
                  )),
        key: const Key('event-detail-description'),
      ),
      if (event.content case final content?) ...[
        const SizedBox(height: 16),
        Text('Asia/Singapore (UTC+8)'),
        _Heading(context.tr('Registration and conditions', '报名与条件')),
        Text(
          content.priceLabel ??
              context.tr(
                'Price not provided. Confirm on the official site.',
                '未提供价格，请前往官网确认。',
              ),
        ),
        Text(
          context.tr(
            'Status: ${eventStatusLabel(context, content.status)}',
            '状态：${eventStatusLabel(context, content.status)}',
          ),
        ),
        if (content.registrationDeadline case final deadline?)
          Text(context.tr('Registration closes: $deadline', '报名截止：$deadline')),
        if (content.minimumAge != null || content.maximumAge != null)
          Text(
            context.tr(
              'Age requirement: ${content.minimumAge ?? 0}–${content.maximumAge ?? 'no upper limit'}',
              '年龄要求：${content.minimumAge ?? 0}至${content.maximumAge ?? '无上限'}岁',
            ),
          ),
        for (final section in content.sections) ...[
          const SizedBox(height: 16),
          _Heading(section.heading),
          SelectableText(section.text),
        ],
      ],
    ],
  );
}

final class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Semantics(
      header: true,
      child: Text(text, style: Theme.of(context).textTheme.titleMedium),
    ),
  );
}

/// RawImage avoids Flutter's global ImageCache. This state owns both request and
/// decoded image; no bytes or image survive its original detail snapshot.
final class EventCover extends ConsumerStatefulWidget {
  const EventCover({required this.url, super.key});
  final String? url;
  @override
  ConsumerState<EventCover> createState() => EventCoverState();
}

final class EventCoverState extends ConsumerState<EventCover>
    with WidgetsBindingObserver {
  EventCoverLoad? _load;
  ui.Image? _image;
  bool _loading = false;
  bool _started = false, _cleared = false;
  bool _foreground = true;
  ModalRoute<Object?>? _route;
  int _generation = 0;
  Timer? _expiry;
  @override
  void initState() {
    super.initState();
    _foreground =
        WidgetsBinding.instance.lifecycleState == null ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
    _expiry = Timer(const Duration(minutes: 5), () {
      if (mounted) setState(_clear);
    });
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _route = ModalRoute.of(context);
    if (_route?.isCurrent == false || !_foreground) {
      _suspend();
    } else {
      _startVisible();
    }
  }

  void _startVisible() {
    if (!_started &&
        !_cleared &&
        _foreground &&
        (_route?.isCurrent ?? true) &&
        validEventCoverUrl(widget.url)) {
      _started = true;
      _loading = true;
      unawaited(_read());
    }
  }

  void _suspend() {
    _generation++;
    _load?.cancel();
    _load = null;
    _loading = false;
    _started = _image != null;
  }

  bool _current(int generation) =>
      mounted &&
      _foreground &&
      generation == _generation &&
      (_route?.isCurrent ?? true);

  Future<void> _read() async {
    final generation = ++_generation;
    ui.ImmutableBuffer? buffer;
    ui.ImageDescriptor? descriptor;
    ui.Codec? codec;
    ui.Image? image;
    try {
      final load = _load = ref
          .read(eventCoverLoaderProvider)
          .start(widget.url!);
      final bytes = await load.bytes;
      if (!_current(generation) ||
          bytes == null ||
          bytes.length > 2 * 1024 * 1024) {
        return;
      }
      _load = null;
      buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
      if (!_current(generation)) return;
      descriptor = await ui.ImageDescriptor.encoded(buffer);
      if (!_current(generation) ||
          descriptor.width <= 0 ||
          descriptor.height <= 0 ||
          descriptor.width > 4096 ||
          descriptor.height > 4096 ||
          descriptor.width * descriptor.height > 8000000) {
        return;
      }
      final scale = math.min(
        1.0,
        1280 / math.max(descriptor.width, descriptor.height),
      );
      codec = await descriptor.instantiateCodec(
        targetWidth: math.max(1, (descriptor.width * scale).round()),
        targetHeight: math.max(1, (descriptor.height * scale).round()),
      );
      if (!_current(generation)) return;
      image = (await codec.getNextFrame()).image;
      if (!_current(generation)) return;
      setState(() {
        _image = image;
        _loading = false;
      });
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
    _started = true;
    _cleared = true;
    _load?.cancel();
    _load = null;
    _image?.dispose();
    _image = null;
    _loading = false;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    if (mounted) setState(_foreground ? _startVisible : _suspend);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(currentAuthSubjectProvider, (_, _) {
      if (mounted) setState(_clear);
    });
    ref.listen(authSessionProvider, (previous, next) {
      final before = previous?.asData?.value;
      if (before != null && !identical(before, next.asData?.value) && mounted) {
        setState(_clear);
      }
    });
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: _image != null
            ? Semantics(
                image: true,
                label: context.tr('Source event cover', '来源提供的活动封面'),
                child: RawImage(
                  key: const Key('event-cover-image'),
                  image: _image,
                  fit: BoxFit.cover,
                ),
              )
            : ColoredBox(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      _loading
                          ? context.tr('Loading event cover…', '正在加载活动封面…')
                          : _cleared
                          ? context.tr(
                              'Cover cleared. Reload event details to view it again.',
                              '封面已清除，请刷新活动详情后查看。',
                            )
                          : context.tr('Event cover unavailable.', '暂无活动封面。'),
                      key: Key(
                        _loading
                            ? 'event-cover-loading'
                            : 'event-cover-unavailable',
                      ),
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
    _expiry?.cancel();
    _clear();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}

String eventStatusLabel(BuildContext context, String? status) =>
    switch (status) {
      'available' => context.tr('On sale', '可购票'),
      'sold_out' => context.tr('Sold out', '已售罄'),
      'cancelled' => context.tr('Cancelled', '已取消'),
      'postponed' => context.tr('Postponed', '已延期'),
      'rescheduled' => context.tr(
        'Rescheduled — check current time',
        '已改期，请核对当前时间',
      ),
      'registration_closed' => context.tr('Registration closed', '报名已截止'),
      'not_on_sale' => context.tr('Not on sale', '当前未售票'),
      _ => context.tr(
        'Confirm availability on the official site',
        '请到官网确认报名状态',
      ),
    };
