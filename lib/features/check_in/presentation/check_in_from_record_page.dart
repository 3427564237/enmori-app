import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../account/content_access.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../check_in_providers.dart';
import '../domain/check_in_repository.dart';
import 'check_in_draft_seed.dart';
import 'check_in_page.dart';

/// Re-reads an owned source before opening a separate, unsaved composer.
/// The seed is route-local user input after this explicit copy action. It is
/// never refreshed over edits or retired by its own save invalidation.
final class CheckInFromRecordPage extends ConsumerStatefulWidget {
  const CheckInFromRecordPage({
    required this.sourceCheckInId,
    required this.onDiscard,
    this.onReturnHome,
    this.onOpenSaved,
    this.onOpenHistory,
    this.located = false,
    this.socialStyle = false,
    this.openAttribution,
    super.key,
  });

  final String sourceCheckInId;
  final VoidCallback onDiscard;
  final VoidCallback? onReturnHome, onOpenHistory;
  final ValueChanged<String>? onOpenSaved;
  final bool located, socialStyle;
  final Future<bool> Function(Uri)? openAttribution;

  @override
  ConsumerState<CheckInFromRecordPage> createState() =>
      _CheckInFromRecordPageState();
}

final class _CheckInFromRecordPageState
    extends ConsumerState<CheckInFromRecordPage> {
  AuthSession? _session;
  CheckInDraftSeed? _seed;
  AppFailure? _failure;
  bool _busy = true;
  bool _retired = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _session = ref.read(authSessionProvider).asData?.value;
    Future.microtask(_load);
  }

  @override
  void didUpdateWidget(CheckInFromRecordPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.sourceCheckInId != widget.sourceCheckInId) {
      _request++;
      _seed = null;
      _failure = null;
      _busy = true;
      Future.microtask(_load);
    }
  }

  bool get _sameSession =>
      !_retired &&
      _session is AuthSessionAuthenticated &&
      identical(_session, ref.read(authSessionProvider).asData?.value);

  Future<void> _load() async {
    if (!mounted) return;
    final access = ref.read(contentAccessProvider);
    if (!_sameSession ||
        !access.foreground ||
        widget.sourceCheckInId.trim().isEmpty) {
      setState(() {
        _busy = false;
        _failure = _unavailable;
      });
      return;
    }
    final request = ++_request;
    final sourceId = widget.sourceCheckInId;
    setState(() {
      _busy = true;
      _failure = null;
    });
    Result<CheckIn> result;
    try {
      result = await ref
          .read(checkInRepositoryProvider)
          .readOwned(checkInId: sourceId);
    } catch (_) {
      result = const Failure(_unavailable);
    }
    if (!mounted || request != _request || !_sameSession) return;
    final currentAccess = ref.read(contentAccessProvider);
    if (!currentAccess.foreground ||
        currentAccess.revision != access.revision) {
      setState(() {
        _busy = false;
        _failure = _unavailable;
      });
      return;
    }
    setState(() {
      _busy = false;
      switch (result) {
        case Success<CheckIn>(:final value) when value.checkInId == sourceId:
          _seed = CheckInDraftSeed(
            note: value.note,
            mood: value.mood,
            activity: value.activity,
          );
        case Failure<CheckIn>(:final failure):
          _failure = failure;
        default:
          _failure = _unavailable;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(authSessionProvider);
    final access = ref.watch(contentAccessProvider);
    // Retire copied input as well as an in-flight source read on any session
    // replacement, including a new session for the same account.
    if (!_sameSession) {
      _retired = true;
      _request++;
      _seed = null;
    }
    if (_seed case final seed? when _sameSession) {
      return CheckInComposerPage(
        key: ValueKey((widget.sourceCheckInId, _session)),
        initialDraft: seed,
        onDiscard: widget.onDiscard,
        onReturnHome: widget.onReturnHome,
        onOpenSaved: widget.onOpenSaved,
        onOpenHistory: widget.onOpenHistory,
        located: widget.located,
        socialStyle: widget.socialStyle,
        openAttribution: widget.openAttribution,
      );
    }
    final loading = _sameSession && access.foreground && _busy;
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: widget.onDiscard),
        title: Text(context.tr('New draft from Check-in', '从签到开始新草稿')),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (loading)
              LinearProgressIndicator(
                semanticsLabel: context.tr('Reading your Check-in', '正在读取你的签到'),
              ),
            const SizedBox(height: 16),
            Text(
              loading
                  ? context.tr('Reading your Check-in…', '正在读取你的签到…')
                  : context.tr(
                      'This draft could not be started.',
                      '暂时无法开始此草稿。',
                    ),
            ),
            if (!loading) ...[
              const SizedBox(height: 8),
              Text(
                !_sameSession
                    ? context.tr(
                        'Your session changed. Return and reopen your own Check-in.',
                        '登录状态已变化。请返回后重新打开你自己的签到。',
                      )
                    : localizedFailure(context, _failure ?? _unavailable),
              ),
              const SizedBox(height: 16),
              if (_sameSession && widget.sourceCheckInId.trim().isNotEmpty)
                OutlinedButton.icon(
                  key: const Key('check-in-source-retry'),
                  onPressed: access.foreground ? _load : null,
                  icon: const Icon(Icons.refresh),
                  label: Text(context.tr('Reload source Check-in', '重新读取原签到')),
                ),
              TextButton(
                onPressed: widget.onDiscard,
                child: Text(context.tr('Return to your records', '返回我的记录')),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

const _unavailable = AppFailure(
  kind: AppFailureKind.checkInUnavailable,
  message: 'The source Check-in is unavailable.',
);
