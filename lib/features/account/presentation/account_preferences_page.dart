import '../domain/profile_details.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../../auth/auth_providers.dart';
import '../domain/account_preferences_repository.dart';
import '../domain/account_repository.dart';
import 'account_preferences_controller.dart';

final class AccountPreferencesPage extends ConsumerWidget {
  const AccountPreferencesPage({
    required this.view,
    this.onEditProfile,
    this.onSignOut,
    this.aiOnly = false,
    this.onOpenPersonas,
    super.key,
  });
  final PreferencesView view;
  final bool aiOnly;
  final VoidCallback? onOpenPersonas;
  final Future<void> Function()? onEditProfile;
  final Future<Result<void>> Function()? onSignOut;
  @override
  Widget build(BuildContext context, WidgetRef ref) => _AccountPreferencesForm(
    key: ValueKey((view, ref.watch(authSessionProvider).asData?.value)),
    view: view,
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
    this.onEditProfile,
    this.onSignOut,
    this.aiOnly = false,
    this.onOpenPersonas,
    super.key,
  });
  final PreferencesView view;
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
  ProfileVisibility _profileVisibility = ProfileVisibility.private;
  CheckInVisibility _checkInVisibility = CheckInVisibility.private;
  OptionalProcessingConsent _consent = OptionalProcessingConsent.rejected;
  bool _defaultLocation = false, _defaultWeather = false;
  bool _signingOut = false;
  bool _allowPopAfterDiscard = false;
  bool _confirmingLeave = false;
  bool _locating = false;
  String? _locationMessage;
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
    final provider = accountPreferencesControllerProvider(widget.view);
    final state = ref.watch(provider);
    final revision = state.profile?.revision ?? state.settings?.revision;
    if (revision != null &&
        revision != _revision &&
        state.phase == PreferencesPhase.ready) {
      _revision = revision;
      _name.text = state.profile?.displayName ?? '';
      _bio.text = state.profile?.details.bio ?? '';
      _affiliation.text = state.profile?.details.affiliationName ?? '';
      _region.text = state.profile?.details.region ?? '';
      _affiliationType = state.profile?.details.affiliationType;
      _defaultLocation = state.settings?.defaultCheckInLocation ?? false;
      _defaultWeather = state.settings?.defaultCheckInWeather ?? false;
      _privacy = state.settings?.fieldPrivacy ?? const FieldPrivacy();
      _profileVisibility =
          state.profile?.visibility ?? ProfileVisibility.private;
      _checkInVisibility =
          state.settings?.checkInVisibility ?? CheckInVisibility.private;
      _consent = state.settings?.consent ?? OptionalProcessingConsent.rejected;
    }
    final ready =
        state.phase == PreferencesPhase.ready && !_signingOut && !_locating;
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
        : _defaultLocation !=
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
    final busy =
        state.phase == PreferencesPhase.saving || _signingOut || _locating;
    final saveButton = FilledButton(
      key: Key(profile ? 'profile-save' : 'settings-save'),
      onPressed: ready
          ? () {
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
                );
              }
            }
          : null,
      child: Text(state.phase == PreferencesPhase.saving ? 'Saving…' : 'Save'),
    );
    final page = Scaffold(
      appBar: AppBar(
        title: Text(
          profile
              ? 'Edit profile'
              : widget.aiOnly
              ? 'AI settings'
              : 'Settings',
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(padding: const EdgeInsets.all(16), child: saveButton),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: SingleChildScrollView(
              key: Key(profile ? 'route-profile-edit' : 'route-settings'),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (state.phase == PreferencesPhase.loading)
                    const Center(child: CircularProgressIndicator())
                  else if (state.phase != PreferencesPhase.failed) ...[
                    if (profile) ...[
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Username (cannot be changed)'),
                        subtitle: Text(state.profile?.username ?? ''),
                      ),
                      TextField(
                        key: const Key('profile-display-name'),
                        controller: _name,
                        onChanged: (_) => setState(() {}),
                        enabled: ready,
                        decoration: const InputDecoration(
                          labelText: 'Display name (optional)',
                          helperText:
                              'Use up to 50 characters. Leave blank to unset.',
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        key: const Key('profile-bio'),
                        controller: _bio,
                        onChanged: (_) => setState(() {}),
                        enabled: ready,
                        maxLength: 500,
                        decoration: const InputDecoration(labelText: 'BIO'),
                      ),
                      DropdownButton<AffiliationType?>(
                        key: const Key('profile-affiliation-type'),
                        value: _affiliationType,
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(
                            value: null,
                            child: Text('No school or company'),
                          ),
                          DropdownMenuItem(
                            value: AffiliationType.school,
                            child: Text('School'),
                          ),
                          DropdownMenuItem(
                            value: AffiliationType.company,
                            child: Text('Company'),
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
                        decoration: const InputDecoration(
                          labelText: 'School / company name',
                        ),
                      ),
                      TextField(
                        key: const Key('profile-region'),
                        controller: _region,
                        onChanged: (_) => setState(() {}),
                        enabled: ready,
                        maxLength: 120,
                        decoration: const InputDecoration(labelText: 'Region'),
                      ),
                      OutlinedButton.icon(
                        key: const Key('profile-sync-location'),
                        onPressed: ready ? _syncLocation : null,
                        icon: const Icon(Icons.my_location),
                        label: Text(
                          _locating
                              ? 'Getting location…'
                              : 'Use current coarse location',
                        ),
                      ),
                      const Text(
                        'Uses your location once and fills coarse coordinates. You can replace them with a region name before saving.',
                      ),
                      if (_locationMessage != null) Text(_locationMessage!),
                      const SizedBox(height: 24),
                      Text(
                        'Profile visibility',
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
                          'Profile visibility',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const Text(
                          'Profile visibility controls who may view your profile. Check-in visibility is the default for future check-ins.',
                        ),
                        OutlinedButton(
                          key: const Key('settings-profile'),
                          onPressed: ready ? widget.onEditProfile : null,
                          child: const Text('Edit profile visibility'),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Check-in default visibility',
                          style: Theme.of(context).textTheme.titleMedium,
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
                          'New Check-in defaults',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        SwitchListTile(
                          key: const Key('settings-default-location'),
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Attach location by default'),
                          subtitle: const Text(
                            'Allow one current precise GPS point to be saved when you open a new Check-in. No background tracking. You can turn it off for any draft.',
                          ),
                          value: _defaultLocation,
                          onChanged: ready
                              ? (v) => setState(() => _defaultLocation = v)
                              : null,
                        ),
                        SwitchListTile(
                          key: const Key('settings-default-weather'),
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Attach weather by default'),
                          subtitle: const Text(
                            'Allow Open-Meteo weather lookup using coordinates rounded to 0.1°. No Note or precise point is sent. Open-Meteo may retain request metadata. Requires GPS; this does not enable location. Weather failure still allows saving.',
                          ),
                          value: _defaultWeather,
                          onChanged: ready
                              ? (v) => setState(() => _defaultWeather = v)
                              : null,
                        ),
                        const Text(
                          'Save to apply these choices to future Check-ins. Turn either off here to revoke its default. Saved records stay unchanged.',
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Sharing',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        _privacyChoice(
                          'Interests',
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
                          'Location',
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
                          'Activity participation',
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
                          title: const Text('Share Check-in map with friends'),
                          subtitle: const Text(
                            'Only points allowed by each Check-in and location setting can be shown.',
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
                          title: const Text('Persona context'),
                          subtitle: const Text(
                            'View your active Persona and manage its profile.',
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: widget.onOpenPersonas,
                        ),
                        const Divider(),
                        const Text(
                          'AI replies can be mistaken. Review suggestions before acting on them. Your existing data-use choice below also applies to personalised suggestions.',
                        ),
                        const SizedBox(height: 20),
                      ],
                      Text(
                        'Optional data use',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const Text(
                        'Choose whether to allow optional data use for relevant personalised suggestions. This choice can be changed later.',
                      ),
                      SwitchListTile(
                        key: const Key('settings-consent'),
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Allow optional data use'),
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
                  if (state.saved)
                    Text(
                      profile ? 'Profile saved.' : 'Settings saved.',
                      key: const Key('preferences-save-success'),
                    ),
                  if (state.message case final message?) ...[
                    Text(message, key: const Key('preferences-error')),
                    if (state.phase == PreferencesPhase.failed ||
                        state.phase == PreferencesPhase.reloadRequired)
                      OutlinedButton(
                        key: const Key('preferences-reload'),
                        onPressed: () {
                          _revision = null;
                          controller.load();
                        },
                        child: const Text('Reload'),
                      ),
                  ],
                  if (!profile && !widget.aiOnly) ...[
                    const SizedBox(height: 24),
                    OutlinedButton(
                      key: const Key('settings-sign-out'),
                      onPressed:
                          _signingOut || state.phase == PreferencesPhase.saving
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
                                  _signOutError =
                                      'Could not sign out. Try again.';
                                }
                              });
                            },
                      child: const Text('Sign out'),
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
            title: const Text('Leave without saving?'),
            content: const Text('Your unsaved changes will be lost.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Stay'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Discard changes'),
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

  Future<void> _syncLocation() async {
    final agreed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Use your current location?'),
        content: const Text(
          'Get your location once to fill coarse coordinates (0.1°) in Region. Nothing is saved until you press Save.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (agreed != true || !mounted) return;
    final controller = ref.read(
      accountPreferencesControllerProvider(widget.view).notifier,
    );
    setState(() {
      _locating = true;
      _locationMessage = null;
    });
    final result = await controller.locateRegion();
    if (!mounted) return;
    setState(() {
      _locating = false;
      switch (result) {
        case Success<String>(:final value):
          _region.text = value;
        case Failure<String>(:final failure):
          _locationMessage = failure.message;
      }
    });
    if (_locationMessage case final message?) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
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
      Text('$label visibility'),
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
    ProfileVisibility.private => 'Private',
    ProfileVisibility.friendsOnly => 'Friends only',
    ProfileVisibility.public => 'Public',
  };
  String _checkInLabel(CheckInVisibility v) => switch (v) {
    CheckInVisibility.private => 'Private',
    CheckInVisibility.friendsOnly => 'Friends only',
    CheckInVisibility.public => 'Public',
  };
}
