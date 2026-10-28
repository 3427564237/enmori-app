import 'own_profile_header.dart';

import 'package:enmori/core/presentation/enmori_localizations.dart';

import '../domain/profile_details.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/presentation/enmori_motion.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/account_preferences_repository.dart';
import '../domain/account_repository.dart';
import 'account_preferences_controller.dart';
import 'preferences_recovery.dart';
import 'account_feedback.dart';

final class AccountPreferencesPage extends ConsumerWidget {
  const AccountPreferencesPage({
    required this.view,
    this.languageSection,
    this.recommendationSection,
    this.onEditProfile,
    this.onSignOut,
    this.aiOnly = false,
    this.onOpenPersonas,
    super.key,
  });
  final PreferencesView view;
  final Widget? languageSection, recommendationSection;
  final bool aiOnly;
  final VoidCallback? onOpenPersonas;
  final Future<void> Function()? onEditProfile;
  final Future<Result<void>> Function()? onSignOut;
  @override
  Widget build(BuildContext context, WidgetRef ref) => _AccountPreferencesForm(
    key: ValueKey((view, ref.watch(authSessionProvider).asData?.value)),
    view: view,
    languageSection: languageSection,
    recommendationSection: recommendationSection,
    onEditProfile: onEditProfile,
    onSignOut: onSignOut,
    aiOnly: aiOnly,
    onOpenPersonas: onOpenPersonas,
  );
}

// Drafts and asynchronous signout feedback belong to one observed session.
final class _AccountPreferencesForm extends ConsumerStatefulWidget {
  const _AccountPreferencesForm({
    required this.view,
    this.languageSection,
    this.recommendationSection,
    this.onEditProfile,
    this.onSignOut,
    this.aiOnly = false,
    this.onOpenPersonas,
    super.key,
  });
  final PreferencesView view;
  final Widget? languageSection, recommendationSection;
  final bool aiOnly;
  final VoidCallback? onOpenPersonas;
  final Future<void> Function()? onEditProfile;
  final Future<Result<void>> Function()? onSignOut;

  @override
  ConsumerState<_AccountPreferencesForm> createState() =>
      _AccountPreferencesPageState();
}

