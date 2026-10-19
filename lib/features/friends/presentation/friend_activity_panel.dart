import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
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
    super.key,
  });
  final bool home;
  final Future<void> Function(String) onOpenProfile;
  final VoidCallback? onSeeAll;
  @override
  ConsumerState<FriendActivityPanel> createState() =>
      _FriendActivityPanelState();
}

final class _FriendActivityPanelState extends ConsumerState<FriendActivityPanel>
    with WidgetsBindingObserver {
  int _epoch = 0;
  bool _busy = false;
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
    _epoch++;
    if (mounted) {
      setState(() {
        _result = null;
        _busy = false;
      });
    }
    if (state == AppLifecycleState.resumed) _load();
  }

  Future<void> _load() async {
    if (!mounted || _busy) return;
    final epoch = ++_epoch,
        session = ref.read(authSessionProvider).asData?.value,
        repository = ref.read(friendActivityRepositoryProvider);
    setState(() {
      _busy = true;
      _result = null;
    });
    Result<List<FriendActivityItem>> result;
    try {
      result = await repository.read(home: widget.home, category: _category);
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
      }
    });
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Friends Activity', style: Theme.of(context).textTheme.titleLarge),
        if (!widget.home)
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
          if (value.isEmpty) const Text('No friends activity to show.'),
          for (final item in value)
            Card(
              child: ListTile(
                title: Text(item.displayName ?? item.username),
                subtitle: Text(
                  '${item.type.label}\n${item.occurredAt.toLocal()}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  final session = ref.read(authSessionProvider).asData?.value;
                  _epoch++;
                  setState(() => _result = null);
                  await widget.onOpenProfile(item.username);
                  if (mounted &&
                      identical(
                        session,
                        ref.read(authSessionProvider).asData?.value,
                      )) {
                    await _load();
                  }
                },
              ),
            ),
        ],
        Wrap(
          spacing: 8,
          children: [
            OutlinedButton(
              onPressed: _busy ? null : _load,
              child: const Text('Reload activity'),
            ),
            if (widget.home && widget.onSeeAll != null)
              TextButton(
                onPressed: widget.onSeeAll,
                child: const Text('See all activity'),
              ),
          ],
        ),
      ],
    );
  }
}
