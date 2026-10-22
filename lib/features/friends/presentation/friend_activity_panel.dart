import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/result/result.dart';
import '../../../core/presentation/local_time.dart';
import '../../../core/presentation/section_heading.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/friend_activity_repository.dart';
import '../data/backend_friend_activity_repository.dart';

final friendActivityRepositoryProvider = Provider<FriendActivityRepository>(
  (ref) => BackendFriendActivityRepository(ref.watch(backendApiClientProvider)),
);

/// Home and See All use the same Backend ranking; category changes clear data.
final class FriendActivityPanel extends ConsumerStatefulWidget {
  const FriendActivityPanel({
    required this.home,
    required this.onOpenProfile,
    this.onSeeAll,
    this.onOpenEvent,
    this.source,
    super.key,
  });
  final bool home;
  final FriendActivityLocator? source;
  final Future<void> Function(String eventId)? onOpenEvent;
  final Future<void> Function(String) onOpenProfile;
  final Future<void> Function()? onSeeAll;
  @override
  ConsumerState<FriendActivityPanel> createState() =>
      _FriendActivityPanelState();
}

final class _FriendActivityPanelState extends ConsumerState<FriendActivityPanel>
    with WidgetsBindingObserver {
  int _epoch = 0;
  bool _busy = false;
  bool _active = true;
  FriendActivityType? _category;
  Result<List<FriendActivityItem>>? _result;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _epoch++;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _active = state == AppLifecycleState.resumed;
    _epoch++;
    if (mounted) {
      setState(() {
        _result = null;
        _busy = false;
      });
    }
    if (state == AppLifecycleState.resumed) _load();
  }

  @override
  void didUpdateWidget(covariant FriendActivityPanel old) {
    super.didUpdateWidget(old);
    if (old.home != widget.home || old.source != widget.source) {
      _epoch++;
      _result = null;
      _busy = false;
      _category = null;
      Future.microtask(_load);
    }
  }

  bool _valid(int epoch, AuthSession? session) =>
      mounted &&
      _active &&
      epoch == _epoch &&
      session is AuthSessionAuthenticated &&
      identical(session, ref.read(authSessionProvider).asData?.value);

  Future<void> _load() async {
    if (!mounted || !_active || _busy) return;
    final epoch = ++_epoch,
        session = ref.read(authSessionProvider).asData?.value,
        repository = ref.read(friendActivityRepositoryProvider);
    if (session is! AuthSessionAuthenticated) {
      setState(() {
        _busy = false;
        _result = null;
      });
      return;
    }
    setState(() {
      _busy = true;
      _result = null;
    });
    Result<List<FriendActivityItem>> result;
    try {
      result = await repository.read(
        home: widget.home,
        category: widget.source?.type ?? _category,
      );
    } catch (_) {
      result = const Failure(
        AppFailure(
          kind: AppFailureKind.serviceUnavailable,
          message: 'Friends Activity is unavailable. Reload to try again.',
        ),
      );
    }
    if (!mounted ||
        epoch != _epoch ||
        !identical(session, ref.read(authSessionProvider).asData?.value)) {
      return;
    }
    if (widget.source case final source?) {
      if (result case Success<List<FriendActivityItem>>(:final value)) {
        final matches = value.where(source.matches).toList();
        result = matches.length == 1
            ? Success<List<FriendActivityItem>>(matches)
            : const Failure<List<FriendActivityItem>>(
                AppFailure(
                  kind: AppFailureKind.addFriendTargetUnavailable,
                  message: 'This activity is no longer available under current access.',
                ),
              );
      }
    }
    setState(() {
      _result = result;
      _busy = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (before, after) {
      if (!identical(before?.asData?.value, after.asData?.value)) {
        _epoch++;
        setState(() {
          _result = null;
          _busy = false;
          _category = null;
        });
        if (after.asData?.value is AuthSessionAuthenticated) {
          Future.microtask(_load);
        }
      }
    });
    final renderedEpoch = _epoch,
        renderedSession = ref.watch(authSessionProvider).asData?.value;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeading(
          title: 'Friends Activity',
          actions: [
            if (widget.home &&
                widget.onSeeAll != null &&
                _result is Success<List<FriendActivityItem>> &&
                (_result as Success<List<FriendActivityItem>>).value.isNotEmpty)
              TextButton(
                onPressed: () async {
                  if (!_valid(renderedEpoch, renderedSession)) return;
                  _epoch++;
                  setState(() => _result = null);
                  await widget.onSeeAll!();
                  if (mounted &&
                      identical(
                        renderedSession,
                        ref.read(authSessionProvider).asData?.value,
                      )) {
                    await _load();
                  }
                },
                child: const Text('See all activity'),
              ),
            IconButton(
              tooltip: 'Reload activity',
              onPressed: _busy ? null : _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        if (!widget.home && widget.source == null)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final category in [null, ...FriendActivityType.values])
                ChoiceChip(
                  label: Text(category?.label ?? 'All'),
                  selected: _category == category,
                  onSelected: _busy
                      ? null
                      : (_) {
                          setState(() => _category = category);
                          _load();
                        },
                ),
            ],
          ),
        if (_busy)
          const LinearProgressIndicator(
            semanticsLabel: 'Loading Friends Activity',
          ),
        if (_result case Failure<List<FriendActivityItem>>(:final failure))
          Semantics(liveRegion: true, child: Text(failure.message)),
        if (_result case Success<List<FriendActivityItem>>(:final value)) ...[
          if (value.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'No friends activity to show.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          for (final item in value)
            DecoratedBox(
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FriendActivityContent(item: item),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        if (widget.source == null)
                          TextButton(
                            onPressed: () async {
                              if (!_valid(renderedEpoch, renderedSession)) {
                                return;
                              }
                              _epoch++;
                              setState(() => _result = null);
                              await Navigator.of(context).push<void>(
                                MaterialPageRoute(
                                  builder: (_) => Scaffold(
                                    appBar: AppBar(
                                      title: const Text('Friends Activity'),
                                    ),
                                    body: SafeArea(
                                      child: ListView(
                                        padding: const EdgeInsets.all(16),
                                        children: [
                                          FriendActivityPanel(
                                            home: false,
                                            source:
                                                FriendActivityLocator.fromItem(
                                                  item,
                                                ),
                                            onOpenProfile: widget.onOpenProfile,
                                            onOpenEvent: widget.onOpenEvent,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                              if (mounted &&
                                  identical(
                                    renderedSession,
                                    ref.read(authSessionProvider).asData?.value,
                                  )) {
                                await _load();
                              }
                            },
                            child: const Text('View activity'),
                          ),
                        TextButton(
                          onPressed: () async {
                            if (!_valid(renderedEpoch, renderedSession)) return;
                            _epoch++;
                            setState(() => _result = null);
                            await widget.onOpenProfile(item.username);
                            if (mounted &&
                                identical(
                                  renderedSession,
                                  ref.read(authSessionProvider).asData?.value,
                                )) {
                              await _load();
                            }
                          },
                          child: const Text('View Profile'),
                        ),
                        if (widget.source != null &&
                            item.eventId != null &&
                            widget.onOpenEvent != null)
                          TextButton(
                            onPressed: () async {
                              if (!_valid(renderedEpoch, renderedSession)) {
                                return;
                              }
                              // Re-read the same purpose-bound activity before handing its stable Event ID to the host.
                              await _load();
                              if (!mounted ||
                                  !identical(
                                    renderedSession,
                                    ref.read(authSessionProvider).asData?.value,
                                  )) {
                                return;
                              }
                              if (_result
                                  case Success<List<FriendActivityItem>>(
                                    :final value,
                                  )) {
                                if (value.length != 1 ||
                                    value.single.eventId != item.eventId) {
                                  return;
                                }
                                _epoch++;
                                setState(() => _result = null);
                                await widget.onOpenEvent!(item.eventId!);
                                if (mounted &&
                                    identical(
                                      renderedSession,
                                      ref
                                          .read(authSessionProvider)
                                          .asData
                                          ?.value,
                                    )) {
                                  await _load();
                                }
                              }
                            },
                            child: const Text('Open event'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ],
    );
  }
}

/// Only immutable public source identity crosses navigation, never cached content.
final class FriendActivityLocator {
  const FriendActivityLocator(this.username, this.type, this.sourceRecordId);
  factory FriendActivityLocator.fromItem(FriendActivityItem item) =>
      FriendActivityLocator(item.username, item.type, item.sourceRecordId);
  final String username, sourceRecordId;
  final FriendActivityType type;
  bool matches(FriendActivityItem item) =>
      item.username == username &&
      item.type == type &&
      item.sourceRecordId == sourceRecordId;
  @override
  bool operator ==(Object other) =>
      other is FriendActivityLocator &&
      other.username == username &&
      other.type == type &&
      other.sourceRecordId == sourceRecordId;
  @override
  int get hashCode => Object.hash(username, type, sourceRecordId);
}

final class FriendActivityContent extends StatelessWidget {
  const FriendActivityContent({required this.item, super.key});
  final FriendActivityItem item;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        item.displayName ?? item.username,
        style: Theme.of(context).textTheme.titleMedium,
      ),
      Text(
        '@${item.username} · ${item.type.label}',
        style: Theme.of(context).textTheme.bodySmall,
      ),
      const SizedBox(height: 4),
      Text(
        localTimeLabel(context, item.occurredAt),
        style: Theme.of(context).textTheme.bodySmall,
      ),
      const SizedBox(height: 8),
      if (item.eventTitle case final title?)
        Text(title, style: Theme.of(context).textTheme.titleMedium),
      if (item.note case final note?)
        Text(note, style: Theme.of(context).textTheme.bodyLarge),
      if (item.mood case final mood?)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            'Mood at this Check-in: $mood',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
    ],
  );
}
