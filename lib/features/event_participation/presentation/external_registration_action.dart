import '../../../core/presentation/enmori_localizations.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../../event_browse/domain/activity_repository.dart';
import '../domain/external_registration_flow.dart';
import '../participation_providers.dart';

/// Explicit opt-in builder: LI wires the real writer after contract approval.
/// Not installed into the existing browse path by default.
final class ExternalRegistrationAction extends ConsumerStatefulWidget {
  const ExternalRegistrationAction({
    required this.eventId,
    required this.sourceUrl,
    required this.opener,
    required this.confirmGoing,
    required this.readGoing,
    this.sourceAvailable = true,
    super.key,
  });
  final String eventId;
  final Uri sourceUrl;
  final ExternalActivityOpener opener;
  final Future<Result<void>> Function(String eventId) confirmGoing;
  final Future<Result<bool>> Function(String eventId) readGoing;
  final bool sourceAvailable;

  @override
  ConsumerState<ExternalRegistrationAction> createState() =>
      _ExternalRegistrationActionState();
}

final class _ExternalRegistrationActionState
    extends ConsumerState<ExternalRegistrationAction>
    with WidgetsBindingObserver {
  ExternalRegistrationFlow? _flow;
  AuthSessionAuthenticated? _session;
  bool _dialog = false;
  AppLifecycleState? _lifecycle;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lifecycle = WidgetsBinding.instance.lifecycleState;
  }

  bool _current(AuthSessionAuthenticated session) =>
      mounted &&
      identical(participationSession(ref.read(authSessionProvider)), session);

  @override
  void didUpdateWidget(ExternalRegistrationAction oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.eventId != widget.eventId ||
        oldWidget.sourceUrl != widget.sourceUrl) {
      _flow?.dispose();
      _flow = null;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycle = state;
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _flow?.background();
    } else if (state == AppLifecycleState.resumed) {
      _flow?.resume();
      _showReturn();
    }
  }

  Future<void> _open() async {
    if (_dialog || !widget.sourceAvailable) return;
    final session = _session;
    final flow = _flow;
    if (session == null || flow == null || !_current(session)) return;
    _dialog = true;
    final allowed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          context.tr(
            'Continue to Ticketmaster tickets?',
            '前往 Ticketmaster 购票？',
          ),
        ),
        content: SingleChildScrollView(
          child: Text(
            context.tr(
              'Your browser opens the event’s Ticketmaster ticket link. Ticketmaster controls the destination, including any booking or seat selection. Its privacy and payment '
                  'terms apply. ENMORI does not verify registration or take payment. '
                  'Opening the page does not mark you as Going.',
              '浏览器将打开此活动的 Ticketmaster 购票链接，具体页面及预订或选座步骤由 Ticketmaster 决定，其隐私和支付条款适用。ENMORI 不核实报名，也不收款。打开网页不会自动标记为将参加。',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.tr('Cancel', '取消')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('Open website', '打开网站')),
          ),
        ],
      ),
    );
    _dialog = false;
    if (allowed != true ||
        !widget.sourceAvailable ||
        !_current(session) ||
        !identical(flow, _flow)) {
      return;
    }
    final opening = flow.open();
    setState(() {});
    await opening;
    if (!_current(session) || !identical(flow, _flow)) return;
    setState(() {});
    _showReturn();
  }

  Future<void> _showReturn() async {
    final flow = _flow, session = _session;
    if (!mounted ||
        _dialog ||
        _lifecycle != AppLifecycleState.resumed ||
        flow?.phase != RegistrationPhase.confirmation ||
        session == null ||
        !_current(session)) {
      return;
    }
    _dialog = true;
    final completed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.tr('Did you complete registration?', '你完成报名了吗？')),
        content: Text(
          context.tr(
            'Yes records your declaration as Going in ENMORI. '
                'It is not a booking or payment confirmation.',
            '选择已完成会在 ENMORI 保存你将参加的声明，不代表预约或付款已获确认。',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.tr('No', '没有')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.tr('Yes, mark Going', '已完成，标记为将参加')),
          ),
        ],
      ),
    );
    _dialog = false;
    if (!_current(session) || !identical(flow, _flow)) return;
    final saving = flow!.answer(completed == true);
    setState(() {});
    await saving;
    if (_current(session) && identical(flow, _flow)) setState(() {});
  }

  Future<void> _read() async {
    final flow = _flow;
    if (flow == null) return;
    final reading = flow.reconcile();
    setState(() {});
    await reading;
    if (mounted && identical(flow, _flow)) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final observed = participationSession(ref.watch(authSessionProvider));
    if (!identical(observed, _session)) {
      _flow?.dispose();
      _flow = null;
      _session = observed is AuthSessionAuthenticated ? observed : null;
    }
    final session = _session;
    if (session == null) {
      return Text(
        context.tr('Sign in to record participation.', '登录后可保存参与状态。'),
      );
    }
    _flow ??= ExternalRegistrationFlow(
      eventId: widget.eventId,
      sourceUrl: widget.sourceUrl,
      opener: _CurrentRegistrationOpener(() => widget.opener),
      current: () => _current(session),
      confirmGoing: (id) => widget.confirmGoing(id),
      readGoing: (id) => widget.readGoing(id),
    );
    final phase = _flow!.phase;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            context.tr(
              'Tickets and booking are handled by Ticketmaster. Its link may open booking or seat selection.',
              '购票与预订由 Ticketmaster 处理，链接可能打开预订或选座页面。',
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        if (phase == RegistrationPhase.failed)
          Text(
            context.tr(
              'Could not open the website. Try again or copy its link.',
              '无法打开网站，请重试或复制链接。',
            ),
          ),
        if (phase == RegistrationPhase.saved)
          Text(
            context.tr(
              'Going saved. This is your declaration, not a booking.',
              '已保存“将参加”，这只是你的声明，不代表完成预约。',
            ),
          ),
        if (phase == RegistrationPhase.unresolved) ...[
          Text(
            context.tr(
              'Save result is uncertain. Read participation before retrying.',
              '保存结果尚不确定，请先核对参与状态再重试。',
            ),
          ),
          OutlinedButton(
            onPressed: _read,
            child: Text(context.tr('Read participation', '核对参与状态')),
          ),
        ],
        if (phase == RegistrationPhase.saving)
          Text(context.tr('Checking participation…', '正在核对参与状态…')),
        OutlinedButton.icon(
          onPressed:
              widget.sourceAvailable &&
                  (phase == RegistrationPhase.idle ||
                      phase == RegistrationPhase.failed ||
                      phase == RegistrationPhase.saved)
              ? _open
              : null,
          icon: const Icon(Icons.open_in_new),
          label: Text(
            context.tr(
              'Tickets / booking on Ticketmaster',
              '在 Ticketmaster 购票／预订',
            ),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _flow?.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}

/// Parent rebuilds may create fresh equivalent capability objects. Resolve the
/// current injected capability only at explicit dispatch, not via identity reset.
final class _CurrentRegistrationOpener implements ExternalActivityOpener {
  const _CurrentRegistrationOpener(this.resolve);
  final ExternalActivityOpener Function() resolve;
  @override
  Future<bool> open(Uri sourceUrl, {required bool Function() current}) =>
      resolve().open(sourceUrl, current: current);
}
