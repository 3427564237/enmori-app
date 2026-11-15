import 'dart:async';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/own_avatar.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/own_avatar_providers.dart';
import 'package:enmori/features/account/presentation/registration_profile_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_account_preferences.dart';

const _unavailable = Failure<OwnProfile>(
  AppFailure(
    kind: AppFailureKind.serviceUnavailable,
    message: 'Synthetic error',
  ),
);

class _Avatars implements OwnAvatarRepository {
  int writes = 0;
  @override
  Future<Result<OwnAvatar>> read(bool Function() current) async =>
      const Success(OwnAvatar(photo: null, revision: 0));
  @override
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    bool visibleToAuthenticatedUsers = false,
    required int expectedRevision,
    required bool Function() current,
  }) async {
    writes++;
    return const Success(OwnAvatar(photo: null, revision: 1));
  }
}

class _Harness {
  final preferences = FakeAccountPreferences();
  final avatars = _Avatars();
  int continued = 0;
  late ProviderContainer container;
  Future<void> show(WidgetTester tester) async {
    container = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'setup-owner')),
        ),
        accountPreferencesRepositoryProvider.overrideWithValue(preferences),
        ownAvatarRepositoryProvider.overrideWithValue(avatars),
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          home: RegistrationProfilePage(
            onContinue: () async {
              continued++;
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }
}

