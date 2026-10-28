import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_localizations.dart';
import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../content_access.dart';
import '../domain/own_avatar.dart';
import '../own_avatar_providers.dart';
import 'own_avatar_view.dart';

final class OwnAvatarEditor extends ConsumerStatefulWidget {
  const OwnAvatarEditor({super.key});
  @override
  ConsumerState<OwnAvatarEditor> createState() => _OwnAvatarEditorState();
}

final class _OwnAvatarEditorState extends ConsumerState<OwnAvatarEditor> {
  OwnAvatar? _base;
  AvatarPhoto? _draft;
  bool _visible = false;
  bool _dirty = false, _busy = false, _picking = false, _unknown = false;
  bool _routeVisible = false;
  int _epoch = 0;
  int _pickerEpoch = 0;
  String? _attemptHash;
  AvatarPendingSave? _attempt;
  String? _message;

  bool _matchesAttempt(OwnAvatar value) {
    final attempt = _attempt;
    if (attempt == null ||
        value.revision <= attempt.revision ||
        value.visibleToAuthenticatedUsers !=
            attempt.visibleToAuthenticatedUsers) {
      return false;
    }
    // Publishing an existing canonical image may change the submitted-byte hash.
    // Byte equality also proves the intended image, without a new hashing package.
    return value.photo?.sourceSha256 == _attemptHash ||
        (value.photo != null &&
            attempt.photo != null &&
            listEquals(value.photo!.bytes, attempt.photo!.bytes));
  }

  bool get _foreground => ref.read(contentAccessProvider).foreground;
  bool _current(Object? session, int epoch) =>
      mounted &&
      epoch == _epoch &&
      _routeVisible &&
      _foreground &&
      ref.read(currentAuthSubjectProvider) != null &&
      identical(session, ref.read(authSessionProvider).asData?.value) &&
      ModalRoute.of(context)?.isCurrent == true;

