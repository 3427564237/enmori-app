import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

/// Observes the real body render box after layout, in its current route and
/// scroll viewport. Receipt/click/row construction is never a visibility event.
final class AiVisibleMessage extends StatefulWidget {
  const AiVisibleMessage({
    required this.child,
    required this.onVisible,
    super.key,
  });
  final Widget child;
  final VoidCallback? onVisible;
  @override
  State<AiVisibleMessage> createState() => _AiVisibleMessageState();
}

final class _AiVisibleMessageState extends State<AiVisibleMessage> {
  ScrollPosition? _position;
  bool _pending = false;
  final _opacityAnimations = <Animation<double>>{};
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final position = Scrollable.maybeOf(context)?.position;
    if (!identical(position, _position)) {
      _position?.removeListener(_schedule);
      _position = position;
      _position?.addListener(_schedule);
    }
    _schedule();
  }

  @override
  void didUpdateWidget(AiVisibleMessage oldWidget) {
    super.didUpdateWidget(oldWidget);
    _schedule();
  }

  @override
  void dispose() {
    _position?.removeListener(_schedule);
    for (final animation in _opacityAnimations) {
      animation.removeListener(_schedule);
    }
    super.dispose();
  }

  void _schedule() {
    if (_pending || widget.onVisible == null) return;
    _pending = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _pending = false;
      if (!mounted ||
          widget.onVisible == null ||
          ModalRoute.of(context)?.isCurrent != true) {
        return;
      }
      final box = context.findRenderObject();
      final viewport = Scrollable.maybeOf(context)?.context.findRenderObject();
      if (box is! RenderBox ||
          viewport is! RenderBox ||
          !box.attached ||
          !viewport.attached ||
          !box.hasSize ||
          !viewport.hasSize) {
        return;
      }
      var painted = true;
      final animations = <Animation<double>>{};
      RenderObject? ancestor = box;
      while (ancestor != null) {
        if (ancestor is RenderOffstage && ancestor.offstage) painted = false;
        if (ancestor is RenderOpacity && ancestor.opacity < 1) painted = false;
        if (ancestor is RenderAnimatedOpacity) {
          animations.add(ancestor.opacity);
          if (ancestor.opacity.value < 1) painted = false;
        }
        ancestor = ancestor.parent;
      }
      for (final animation in _opacityAnimations.difference(animations)) {
        animation.removeListener(_schedule);
      }
      for (final animation in animations.difference(_opacityAnimations)) {
        animation.addListener(_schedule);
      }
      _opacityAnimations
        ..clear()
        ..addAll(animations);
      if (!painted) return;
      final body = box.localToGlobal(Offset.zero) & box.size;
      final clip = viewport.localToGlobal(Offset.zero) & viewport.size;
      final visible = body.intersect(clip);
      if (visible.width > 0 &&
          visible.height >= math.min(24, body.height) &&
          !body.isEmpty) {
        widget.onVisible?.call();
      }
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
