import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;

/// Presentation-only timing. No request, navigation or save waits for motion.
abstract final class EnmoriMotion {
  static const feedback = Duration(milliseconds: 150);
  static const content = Duration(milliseconds: 200);
  static const navigation = Duration(milliseconds: 300);
  static const sheet = Duration(milliseconds: 260);
  static const settle = Curves.easeOutCubic;
  static const depart = Curves.easeInCubic;

  static Duration duration(BuildContext context, Duration value) =>
      MediaQuery.disableAnimationsOf(context) ? Duration.zero : value;

  static AnimationStyle surface(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context)
      ? AnimationStyle.noAnimation
      : const AnimationStyle(
          duration: sheet,
          reverseDuration: content,
          curve: settle,
          reverseCurve: depart,
        );

  static ChipAnimationStyle chips(BuildContext context) {
    final style = AnimationStyle(
      duration: duration(context, feedback),
      reverseDuration: duration(context, feedback),
    );
    return ChipAnimationStyle(
      enableAnimation: style,
      selectAnimation: style,
      avatarDrawerAnimation: style,
      deleteDrawerAnimation: style,
    );
  }
}

/// AnimatedSize cannot relayout synchronously with a zero-duration controller.
/// Reduced motion renders the final size directly, including after text changes.
final class MotionSize extends StatelessWidget {
  const MotionSize({
    required this.child,
    this.alignment = Alignment.topCenter,
    super.key,
  });
  final Widget child;
  final AlignmentGeometry alignment;
  @override
  Widget build(BuildContext context) => MediaQuery.disableAnimationsOf(context)
      ? child
      : AnimatedSize(
          duration: EnmoriMotion.content,
          curve: EnmoriMotion.settle,
          alignment: alignment,
          child: child,
        );
}

/// Reveals the current child only. Replaced/private content is removed at once;
/// unlike a cross-fade, it cannot remain in an outgoing overlay or receive input.
/// The stable child subtree keeps form focus and owns all business state.
final class MotionReveal extends StatefulWidget {
  const MotionReveal({
    required this.child,
    this.trigger,
    this.enabled = true,
    this.distance = 6,
    super.key,
  });
  final Widget child;
  final Object? trigger;
  final bool enabled;
  final double distance;

  @override
  State<MotionReveal> createState() => _MotionRevealState();
}

final class _MotionRevealState extends State<MotionReveal>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: EnmoriMotion.content,
  );
  late final Animation<double> _progress = _controller.drive(
    CurveTween(curve: EnmoriMotion.settle),
  );
  bool _initialized = false;
  bool _animate = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _animate =
        !MediaQuery.disableAnimationsOf(context) &&
        TickerMode.valuesOf(context).enabled;
    if (!_animate || !widget.enabled) {
      _controller.value = 1;
    } else if (!_initialized) {
      _controller.forward();
    }
    _initialized = true;
  }

  @override
  void didUpdateWidget(MotionReveal oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_animate || !widget.enabled) {
      _controller.value = 1;
    } else if (oldWidget.trigger != widget.trigger) {
      // Rapid retargets keep their current progress instead of flashing/restarting.
      _controller.forward(from: _controller.isAnimating ? null : 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _progress,
    child: widget.child,
    builder: (context, child) => Transform.translate(
      offset: Offset(0, widget.distance * (1 - _progress.value)),
      child: Opacity(
        // Never create an invisible but interactive form/control.
        opacity: .65 + .35 * _progress.value,
        child: child,
      ),
    ),
  );
}

/// Keep the SDK's interactive iOS / predictive Android back transitions. Root
/// destinations are peers: a short fade avoids suggesting another stack level.
final class EnmoriPageTransitions extends PageTransitionsBuilder {
  const EnmoriPageTransitions({this.cupertino = false, this.disabled = false});
  final bool cupertino;
  final bool disabled;

  @override
  Duration get transitionDuration =>
      disabled ? Duration.zero : EnmoriMotion.navigation;
  @override
  Duration get reverseTransitionDuration => transitionDuration;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    if (route.isFirst &&
        route.settings.name?.startsWith('root-') == true &&
        !route.popGestureInProgress) {
      return FadeTransition(
        opacity: animation.drive(CurveTween(curve: EnmoriMotion.settle)),
        child: child,
      );
    }
    final PageTransitionsBuilder platform = cupertino
        ? const CupertinoPageTransitionsBuilder()
        : const PredictiveBackPageTransitionsBuilder();
    return platform.buildTransitions(
      route,
      context,
      animation,
      secondaryAnimation,
      child,
    );
  }
}

/// Live preference for built-in feedback; no application/controller state lives here.
final class EnmoriMotionPreferences extends StatelessWidget {
  const EnmoriMotionPreferences({required this.child, super.key});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final timing = EnmoriMotion.duration(context, EnmoriMotion.feedback);
    ButtonStyle feedback(ButtonStyle? style) =>
        (style ?? const ButtonStyle()).copyWith(animationDuration: timing);
    return Theme(
      data: theme.copyWith(
        pageTransitionsTheme: MediaQuery.disableAnimationsOf(context)
            ? PageTransitionsTheme(
                builders: {
                  for (final platform in TargetPlatform.values)
                    platform: const EnmoriPageTransitions(disabled: true),
                },
              )
            : theme.pageTransitionsTheme,
        filledButtonTheme: FilledButtonThemeData(
          style: feedback(theme.filledButtonTheme.style),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: feedback(theme.elevatedButtonTheme.style),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: feedback(theme.outlinedButtonTheme.style),
        ),
        textButtonTheme: TextButtonThemeData(
          style: feedback(theme.textButtonTheme.style),
        ),
        expansionTileTheme: theme.expansionTileTheme.copyWith(
          expansionAnimationStyle: EnmoriMotion.surface(context),
        ),
      ),
      child: child,
    );
  }
}
