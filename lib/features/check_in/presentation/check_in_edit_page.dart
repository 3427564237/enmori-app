import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../account/domain/account_repository.dart';
import '../../auth/auth_providers.dart';
import '../../auth/domain/auth_repository.dart';
import '../domain/check_in_repository.dart';
import 'check_in_edit_controller.dart';
import 'check_in_label_input.dart';

enum CheckInEditResult { saved, deleted }

final class CheckInEditPage extends ConsumerStatefulWidget {
  const CheckInEditPage({required this.checkIn, super.key});
  final CheckIn checkIn;
  @override
  ConsumerState<CheckInEditPage> createState() => _CheckInEditPageState();
}

class _CheckInEditPageState extends ConsumerState<CheckInEditPage> {
  Object? _openedSession;
  bool _sessionBound = false;
  late CheckIn _current;
  late final TextEditingController _note;
  late CheckInVisibility _visibility;
  String? _mood, _activity, _locationLabel;
  bool get _dirty =>
      _locationLabel != _current.locationLabel ||
      _mood != _current.mood ||
      _activity != _current.activity ||
      _note.text != _current.note ||
      _visibility != (_current.checkInVisibility ?? CheckInVisibility.private);
  @override
  void initState() {
    super.initState();
    final initial = ref.read(authSessionProvider).asData?.value;
    _openedSession = initial is AuthSessionAuthenticated ? initial : null;
    _sessionBound = initial != null;
    _current = widget.checkIn;
    _mood = _current.mood;
    _activity = _current.activity;
    _locationLabel = _current.locationLabel;
    _note = TextEditingController(text: _current.note);
    _visibility = _current.checkInVisibility ?? CheckInVisibility.private;
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _chooseLabel(
    String title,
    String? current,
    List<String> choices,
    void Function(String?) update,
  ) async {
    final value = await chooseCheckInLabel(
      context,
      title: title,
      current: current,
      choices: choices,
    );
    if (mounted && value != null) {
      setState(() => update(value.isEmpty ? null : value));
    }
  }

  Future<bool> _confirm(String title, String body, String action) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(context.tr('Cancel', '取消')),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(action),
            ),
          ],
        ),
      ) ??
      false;
  @override
  Widget build(BuildContext context) {
    final session = ref.watch(
      authSessionProvider.select(
        (value) => value.asData?.value is AuthSessionAuthenticated
            ? value.asData?.value
            : null,
      ),
    );
    if (!_sessionBound && ref.read(authSessionProvider).asData != null) {
      _openedSession = session;
      _sessionBound = true;
    }
    if (!identical(session, _openedSession)) {
      _note.clear();
      return Scaffold(
        appBar: AppBar(title: Text(context.tr('Edit Check-in', '编辑签到'))),
        body: Center(
          child: Text(
            context.tr(
              'Session changed. Return to your records and reopen this Check-in.',
              '登录状态已变化，请返回记录列表并重新打开这条签到。',
            ),
          ),
        ),
      );
    }
    final state = ref.watch(checkInEditControllerProvider);
    final controller = ref.read(checkInEditControllerProvider.notifier);
    final renderedEpoch = controller.epoch;
    final mustReload =
        state.failure != null &&
        state.failure!.kind != AppFailureKind.checkInInvalid;
    ref.listen(checkInEditControllerProvider, (previous, next) {
      if (next.saved != null || next.deleted) {
        Navigator.of(context).pop(
          next.deleted ? CheckInEditResult.deleted : CheckInEditResult.saved,
        );
      }
    });
    return PopScope(
      canPop: !state.pending && !_dirty,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || state.pending) return;
        if (await _confirm(
              context.tr('Discard changes?', '放弃修改？'),
              context.tr('Your unsaved changes will be lost.', '未保存的修改将会丢失。'),
              context.tr('Discard', '放弃'),
            ) &&
            context.mounted) {
          setState(() {
            _note.text = _current.note;
            _mood = _current.mood;
            _activity = _current.activity;
            _locationLabel = _current.locationLabel;
            _visibility =
                _current.checkInVisibility ?? CheckInVisibility.private;
          });
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) Navigator.pop(context);
          });
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text(context.tr('Edit Check-in', '编辑签到'))),
        body: SafeArea(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  key: const Key('check-in-edit-note'),
                  controller: _note,
                  enabled: !state.pending,
                  minLines: 3,
                  maxLines: 8,
                  maxLength: 500,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: context.tr('Note', '笔记'),
                    helperText: context.tr(
                      'Up to 500 characters',
                      '最多 500 个字符',
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    CheckInLabelChip(
                      label: _mood ?? context.tr('Mood', '心情'),
                      avatar: const Icon(Icons.mood_outlined, size: 18),
                      selected: _mood != null,
                      onPressed: state.pending
                          ? null
                          : () => _chooseLabel(
                              'Mood',
                              _mood,
                              checkInMoodChoices,
                              (v) => _mood = v,
                            ),
                    ),
                    CheckInLabelChip(
                      label: _locationLabel ?? context.tr('Location', '地点'),
                      avatar: const Icon(Icons.place_outlined, size: 18),
                      selected: _locationLabel != null,
                      onPressed: state.pending
                          ? null
                          : () => _chooseLabel(
                              'Place name',
                              _locationLabel,
                              [],
                              (v) => _locationLabel = v,
                            ),
                    ),
                    CheckInLabelChip(
                      label: _activity ?? context.tr('Activity', '活动标签'),
                      avatar: const Icon(
                        Icons.local_activity_outlined,
                        size: 18,
                      ),
                      selected: _activity != null,
                      onPressed: state.pending
                          ? null
                          : () => _chooseLabel(
                              'Activity',
                              _activity,
                              checkInActivityChoices,
                              (v) => _activity = v,
                            ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<CheckInVisibility>(
                  key: ValueKey(
                    'check-in-edit-visibility-${_current.revision}',
                  ),
                  initialValue: _visibility,
                  decoration: InputDecoration(
                    labelText: context.tr('Visibility', '可见范围'),
                  ),
                  items: [
                    DropdownMenuItem(
                      value: CheckInVisibility.private,
                      child: Text(context.tr('Private', '仅自己')),
                    ),
                    DropdownMenuItem(
                      value: CheckInVisibility.friendsOnly,
                      child: Text(context.tr('Friends-only', '仅好友')),
                    ),
                    DropdownMenuItem(
                      value: CheckInVisibility.public,
                      child: Text(context.tr('Public', '公开')),
                    ),
                  ],
                  onChanged: state.pending
                      ? null
                      : (value) => setState(() => _visibility = value!),
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr(
                    'Editing this record keeps its original date and weather.',
                    '编辑会保留原始日期和当时的天气。',
                  ),
                ),
                if (state.failure case final failure?) ...[
                  const SizedBox(height: 16),
                  Text(switch (failure.kind) {
                    AppFailureKind.checkInRevisionPreconditionFailed =>
                      context.tr(
                        'This record changed. Your draft is still here. Reload before saving.',
                        '这条记录已发生变化。草稿仍在，请重新加载后再保存。',
                      ),
                    AppFailureKind.checkInInvalid => context.tr(
                      'Add a Note or Mood; Notes can contain up to 500 characters.',
                      '请填写笔记或心情，笔记最多 500 个字符。',
                    ),
                    AppFailureKind.checkInUnavailable => context.tr(
                      'This Check-in is no longer available.',
                      '此签到已不可用。',
                    ),
                    _ => context.tr(
                      'The result could not be confirmed. Reload before trying again.',
                      '暂时无法确认结果，请重新读取后再试。',
                    ),
                  }, key: const Key('check-in-edit-error')),
                  OutlinedButton(
                    onPressed: state.pending
                        ? null
                        : () async {
                            if (_dirty &&
                                !await _confirm(
                                  context.tr('Reload Check-in?', '重新加载签到？'),
                                  context.tr(
                                    'Replace your draft with the latest saved record?',
                                    '用最新保存的记录替换当前草稿？',
                                  ),
                                  context.tr('Reload', '重新加载'),
                                )) {
                              return;
                            }
                            final latest = await controller.reload(
                              _current.checkInId,
                            );
                            if (latest != null && mounted) {
                              setState(() {
                                _current = latest;
                                _mood = latest.mood;
                                _activity = latest.activity;
                                _locationLabel = latest.locationLabel;
                                _note.text = latest.note;
                                _visibility =
                                    latest.checkInVisibility ??
                                    CheckInVisibility.private;
                              });
                            }
                          },
                    child: Text(
                      context.tr('Reload saved record', '重新读取已保存的记录'),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  key: const Key('check-in-edit-save'),
                  onPressed: state.pending || mustReload
                      ? null
                      : () => controller.save(
                          _current,
                          _note.text,
                          _visibility,
                          expectedEpoch: renderedEpoch,
                          mood: _mood,
                          activity: _activity,
                          locationLabel: _locationLabel,
                        ),
                  child: Text(
                    state.pending
                        ? context.tr('Saving…', '正在保存…')
                        : context.tr('Save changes', '保存修改'),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton.icon(
                  key: const Key('check-in-edit-delete'),
                  onPressed: state.pending || mustReload
                      ? null
                      : () async {
                          if (await _confirm(
                                context.tr('Delete Check-in?', '删除签到？'),
                                context.tr(
                                  'This removes this record from your history and shared views.',
                                  '这条记录将从历史记录和分享视图中删除。',
                                ),
                                context.tr('Delete', '删除'),
                              ) &&
                              mounted) {
                            await controller.remove(
                              _current,
                              expectedEpoch: renderedEpoch,
                            );
                          }
                        },
                  icon: const Icon(Icons.delete_outline),
                  label: Text(context.tr('Delete Check-in', '删除签到')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
