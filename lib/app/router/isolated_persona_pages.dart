import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// App-owned composition of the four approved Persona surfaces.
///
/// The isolated harness supplies real feature pages and their provider wiring.
/// Pages own loading, session commands and dirty/in-flight exit confirmation;
/// invoke `onBack` only after those page checks. Merely supplying these builders
/// does not enable routes: `isolatedSlicesEnabledProvider` must also be enabled.
final class IsolatedPersonaPages {
  const IsolatedPersonaPages({
    required this.overview,
    required this.management,
    required this.create,
    required this.edit,
  });

  final Widget Function(
    BuildContext context, {
    required VoidCallback onManage,
    required VoidCallback onBack,
  })
  overview;

  final Widget Function(
    BuildContext context, {
    required VoidCallback onCreate,
    required ValueChanged<String> onEdit,
    required VoidCallback onBack,
  })
  management;

  final Widget Function(BuildContext context, {required VoidCallback onBack})
  create;

  final Widget Function(
    BuildContext context, {
    required String personaId,
    required VoidCallback onBack,
  })
  edit;
}

// No default pages or runtime enablement. Only an isolated harness overrides it.
final isolatedPersonaPagesProvider = Provider<IsolatedPersonaPages?>(
  (ref) => null,
);
