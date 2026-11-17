import 'dart:async';

import 'package:flutter/material.dart';

import '../core/presentation/enmori_localizations.dart';

/// Keep the primary action before asynchronous weather content. Its position
/// must not change when a weather lookup completes, fails or is cleared.
final class HomeIntroduction extends StatefulWidget {
  const HomeIntroduction({
    required this.onStartCheckIn,
    this.greeting,
    this.weather,
    this.displayNow,
    super.key,
  });

  final VoidCallback onStartCheckIn;
  final Widget? greeting;
  final Widget? weather;

  /// Optional display-only clock; native date queries remain independently owned.
  final DateTime Function()? displayNow;

  @override
  State<HomeIntroduction> createState() => _HomeIntroductionState();
}

final class _HomeIntroductionState extends State<HomeIntroduction>
    with WidgetsBindingObserver {
  Timer? _midnight;
  late DateTime _date;

  DateTime _now() => widget.displayNow?.call() ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _date = _now();
    _scheduleMidnight();
  }

  void _scheduleMidnight() {
    _midnight?.cancel();
    final next = DateTime(_date.year, _date.month, _date.day + 1);
    _midnight = Timer(next.difference(_date), _refreshDate);
  }

  void _refreshDate() {
    if (!mounted) return;
    setState(() => _date = _now());
    _scheduleMidnight();
  }

  @override
  void didUpdateWidget(HomeIntroduction oldWidget) {
    super.didUpdateWidget(oldWidget);
    _date = _now();
    _scheduleMidnight();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshDate();
  }

  @override
  void dispose() {
    _midnight?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      key: const Key('home-introduction'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          widget.greeting ??
              Text(
                context.tr('Welcome back', '欢迎回来'),
                style: theme.textTheme.bodyMedium,
              ),
          const SizedBox(height: 4),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 4,
            children: [
              Semantics(
                header: true,
                child: Text(
                  context.tr('Today', '今天'),
                  style: theme.textTheme.titleLarge,
                ),
              ),
              Text(
                MaterialLocalizations.of(context).formatFullDate(_date),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            key: const Key('r6-new-check-in-button'),
            onPressed: widget.onStartCheckIn,
            icon: const Icon(Icons.edit_note),
            label: Text(context.tr('New Check-in', '新建签到')),
          ),
          if (widget.weather != null) ...[
            const Divider(height: 16),
            widget.weather!,
          ],
        ],
      ),
    );
  }
}