final class _AccountPreferencesPageState
    extends ConsumerState<_AccountPreferencesForm> {
  final _name = TextEditingController();
  final _bio = TextEditingController();
  final _affiliation = TextEditingController();
  final _region = TextEditingController();
  AffiliationType? _affiliationType;
  FieldPrivacy _privacy = const FieldPrivacy();
  int? _revision;
  (OwnProfile, OwnProfile)? _profileRecovery;
  (OwnSettings, OwnSettings)? _settingsRecovery;
  List<String>? _reviewConflicts;
  ProfileVisibility _profileVisibility = ProfileVisibility.private;
  CheckInVisibility _checkInVisibility = CheckInVisibility.private;
  OptionalProcessingConsent _consent = OptionalProcessingConsent.rejected;
  bool _defaultLocation = false,
      _defaultWeather = false,
      _homeWeatherAuto = false;
  bool _signingOut = false;
  bool _allowPopAfterDiscard = false;
  bool _confirmingLeave = false;
  String? _signOutError;
  @override
  void dispose() {
    _name.dispose();
    _bio.dispose();
    _affiliation.dispose();
    _region.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    final provider = accountPreferencesControllerProvider(widget.view);
    final state = ref.watch(provider);
    final revision = state.profile?.revision ?? state.settings?.revision;
    if (revision != null &&
        (revision != _revision ||
            _profileRecovery != null ||
            _settingsRecovery != null) &&
        state.phase == PreferencesPhase.ready) {
      _revision = revision;
      var profile = state.profile;
      var settings = state.settings;
      if (_profileRecovery case final recovery? when profile != null) {
        final review = reviewProfileDraft(
          base: recovery.$1,
          draft: recovery.$2,
          latest: profile,
        );
        profile = review.value;
        _reviewConflicts = review.conflicts;
        _profileRecovery = null;
      }
      if (_settingsRecovery case final recovery? when settings != null) {
        final review = reviewSettingsDraft(
          base: recovery.$1,
          draft: recovery.$2,
          latest: settings,
        );
        settings = review.value;
        _reviewConflicts = review.conflicts;
        _settingsRecovery = null;
      }
      _setFields(profile, settings);
    }
    final ready = state.phase == PreferencesPhase.ready && !_signingOut;
    final profile = widget.view == PreferencesView.profile;
    final controller = ref.read(provider.notifier);
    final details = state.profile?.details ?? const ProfileDetails();
    final privacy = state.settings?.fieldPrivacy ?? const FieldPrivacy();
    final dirty = profile
        ? _name.text != (state.profile?.displayName ?? '') ||
              _bio.text != (details.bio ?? '') ||
              _affiliationType != details.affiliationType ||
              _affiliation.text != (details.affiliationName ?? '') ||
              _region.text != (details.region ?? '') ||
              _profileVisibility !=
                  (state.profile?.visibility ?? ProfileVisibility.private)
        : _homeWeatherAuto != (state.settings?.homeWeatherAuto ?? false) ||
              _defaultLocation !=
                  (state.settings?.defaultCheckInLocation ?? false) ||
              _defaultWeather !=
                  (state.settings?.defaultCheckInWeather ?? false) ||
              _checkInVisibility !=
                  (state.settings?.checkInVisibility ??
                      CheckInVisibility.private) ||
              _consent !=
                  (state.settings?.consent ??
                      OptionalProcessingConsent.rejected) ||
              _privacy.interests != privacy.interests ||
              _privacy.location != privacy.location ||
              _privacy.participation != privacy.participation ||
              _privacy.mapSharedWithFriends != privacy.mapSharedWithFriends;
    final busy = state.phase == PreferencesPhase.saving || _signingOut;
    final saveButton = FilledButton(
      key: Key(profile ? 'profile-save' : 'settings-save'),
      onPressed: ready
          ? () {
              FocusScope.of(context).unfocus();
              setState(() => _reviewConflicts = null);
              if (profile) {
                controller.saveProfile(
                  _name.text.trim().isEmpty ? null : _name.text,
                  _profileVisibility,
                  details: ProfileDetails(
                    bio: _nullable(_bio.text),
                    affiliationType: _affiliationType,
                    affiliationName: _affiliationType == null
                        ? null
                        : _nullable(_affiliation.text),
                    region: _nullable(_region.text),
                  ),
                );
              } else {
                controller.saveSettings(
                  _checkInVisibility,
                  _consent,
                  fieldPrivacy: _privacy,
                  defaultCheckInLocation: _defaultLocation,
                  defaultCheckInWeather: _defaultWeather,
                  homeWeatherAuto: _homeWeatherAuto,
                );
              }
            }
          : null,
      child: MotionReveal(
        trigger: state.phase,
        distance: 0,
        child: Text(
          state.phase == PreferencesPhase.saving
              ? context.tr('Saving…', "正在保存…")
              : context.tr('Save', "保存"),
        ),
      ),
    );
    final page = Scaffold(
      appBar: AppBar(
        title: Text(
          profile
              ? context.tr('Edit profile', "编辑资料")
              : widget.aiOnly
              ? context.tr('AI settings', "AI 设置")
              : context.tr('Settings', "设置"),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.only(bottom: keyboardInset),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (keyboardInset == 0)
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      state.phase == PreferencesPhase.saving
                          ? context.tr(
                              'Saving and checking your changes…',
                              "正在保存并核对更改…",
                            )
                          : state.phase == PreferencesPhase.loading
                          ? context.tr('Reading latest values…', "正在读取最新设置…")
                          : state.message != null
                          ? context.tr('Changes need attention', "请处理更改中的问题")
                          : dirty
                          ? context.tr('Unsaved changes', "有未保存的更改")
                          : state.saved
                          ? (profile
                                ? context.tr('Profile saved.', "资料已保存。")
                                : context.tr('Settings saved.', "设置已保存。"))
                          : context.tr('Your saved preferences', "当前已保存的偏好"),
                      key: state.saved && !dirty
                          ? const Key('preferences-save-success')
                          : const Key('preferences-save-status'),
                      style: Theme.of(context).textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                  ),
                if (keyboardInset == 0) const SizedBox(height: 8),
                saveButton,
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              key: Key(profile ? 'route-profile-edit' : 'route-settings'),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!profile &&
                      !widget.aiOnly &&
                      widget.languageSection != null) ...[
                    widget.languageSection!,
                    const Divider(height: 32),
                  ],
                  if (_reviewConflicts case final conflicts? when ready)
                    _ReviewNotice(
                      message: _reviewCopy(conflicts),
                      latest: conflicts.isEmpty
                          ? null
                          : [
                              context.tr('Latest saved values:', '最新保存值：'),
                              for (final field in conflicts)
                                '${_conflictLabel(field)}：${_latestValue(field, state)}',
                            ].join('\n'),
                      onUseLatest: () => setState(() {
                        _setFields(state.profile, state.settings);
                        _reviewConflicts = null;
                      }),
                    ),
                  if (state.message case final message?) ...[
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        accountFeedback(context, message),
                        key: const Key('preferences-error'),
                      ),
                    ),
                    if (state.phase == PreferencesPhase.failed ||
                        state.phase == PreferencesPhase.reloadRequired) ...[
                      if (state.profile != null || state.settings != null)
                        FilledButton.tonal(
                          key: const Key('preferences-review'),
                          onPressed: () {
                            if (state.profile case final base?) {
                              _profileRecovery ??= (base, _profileDraft(base));
                            }
                            if (state.settings case final base?) {
                              _settingsRecovery ??= (
                                base,
                                _settingsDraft(base),
                              );
                            }
                            controller.load();
                          },
                          child: Text(
                            context.tr(
                              'Check latest & keep my edits',
                              "读取最新值并保留我的修改",
                            ),
                          ),
                        ),
                      OutlinedButton(
                        key: const Key('preferences-reload'),
                        onPressed: () {
                          _revision = null;
                          _profileRecovery = null;
                          _settingsRecovery = null;
                          _reviewConflicts = null;
                          controller.load();
                        },
                        child: Text(
                          dirty
                              ? context.tr(
                                  'Discard edits and reload',
                                  "放弃修改并重新加载",
                                )
                              : context.tr('Reload', "重新加载"),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                  ],
                  if (state.phase == PreferencesPhase.loading)
                    const Center(child: CircularProgressIndicator())
                  else if (state.phase != PreferencesPhase.failed) ...[
                    if (profile) ...[
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          context.tr(
                            'Username (cannot be changed)',
                            "用户名（不可修改）",
                          ),
                        ),
                        subtitle: Text(state.profile?.username ?? ''),
                      ),
                      TextField(
                        key: const Key('profile-display-name'),
                        controller: _name,
                        onChanged: (_) => setState(() {}),
                        enabled: ready,
                        decoration: InputDecoration(
                          labelText: context.tr(
                            'Display name (optional)',
                            "显示名称（选填）",
                          ),
                          helperText: context.tr(
                            'Use up to 50 characters. Leave blank to unset.',
                            "最多 50 个字符，留空可清除。",
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        key: const Key('profile-bio'),
                        controller: _bio,
                        onChanged: (_) => setState(() {}),
                        enabled: ready,
                        maxLength: 500,
                        minLines: 2,
                        maxLines: 5,
                        decoration: InputDecoration(
                          labelText: context.tr('BIO', "个人简介"),
                          helperText: context.tr(
                            'A little about you.',
                            "简单介绍一下自己。",
                          ),
                        ),
                      ),
                      DropdownButton<AffiliationType?>(
                        key: const Key('profile-affiliation-type'),
                        value: _affiliationType,
                        isExpanded: true,
                        items: [
                          DropdownMenuItem(
                            value: null,
                            child: Text(
                              context.tr('No school or company', "不填写学校或公司"),
                            ),
                          ),
                          DropdownMenuItem(
                            value: AffiliationType.school,
                            child: Text(context.tr('School', "学校")),
                          ),
                          DropdownMenuItem(
                            value: AffiliationType.company,
                            child: Text(context.tr('Company', "公司")),
                          ),
                        ],
                        onChanged: ready
                            ? (value) => setState(() {
                                _affiliationType = value;
                                if (value == null) _affiliation.clear();
                              })
                            : null,
                      ),
                      TextField(
                        key: const Key('profile-affiliation-name'),
                        controller: _affiliation,
                        onChanged: (_) => setState(() {}),
                        enabled: ready && _affiliationType != null,
                        maxLength: 120,
                        decoration: InputDecoration(
                          labelText: context.tr(
                            'School / company name',
                            "学校／公司名称",
                          ),
                        ),
                      ),
                      if (widget.recommendationSection != null)
                        widget.recommendationSection!,
                      TextField(
                        key: const Key('profile-region'),
                        readOnly: widget.recommendationSection != null,
                        controller: _region,
                        onChanged: (_) => setState(() {}),
                        enabled: ready,
                        maxLength: 120,
                        decoration: InputDecoration(
                          labelText: context.tr(
                            'Legacy region (kept for reference)',
                            '原地区（保留供参考）',
                          ),
                        ),
                      ),
                      Text(
                        context.tr(
                          'Choose your standard home area in Recommendation profile.',
                          '请在推荐资料中选择标准常用地区。',
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        context.tr('Profile visibility', "资料可见范围"),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      DropdownButton<ProfileVisibility>(
                        key: const Key('profile-visibility'),
                        isExpanded: true,
                        value: _profileVisibility,
                        items: [
                          for (final v in ProfileVisibility.values)
                            DropdownMenuItem(
                              value: v,
                              child: Text(_profileLabel(v)),
                            ),
                        ],
                        onChanged: ready
                            ? (v) {
                                if (v != null) {
                                  setState(() => _profileVisibility = v);
                                }
                              }
                            : null,
                      ),
                    ] else ...[
                      if (!widget.aiOnly) ...[
                        Text(
                          context.tr('Profile & audience', "资料与可见范围"),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          context.tr(
                            'Profile visibility controls who may view your profile. Check-in visibility is the default for future check-ins.',
                            "资料可见范围决定谁能查看你的个人资料。签到可见范围是以后新签到使用的默认值。",
                          ),
                        ),
                        OutlinedButton(
                          key: const Key('settings-profile'),
                          onPressed: ready ? widget.onEditProfile : null,
                          child: Text(
                            context.tr('Edit profile visibility', "修改资料可见范围"),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          context.tr('Future Check-ins', "新签到默认设置"),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          context.tr(
                            'Default visibility • existing records stay unchanged',
                            "默认可见范围 · 不改变已有记录",
                          ),
                        ),
                        DropdownButton<CheckInVisibility>(
                          key: const Key('settings-visibility'),
                          isExpanded: true,
                          value: _checkInVisibility,
                          items: [
                            for (final v in CheckInVisibility.values)
                              DropdownMenuItem(
                                value: v,
                                child: Text(_checkInLabel(v)),
                              ),
                          ],
                          onChanged: ready
                              ? (v) {
                                  if (v != null) {
                                    setState(() => _checkInVisibility = v);
                                  }
                                }
                              : null,
                        ),
                        const SizedBox(height: 24),
                        Text(
                          context.tr('Include in new drafts', "新草稿默认附加"),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        SwitchListTile(
                          key: const Key('settings-default-location'),
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            context.tr('Attach location by default', "默认附加位置"),
                          ),
                          subtitle: Text(
                            context.tr(
                              'Allow one current precise GPS point to be saved when you open a new Check-in. No background tracking. You can turn it off for any draft.',
                              "允许打开新签到时获取一个当前精确 GPS 点并随签到保存。不进行后台追踪，每次草稿都可单独关闭。",
                            ),
                          ),
                          value: _defaultLocation,
                          onChanged: ready
                              ? (v) => setState(() => _defaultLocation = v)
                              : null,
                        ),
                        SwitchListTile(
                          key: const Key('settings-default-weather'),
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            context.tr('Attach weather by default', "默认附加天气"),
                          ),
                          subtitle: Text(
                            context.tr(
                              'Allow Open-Meteo weather lookup using coordinates rounded to 0.1°. No Note or precise point is sent. Open-Meteo may retain request metadata. Requires GPS; this does not enable location. Weather failure still allows saving.',
                              "允许使用四舍五入到 0.1° 的坐标查询 Open-Meteo 天气，不发送签到文字或精确坐标。Open-Meteo 可能保留请求元数据。需要 GPS；此选项不会自动开启位置。天气查询失败仍可保存签到。",
                            ),
                          ),
                          value: _defaultWeather,
                          onChanged: ready
                              ? (v) => setState(() => _defaultWeather = v)
                              : null,
                        ),
                        Text(
                          context.tr(
                            'Save to apply these choices to future Check-ins. Turn either off here to revoke its default. Saved records stay unchanged.',
                            "保存后应用于之后的新签到。在此关闭任一选项即可撤销对应默认设置，不改变已保存的记录。",
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          context.tr('Your Home', "首页偏好"),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        SwitchListTile(
                          key: const Key('settings-home-weather'),
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            context.tr(
                              'Get weather automatically on Home',
                              "在首页自动获取天气",
                            ),
                          ),
                          subtitle: Text(
                            context.tr(
                              'Use one foreground approximate location, rounded to 0.1°, to get weather through ENMORI from Open-Meteo. Open-Meteo may retain request metadata. No precise point or identity is sent. Refreshes at most every 15 minutes automatically; no background tracking. Independent of Check-in defaults. Save to apply.',
                              "在前台获取一次位置，四舍五入到 0.1° 后通过 ENMORI 向 Open-Meteo 查询天气。Open-Meteo 可能保留请求元数据，不会收到精确坐标或身份信息。自动刷新间隔至少 15 分钟，不进行后台追踪。此选项独立于签到默认设置，保存后生效。",
                            ),
                          ),
                          value: _homeWeatherAuto,
                          onChanged: ready
                              ? (v) => setState(() => _homeWeatherAuto = v)
                              : null,
                        ),
                        const SizedBox(height: 24),
                        Text(
                          context.tr('Sharing controls', "分享控制"),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        _privacyChoice(
                          context.tr('Interests', "兴趣"),
                          _privacy.interests,
                          ready,
                          (v) => FieldPrivacy(
                            interests: v,
                            location: _privacy.location,
                            participation: _privacy.participation,
                            mapSharedWithFriends: _privacy.mapSharedWithFriends,
                          ),
                        ),
                        _privacyChoice(
                          context.tr('Location', "位置"),
                          _privacy.location,
                          ready,
                          (v) => FieldPrivacy(
                            interests: _privacy.interests,
                            location: v,
                            participation: _privacy.participation,
                            mapSharedWithFriends: _privacy.mapSharedWithFriends,
                          ),
                        ),
                        _privacyChoice(
                          context.tr('Activity participation', "活动参与"),
                          _privacy.participation,
                          ready,
                          (v) => FieldPrivacy(
                            interests: _privacy.interests,
                            location: _privacy.location,
                            participation: v,
                            mapSharedWithFriends: _privacy.mapSharedWithFriends,
                          ),
                        ),
                        SwitchListTile(
                          key: const Key('settings-map-sharing'),
                          title: Text(
                            context.tr(
                              'Share Check-in map with friends',
                              "与好友分享签到地图",
                            ),
                          ),
                          subtitle: Text(
                            context.tr(
                              'Only points allowed by each Check-in and location setting can be shown.',
                              "仅显示每条签到及位置设置均允许分享的地点。",
                            ),
                          ),
                          value: _privacy.mapSharedWithFriends,
                          onChanged: ready
                              ? (v) => setState(
                                  () => _privacy = FieldPrivacy(
                                    interests: _privacy.interests,
                                    location: _privacy.location,
                                    participation: _privacy.participation,
                                    mapSharedWithFriends: v,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(height: 24),
                      ],
                      if (widget.aiOnly) ...[
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.person_outline),
                          title: Text(context.tr('Persona context', "AI 角色设定")),
                          subtitle: Text(
                            context.tr(
                              'View your active Persona and manage its profile.',
                              "查看当前 AI 角色并管理角色资料。",
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: widget.onOpenPersonas,
                        ),
                        const Divider(),
                        Text(
                          context.tr(
                            'AI replies can be mistaken. Review suggestions before acting on them. Your existing data-use choice below also applies to personalised suggestions.',
                            "AI 回答可能有误，采取行动前请先核实建议。下方现有的数据使用选择也适用于个性化建议。",
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                      Text(
                        context.tr('Personalised suggestions', "个性化建议"),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        context.tr(
                          'Choose whether to allow optional data use for relevant personalised suggestions. This does not change who can see your profile or records. You can still browse activities with this off.',
                          "选择是否允许可选数据使用，以提供相关的个性化建议。此选项不会改变资料或记录的可见范围，关闭后仍可浏览活动。",
                        ),
                      ),
                      SwitchListTile(
                        key: const Key('settings-consent'),
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          context.tr('Allow optional data use', "允许可选数据使用"),
                        ),
                        value: _consent == OptionalProcessingConsent.accepted,
                        onChanged: ready
                            ? (v) => setState(
                                () => _consent = v
                                    ? OptionalProcessingConsent.accepted
                                    : OptionalProcessingConsent.rejected,
                              )
                            : null,
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                  if (!profile && !widget.aiOnly) ...[
                    const Divider(height: 32),
                    Text(
                      context.tr('Account', "账号"),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      key: const Key('settings-sign-out'),
                      onPressed:
                          widget.onSignOut == null ||
                              _signingOut ||
                              state.phase == PreferencesPhase.saving
                          ? null
                          : () async {
                              final command = widget.onSignOut;
                              if (command == null) return;
                              setState(() {
                                _signingOut = true;
                                _signOutError = null;
                              });
                              final result = await command();
                              if (!mounted) return;
                              setState(() {
                                _signingOut = false;
                                if (result is Failure<void>) {
                                  _signOutError = context.tr(
                                    'Could not sign out. Try again.',
                                    "退出登录失败，请重试。",
                                  );
                                }
                              });
                            },
                      child: Text(context.tr('Sign out', "退出登录")),
                    ),
                    if (_signOutError case final error?) Text(error),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return PopScope<void>(
      canPop: (!dirty && !busy) || _allowPopAfterDiscard,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop ||
            busy ||
            !dirty ||
            _allowPopAfterDiscard ||
            _confirmingLeave) {
          return;
        }
        _confirmingLeave = true;
        final discard = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(context.tr('Leave without saving?', "放弃保存并离开？")),
            content: Text(
              context.tr('Your unsaved changes will be lost.', "未保存的更改将丢失。"),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(context.tr('Stay', "继续编辑")),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(context.tr('Discard changes', "放弃更改")),
              ),
            ],
          ),
        );
        _confirmingLeave = false;
        if (discard == true && mounted) {
          setState(() => _allowPopAfterDiscard = true);
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) Navigator.of(context).pop();
          });
        }
      },
      child: page,
    );
  }

  String _reviewCopy(List<String> conflicts) => conflicts.isEmpty
      ? context.tr(
          'Latest values loaded. Your edits are kept; other fields use the latest saved values. Review the form, then Save to apply any remaining changes.',
          "已读取最新值，并保留你的修改；其他字段采用最新保存值。请检查表单，再保存仍需应用的更改。",
        )
      : context.tr(
          'Also changed elsewhere: ${conflicts.join(', ')}. Your edits are shown for these fields. Review before saving, or use all latest saved values.',
          '以下项目也在其他位置发生了变化：${conflicts.map(_conflictLabel).join('、')}。目前显示你的修改，请检查后再保存，或全部使用最新保存值。',
        );

  String _conflictLabel(String label) => switch (label) {
    "School / company" => context.tr(label, "学校／公司"),
    "Display name" => context.tr(label, "显示名称"),
    "Profile visibility" => context.tr(label, "资料可见范围"),
    "BIO" => context.tr(label, "个人简介"),
    "Region" => context.tr(label, "地区"),
    "Check-in default visibility" => context.tr(label, "签到默认可见范围"),
    "Optional data use" => context.tr(label, "可选数据使用"),
    "Check-in location" => context.tr(label, "签到位置"),
    "Check-in weather" => context.tr(label, "签到天气"),
    "Home weather" => context.tr(label, "首页天气"),
    "Interests visibility" => context.tr(label, "兴趣可见范围"),
    "Location visibility" => context.tr(label, "位置可见范围"),
    "Activity participation visibility" => context.tr(label, "活动参与可见范围"),
    "Map sharing" => context.tr(label, "地图分享"),
    _ => label,
  };

  String _latestValue(String field, PreferencesState state) {
    final profile = state.profile;
    final settings = state.settings;
    final value = switch (field) {
      'Display name' => profile?.displayName,
      'BIO' => profile?.details.bio,
      'Region' => profile?.details.region,
      'School / company' =>
        profile?.details.affiliationName == null
            ? null
            : '${profile!.details.affiliationType == AffiliationType.company ? context.tr('Company', '公司') : context.tr('School', '学校')} · ${profile.details.affiliationName}',
      'Profile visibility' =>
        profile == null ? null : _profileLabel(profile.visibility),
      'Check-in default visibility' =>
        settings == null ? null : _checkInLabel(settings.checkInVisibility),
      'Optional data use' =>
        settings == null
            ? null
            : _onOff(settings.consent == OptionalProcessingConsent.accepted),
      'Check-in location' =>
        settings == null ? null : _onOff(settings.defaultCheckInLocation),
      'Check-in weather' =>
        settings == null ? null : _onOff(settings.defaultCheckInWeather),
      'Home weather' =>
        settings == null ? null : _onOff(settings.homeWeatherAuto),
      'Interests visibility' =>
        settings == null
            ? null
            : _profileLabel(settings.fieldPrivacy.interests),
      'Location visibility' =>
        settings == null ? null : _profileLabel(settings.fieldPrivacy.location),
      'Activity participation visibility' =>
        settings == null
            ? null
            : _profileLabel(settings.fieldPrivacy.participation),
      'Map sharing' =>
        settings == null
            ? null
            : _onOff(settings.fieldPrivacy.mapSharedWithFriends),
      _ => null,
    };
    return value ?? context.tr('Not set', '未设置');
  }

  String _onOff(bool value) =>
      value ? context.tr('On', '开启') : context.tr('Off', '关闭');

  OwnProfile _profileDraft(OwnProfile base) => OwnProfile(
    username: base.username,
    revision: base.revision,
    displayName: _nullable(_name.text),
    visibility: _profileVisibility,
    details: ProfileDetails(
      bio: _nullable(_bio.text),
      affiliationType: _affiliationType,
      affiliationName: _affiliationType == null
          ? null
          : _nullable(_affiliation.text),
      region: _nullable(_region.text),
    ),
  );

  OwnSettings _settingsDraft(OwnSettings base) => OwnSettings(
    revision: base.revision,
    checkInVisibility: _checkInVisibility,
    consent: _consent,
    defaultCheckInLocation: _defaultLocation,
    defaultCheckInWeather: _defaultWeather,
    homeWeatherAuto: _homeWeatherAuto,
    fieldPrivacy: _privacy,
  );

  void _setFields(OwnProfile? profile, OwnSettings? settings) {
    _name.text = profile?.displayName ?? '';
    _bio.text = profile?.details.bio ?? '';
    _affiliation.text = profile?.details.affiliationName ?? '';
    final region = profile?.details.region ?? '';
    _region.text = isCoordinateRegion(region) ? '' : region;
    _affiliationType = profile?.details.affiliationType;
    _profileVisibility = profile?.visibility ?? ProfileVisibility.private;
    _defaultLocation = settings?.defaultCheckInLocation ?? false;
    _defaultWeather = settings?.defaultCheckInWeather ?? false;
    _homeWeatherAuto = settings?.homeWeatherAuto ?? false;
    _privacy = settings?.fieldPrivacy ?? const FieldPrivacy();
    _checkInVisibility =
        settings?.checkInVisibility ?? CheckInVisibility.private;
    _consent = settings?.consent ?? OptionalProcessingConsent.rejected;
  }

  String? _nullable(String value) => value.trim().isEmpty ? null : value.trim();
  Widget _privacyChoice(
    String label,
    ProfileVisibility value,
    bool ready,
    FieldPrivacy Function(ProfileVisibility) update,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(context.tr('$label visibility', '$label可见范围')),
      DropdownButton<ProfileVisibility>(
        value: value,
        isExpanded: true,
        items: [
          for (final v in ProfileVisibility.values)
            DropdownMenuItem(value: v, child: Text(_profileLabel(v))),
        ],
        onChanged: ready
            ? (v) {
                if (v != null) setState(() => _privacy = update(v));
              }
            : null,
      ),
    ],
  );

  String _profileLabel(ProfileVisibility v) => switch (v) {
    ProfileVisibility.private => context.tr('Private', "私密"),
    ProfileVisibility.friendsOnly => context.tr('Friends only', "仅好友"),
    ProfileVisibility.public => context.tr('Public', "公开"),
  };
  String _checkInLabel(CheckInVisibility v) => switch (v) {
    CheckInVisibility.private => context.tr('Private', "私密"),
    CheckInVisibility.friendsOnly => context.tr('Friends only', "仅好友"),
    CheckInVisibility.public => context.tr('Public', "公开"),
  };
}

final class _ReviewNotice extends StatelessWidget {
  const _ReviewNotice({
    required this.message,
    this.latest,
    required this.onUseLatest,
  });
  final String message;
  final String? latest;
  final VoidCallback onUseLatest;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            context.tr('Review your changes', "检查更改"),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Semantics(
            liveRegion: true,
            child: Text(message, key: const Key('preferences-review-message')),
          ),
          if (latest != null) ...[const SizedBox(height: 12), Text(latest!)],
          TextButton(
            key: const Key('preferences-use-latest'),
            onPressed: onUseLatest,
            child: Text(context.tr('Use all latest saved values', "全部使用最新保存值")),
          ),
        ],
      ),
    ),
  );
}
