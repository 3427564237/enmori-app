import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/result/result.dart';
import '../domain/account_preferences_repository.dart';
import '../domain/account_repository.dart';
import 'account_preferences_controller.dart';

final class AccountPreferencesPage extends ConsumerStatefulWidget {
  const AccountPreferencesPage({
    required this.view,
    this.onEditProfile,
    this.onSignOut,
    super.key,
  });
  final PreferencesView view;
  final Future<void> Function()? onEditProfile;
  final Future<Result<void>> Function()? onSignOut;
  @override
  ConsumerState<AccountPreferencesPage> createState() =>
      _AccountPreferencesPageState();
}

final class _AccountPreferencesPageState
    extends ConsumerState<AccountPreferencesPage> {
  final _name = TextEditingController();
  int? _revision;
  ProfileVisibility _profileVisibility = ProfileVisibility.private;
  CheckInVisibility _checkInVisibility = CheckInVisibility.private;
  OptionalProcessingConsent _consent = OptionalProcessingConsent.rejected;
  bool _signingOut = false;
  String? _signOutError;
  @override
  void dispose() {
    _name.dispose();
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
      _profileVisibility =
          state.profile?.visibility ?? ProfileVisibility.private;
      _checkInVisibility =
          state.settings?.checkInVisibility ?? CheckInVisibility.private;
      _consent = state.settings?.consent ?? OptionalProcessingConsent.rejected;
    }
    final ready = state.phase == PreferencesPhase.ready && !_signingOut;
    final profile = widget.view == PreferencesView.profile;
    final controller = ref.read(provider.notifier);
    return Scaffold(
      appBar: AppBar(title: Text(profile ? 'Edit profile' : 'Settings')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
              key: Key(profile ? 'route-profile-edit' : 'route-settings'),
              padding: const EdgeInsets.all(24),
              children: [
                if (state.phase == PreferencesPhase.loading)
                  const Center(child: CircularProgressIndicator())
                else if (state.phase != PreferencesPhase.failed) ...[
                  if (profile) ...[
                    TextField(
                      key: const Key('profile-display-name'),
                      controller: _name,
                      enabled: ready,
                      decoration: const InputDecoration(
                        labelText: 'Display name (optional)',
                        helperText:
                            'Use up to 50 characters. Leave blank to unset.',
                      ),
                    ),
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
                  FilledButton(
                    key: Key(profile ? 'profile-save' : 'settings-save'),
                    onPressed: ready
                        ? () {
                            if (profile) {
                              controller.saveProfile(
                                _name.text.trim().isEmpty ? null : _name.text,
                                _profileVisibility,
                              );
                            } else {
                              controller.saveSettings(
                                _checkInVisibility,
                                _consent,
                              );
                            }
                          }
                        : null,
                    child: Text(
                      state.phase == PreferencesPhase.saving
                          ? 'Saving…'
                          : 'Save',
                    ),
                  ),
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
                if (!profile) ...[
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
    );
  }

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