Future<void> _tap(WidgetTester tester, String key, {bool settle = true}) async {
  final target = find.byKey(Key(key));
  await tester.scrollUntilVisible(
    target,
    250,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.tap(target);
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

void main() {
  for (final action in ['continue', 'skip']) {
    testWidgets('blank name can $action without changing privacy or avatar', (
      tester,
    ) async {
      final h = _Harness();
      await h.show(tester);
      expect(find.text('Step 1 of 3 · Your profile'), findsOneWidget);
      expect(find.text('@member_a'), findsOneWidget);
      await _tap(tester, 'registration-profile-$action');
      expect(h.continued, 1);
      expect(h.preferences.profileNames, isEmpty);
      expect(h.preferences.settingsSaveCount, 0);
      expect(h.avatars.writes, 0);
    });
  }

  testWidgets(
    'nickname saves trimmed text and preserves details and visibility',
    (tester) async {
      final h = _Harness();
      const details = ProfileDetails(
        bio: 'Keep my bio',
        region: 'Saved region',
      );
      h.preferences.profile = const OwnProfile(
        username: 'member_a',
        displayName: null,
        visibility: ProfileVisibility.friendsOnly,
        revision: 7,
        details: details,
      );
      await h.show(tester);
      await tester.enterText(
        find.byKey(const Key('registration-nickname')),
        '  小明  ',
      );
      await _tap(tester, 'registration-profile-continue');
      expect(h.preferences.profileNames, ['小明']);
      expect(h.preferences.profileRevisions, [7]);
      expect(h.preferences.profile.visibility, ProfileVisibility.friendsOnly);
      expect(h.preferences.profile.details, same(details));
      expect(h.preferences.settingsSaveCount, 0);
      expect(h.preferences.profileReadCount, greaterThanOrEqualTo(2));
      expect(h.continued, 1);
    },
  );

  testWidgets(
    'nickname accepts keyboard input and rejects more than 50 characters',
    (tester) async {
      final h = _Harness();
      await h.show(tester);
      final name = find.byKey(const Key('registration-nickname'));
      final input = find.descendant(
        of: name,
        matching: find.byType(EditableText),
      );
      await Scrollable.ensureVisible(tester.element(input), alignment: .4);
      await tester.pumpAndSettle();
      await tester.tap(input);
      await tester.pump();
      expect(tester.testTextInput.isVisible, isTrue);
      await tester.enterText(name, '名' * 51);
      await _tap(tester, 'registration-profile-continue');
      expect(find.text('Use 50 characters or fewer.'), findsOneWidget);
      expect(h.continued, 0);
      expect(h.preferences.profileNames, isEmpty);
    },
  );

  testWidgets('skip confirms discarding only the unsaved nickname', (
    tester,
  ) async {
    final h = _Harness();
    await h.show(tester);
    await tester.enterText(
      find.byKey(const Key('registration-nickname')),
      'Draft',
    );
    await _tap(tester, 'registration-profile-skip');
    expect(find.text('Continue without saving?'), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    expect(h.continued, 0);
    await _tap(tester, 'registration-profile-skip');
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Continue'),
      ),
    );
    await tester.pumpAndSettle();
    expect(h.continued, 1);
    expect(h.preferences.profileNames, isEmpty);
  });

  testWidgets('pending save prevents duplicate submission and skip', (
    tester,
  ) async {
    final h = _Harness();
    h.preferences.pendingSave = Completer<Result<OwnProfile>>();
    await h.show(tester);
    await tester.enterText(
      find.byKey(const Key('registration-nickname')),
      'Name',
    );
    await _tap(tester, 'registration-profile-continue', settle: false);
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const Key('registration-profile-continue')),
          )
          .onPressed,
      isNull,
    );
    expect(
      tester
          .widget<TextButton>(
            find.byKey(const Key('registration-profile-skip')),
          )
          .onPressed,
      isNull,
    );
    expect(h.preferences.profileNames, ['Name']);
    h.preferences.profile = const OwnProfile(
      username: 'member_a',
      displayName: 'Name',
      visibility: ProfileVisibility.private,
      revision: 1,
    );
    h.preferences.pendingSave!.complete(Success(h.preferences.profile));
    await tester.pumpAndSettle();
    expect(h.continued, 1);
  });

  for (final response in ['unknown save', 'failed readback']) {
    testWidgets(
      '$response stays on page and explains uncertainty when skipping',
      (tester) async {
        final h = _Harness();
        await h.show(tester);
        if (response == 'unknown save') {
          h.preferences.saveFailure = _unavailable.failure;
        } else {
          h.preferences.profileReads.add(Future.value(_unavailable));
        }
        await tester.enterText(
          find.byKey(const Key('registration-nickname')),
          'Draft',
        );
        await _tap(tester, 'registration-profile-continue');
        expect(h.continued, 0);
        expect(
          find.byKey(const Key('registration-profile-reload')),
          findsOneWidget,
        );
        await _tap(tester, 'registration-profile-skip');
        expect(
          find.textContaining('earlier save may have completed'),
          findsOneWidget,
        );
        expect(h.preferences.profileNames, ['Draft']);
      },
    );
  }

  testWidgets('unreadable optional profile can be skipped', (tester) async {
    final h = _Harness();
    h.preferences.profileReads.add(Future.value(_unavailable));
    await h.show(tester);
    await _tap(tester, 'registration-profile-skip');
    expect(h.continued, 1);
    expect(h.preferences.profileNames, isEmpty);
  });

  for (final interruption in ['background', 'new session']) {
    testWidgets('$interruption prevents old save from advancing setup', (
      tester,
    ) async {
      final h = _Harness();
      h.preferences.pendingSave = Completer<Result<OwnProfile>>();
      await h.show(tester);
      await tester.enterText(
        find.byKey(const Key('registration-nickname')),
        'Old draft',
      );
      await _tap(tester, 'registration-profile-continue', settle: false);
      if (interruption == 'background') {
        h.container.read(contentAccessProvider.notifier).setForeground(false);
      } else {
        h.container.updateOverrides([
          authSessionProvider.overrideWithValue(
            const AsyncData(AuthSessionAuthenticated(subject: 'new-owner')),
          ),
          accountPreferencesRepositoryProvider.overrideWithValue(h.preferences),
          ownAvatarRepositoryProvider.overrideWithValue(h.avatars),
        ]);
      }
      await tester.pump();
      h.preferences.pendingSave!.complete(Success(h.preferences.profile));
      await tester.pump();
      expect(h.continued, 0);
      if (interruption == 'background') {
        h.container.read(contentAccessProvider.notifier).setForeground(true);
      }
      await tester.pumpAndSettle();
      expect(h.continued, 0);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('avatar editor returns without changing the nickname draft', (
    tester,
  ) async {
    final h = _Harness();
    await h.show(tester);
    await tester.enterText(
      find.byKey(const Key('registration-nickname')),
      'Keep draft',
    );
    await tester.ensureVisible(find.byKey(const Key('own-avatar-edit')));
    await tester.tap(find.byKey(const Key('own-avatar-edit')));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<TextFormField>(find.byKey(const Key('registration-nickname')))
          .controller!
          .text,
      'Keep draft',
    );
    expect(h.avatars.writes, 0);
    expect(h.preferences.profileNames, isEmpty);
  });

  for (final size in [const Size(320, 640), const Size(640, 320)]) {
    testWidgets('large text and keyboard remain scrollable at $size', (
      tester,
    ) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final h = _Harness();
      await h.show(tester);
      await tester.scrollUntilVisible(
        find.byKey(const Key('registration-nickname')),
        250,
      );
      final input = find.descendant(
        of: find.byKey(const Key('registration-nickname')),
        matching: find.byType(EditableText),
      );
      await Scrollable.ensureVisible(tester.element(input), alignment: .4);
      await tester.pumpAndSettle();
      await tester.tap(input);
      expect(tester.testTextInput.isVisible, isTrue);
      tester.view.viewInsets = const FakeViewPadding(bottom: 150);
      await tester.pumpAndSettle();
      await _tap(tester, 'registration-profile-skip');
      expect(h.continued, 1);
      expect(tester.takeException(), isNull);
    });
  }
}
