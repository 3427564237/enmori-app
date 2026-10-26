import 'package:flutter/widgets.dart';

/// Requests a fresh read after a visible route or foreground return. The caller
/// retains its own authorization, freshness, cancellation and error boundaries.
/// Hidden routes never request data, and no old snapshot is restored here.
final class RefreshOnReturn extends StatefulWidget {
  const RefreshOnReturn({
    required this.onRefresh,
    required this.child,
    super.key,
  });
  final VoidCallback onRefresh;
  final Widget child;
  @override
  State<RefreshOnReturn> createState() => _RefreshOnReturnState();
}

final class _RefreshOnReturnState extends State<RefreshOnReturn>
    with WidgetsBindingObserver {
  bool _foreground = true, _visible = false, _observed = false, _dirty = false;
  int _scheduled = 0;

  @override
  void initState() {
    super.initState();
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    _foreground = lifecycle == null || lifecycle == AppLifecycleState.resumed;
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final visible =
        (ModalRoute.of(context)?.isCurrent ?? true) &&
        TickerMode.valuesOf(context).enabled;
    if (_observed && visible != _visible) {
      _dirty = true;
      _scheduled++;
    }
    _observed = true;
    _visible = visible;
    _schedule();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    if (!_foreground) {
      _dirty = true;
      _scheduled++;
    } else {
      _schedule();
    }
  }

  void _schedule() {
    if (!_dirty || !_foreground || !_visible) return;
    final scheduled = ++_scheduled;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted ||
          scheduled != _scheduled ||
          !_dirty ||
          !_foreground ||
          !_visible ||
          ModalRoute.of(context)?.isCurrent == false ||
          !TickerMode.valuesOf(context).enabled) {
        return;
      }
      _dirty = false;
      widget.onRefresh();
    });
  }

  @override
  void dispose() {
    _scheduled++;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