  @override
  void initState() {
    super.initState();
    _attempt = ref.read(avatarPendingSaveProvider);
    if (_attempt case final pending?) {
      _unknown = true;
      _dirty = true;
      _draft = pending.photo;
      _visible = pending.visibleToAuthenticatedUsers;
      _attemptHash = pending.photo?.sourceSha256;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final visible =
        ModalRoute.of(context)?.isCurrent == true &&
        TickerMode.valuesOf(context).enabled;
    if (visible == _routeVisible) return;
    _routeVisible = visible;
    // Retire hidden reads and picker callbacks while keeping any unsaved draft
    // or unresolved write. Returning establishes a fresh authoritative revision.
    _epoch++;
    _pickerEpoch++;
    _base = null;
    _busy = false;
    _picking = false;
    if (visible) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _read());
    }
  }

  @override
  void dispose() {
    _epoch++;
    _pickerEpoch++;
    super.dispose();
  }

  Future<void> _read() async {
    if (!mounted ||
        !_routeVisible ||
        !_foreground ||
        _busy ||
        _picking ||
        ref.read(currentAuthSubjectProvider) == null) {
      return;
    }
    final session = ref.read(authSessionProvider).asData?.value;
    final epoch = ++_epoch;
    setState(() => _busy = true);
    final result = await ref
        .read(ownAvatarRepositoryProvider)
        .read(() => _current(session, epoch));
    if (!_current(session, epoch)) return;
    setState(() {
      _busy = false;
      if (result case Success<OwnAvatar>(:final value)) {
        _base = value;
        if (_unknown && _matchesAttempt(value)) {
          _unknown = false;
          _dirty = false;
          _draft = null;
          ref.read(avatarPendingSaveProvider.notifier).clear(_attempt!);
          _attempt = null;
          _message = context.tr('Saved photo confirmed.', '已确认保存的头像。');
        } else if (_unknown) {
          _message = context.tr(
            'The previous save is still unconfirmed. Your preview is kept. Check again before another save.',
            '上次保存仍未确认，预览已保留。请先再次核对，再进行保存。',
          );
        } else {
          _message = null;
        }
      } else {
        _message = context.tr(
          'Could not load the saved photo. Your preview is kept.',
          '未能读取已保存头像，预览已保留。',
        );
      }
    });
  }

  Future<void> _pick() async {
    if (!_routeVisible || !_foreground || _busy || _picking || _unknown) return;
    final session = ref.read(authSessionProvider).asData?.value;
    final pickerEpoch = ++_pickerEpoch;
    setState(() {
      _picking = true;
      _message = null;
    });
    final result = await ref.read(avatarPhotoPickerProvider).pick();
    if (!mounted ||
        pickerEpoch != _pickerEpoch ||
        !_routeVisible ||
        !identical(session, ref.read(authSessionProvider).asData?.value) ||
        ModalRoute.of(context)?.isCurrent != true) {
      return;
    }
    setState(() {
      _picking = false;
      if (result case Success<AvatarPhoto?>(value: final photo?)) {
        _draft = photo;
        _visible = true;
        _dirty = true;
      } else if (result is Failure<AvatarPhoto?>) {
        _message = context.tr(
          'Could not use that photo. Choose an image under 10 MB.',
          '无法使用该照片，请选择小于 10 MB 的图片。',
        );
      }
    });
    // The system picker backgrounds the app. Reestablish saved revision first.
    if (_foreground && _base == null) await _read();
  }

  Future<void> _save() async {
    if (!_dirty ||
        !_routeVisible ||
        _busy ||
        _picking ||
        _unknown ||
        _base == null ||
        !_foreground) {
      return;
    }
    final session = ref.read(authSessionProvider).asData?.value;
    final epoch = ++_epoch;
    final revision = _base!.revision, desired = _draft;
    final attempt = AvatarPendingSave(
      revision: revision,
      photo: desired,
      visibleToAuthenticatedUsers: _visible,
    );
    if (!ref.read(avatarPendingSaveProvider.notifier).begin(attempt)) return;
    setState(() {
      _attempt = attempt;
      _busy = true;
      _unknown = true;
      _attemptHash = desired?.sourceSha256;
      _message = null;
    });
    final result = await ref
        .read(ownAvatarRepositoryProvider)
        .save(
          photo: desired,
          visibleToAuthenticatedUsers: _visible,
          expectedRevision: revision,
          current: () => _current(session, epoch),
        );
    if (!_current(session, epoch)) return;
    setState(() {
      _busy = false;
      if (result case Success<OwnAvatar>(:final value)
          when _matchesAttempt(value)) {
        _base = value;
        _dirty = false;
        _unknown = false;
        _draft = null;
        ref.read(avatarPendingSaveProvider.notifier).clear(attempt);
        _attempt = null;
        _message = context.tr('Photo saved.', '头像已保存。');
      } else if (result case Failure<OwnAvatar>(:final failure)
          when failure.kind == AppFailureKind.profileInvalid ||
              failure.kind ==
                  AppFailureKind.profileRevisionPreconditionFailed) {
        _unknown = false;
        _base = null;
        ref.read(avatarPendingSaveProvider.notifier).clear(attempt);
        _attempt = null;
        _message = context.tr(
          'The photo or saved version changed. Reload before saving your preview.',
          '照片或已保存版本有变化，请重新读取后再保存预览。',
        );
      } else {
        _message = context.tr(
          'Save not confirmed. Check the saved photo; do not resend yet.',
          '保存尚未确认，请核对已保存头像，暂勿重发。',
        );
      }
    });
    ref.invalidate(ownAvatarProvider);
    ref.read(contentAccessProvider.notifier).mutationSettled(session);
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(contentAccessProvider);
    ref.listen(authSessionProvider, (before, after) {
      if (!identical(before?.asData?.value, after.asData?.value)) {
        setState(() {
          _epoch++;
          _pickerEpoch++;
          _base = null;
          _draft = null;
          _visible = false;
          _dirty = false;
          _unknown = false;
          _busy = false;
          _picking = false;
          _attempt = null;
          _attemptHash = null;
        });
        if (ref.read(currentAuthSubjectProvider) != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _read());
        }
      }
    });
    ref.listen(contentAccessProvider, (before, after) {
      if (!after.foreground) {
        setState(() {
          _epoch++;
          _base = null;
          _busy = false;
        });
      } else if (before?.foreground == false) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _read());
      }
    });
    final locked =
        _busy || _picking || _unknown || !access.foreground || !_routeVisible;
    return PopScope(
      canPop: !_busy,
      child: Scaffold(
        appBar: AppBar(title: Text(context.tr('My photo', '我的照片'))),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: AvatarPixels(
                  photo: access.foreground && _routeVisible
                      ? (_dirty ? _draft : _base?.photo)
                      : null,
                  initial: '?',
                  size: 144,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                context.tr(
                  'New or replaced photos are visible to all signed-in users. Your profile privacy does not hide your shared photo.',
                  '新上传或更换的头像对所有已登录用户可见，独立于个人资料隐私设置。',
                ),
              ),
              Text(
                context.tr(
                  'Choose a photo, review the square preview, then save. The original photo is not uploaded.',
                  '选择照片并检查方形预览，保存后才会上传小头像，不上传原图。',
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                key: const Key('avatar-pick'),
                onPressed: locked ? null : _pick,
                icon: const Icon(Icons.add_photo_alternate_outlined),
                label: Text(context.tr('Choose photo', '选择照片')),
              ),
              if (!_dirty &&
                  _base?.photo != null &&
                  _base?.visibleToAuthenticatedUsers == false) ...[
                Text(
                  context.tr(
                    'Your existing photo is private until you explicitly share it.',
                    '这张旧头像仍仅本人可见，确认公开后其他用户才能看到。',
                  ),
                ),
                OutlinedButton(
                  key: const Key('avatar-publish'),
                  onPressed: locked
                      ? null
                      : () => setState(() {
                          _draft = _base!.photo;
                          _visible = true;
                          _dirty = true;
                        }),
                  child: Text(
                    context.tr(
                      'Share this photo with signed-in users',
                      '将这张头像对已登录用户公开',
                    ),
                  ),
                ),
              ],
              TextButton(
                key: const Key('avatar-remove'),
                onPressed: locked || (_base?.photo == null && !_dirty)
                    ? null
                    : () => setState(() {
                        _draft = null;
                        _visible = false;
                        _dirty = true;
                        _message = null;
                      }),
                child: Text(context.tr('Remove photo', '移除头像')),
              ),
              FilledButton(
                key: const Key('avatar-save'),
                onPressed: locked || !_dirty || _base == null ? null : _save,
                child: Text(context.tr('Save photo', '保存头像')),
              ),
              if (_busy || _picking) const LinearProgressIndicator(),
              if (_message != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(_message!),
                ),
              if (_base == null || _unknown)
                TextButton(
                  key: const Key('avatar-check'),
                  onPressed: _busy || _picking ? null : _read,
                  child: Text(context.tr('Check saved photo', '核对已保存头像')),
                ),
              TextButton(
                onPressed: _busy ? null : () => Navigator.of(context).pop(),
                child: Text(
                  _unknown
                      ? context.tr(
                          'Close; keep this save for checking',
                          '关闭并保留待核对保存',
                        )
                      : _dirty
                      ? context.tr(
                          'Close without saving this preview',
                          '关闭且不保存此预览',
                        )
                      : context.tr('Done', '完成'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
