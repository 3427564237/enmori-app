import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/data/backend_own_avatar_repository.dart';
import 'package:enmori/features/account/domain/own_avatar.dart';
import 'package:enmori/features/account/own_avatar_providers.dart';
import 'package:enmori/features/account/presentation/own_avatar_editor.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNQaPgAAAJUAZH4RZ9XAAAAAElFTkSuQmCC';
final photo = AvatarPhoto(bytes: base64Decode(png), sourceSha256: 'a' * 64);

class _Repository implements OwnAvatarRepository {
  OwnAvatar saved = const OwnAvatar(photo: null, revision: 0);
  bool unknown = false;
  int writes = 0;
  @override
  Future<Result<OwnAvatar>> read(bool Function() current) async =>
      Success(saved);
  @override
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    required int expectedRevision,
    required bool Function() current,
  }) async {
    expect(current(), isTrue);
    expect(expectedRevision, saved.revision);
    writes++;
    if (unknown) return const Failure(avatarUnavailable);
    saved = OwnAvatar(photo: photo, revision: saved.revision + 1);
    return Success(saved);
  }
}

class _Picker implements AvatarPhotoPicker {
  @override
  Future<Result<AvatarPhoto?>> pick() async => Success(photo);
}

Future<void> _show(WidgetTester tester, _Repository repository) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWith(
          (ref) => Stream.value(
            const AuthSessionAuthenticated(subject: 'avatar-owner'),
          ),
        ),
        ownAvatarRepositoryProvider.overrideWithValue(repository),
        avatarPhotoPickerProvider.overrideWithValue(_Picker()),
      ],
      child: const MaterialApp(home: OwnAvatarEditor()),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  await tester.ensureVisible(target);
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  test('avatar preview parser rejects oversized dimensions and noncanonical base64', () {
    expect(parseAvatarPhoto(png, photo.sourceSha256), isNotNull);
    expect(parseAvatarPhoto('$png\n', photo.sourceSha256), isNull);
    final bytes = base64Decode(png)..[16] = 1;
    expect(parseAvatarPhoto(base64Encode(bytes), photo.sourceSha256), isNull);
  });
  testWidgets(
    'selecting previews only; explicit save and remove update the separate revision',
    (tester) async {
      final repository = _Repository();
      await _show(tester, repository);
      await _tap(tester, 'avatar-pick');
      expect(repository.writes, 0);
      expect(find.text('Only you can see this photo for now.'), findsOneWidget);
      await _tap(tester, 'avatar-save');
      expect(repository.writes, 1);
      expect(repository.saved.photo?.sourceSha256, photo.sourceSha256);
      await _tap(tester, 'avatar-remove');
      expect(repository.writes, 1);
      await _tap(tester, 'avatar-save');
      expect(repository.writes, 2);
      expect(repository.saved.photo, isNull);
      expect(repository.saved.revision, 2);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'unknown save blocks another write until advanced matching readback',
    (tester) async {
      final repository = _Repository()..unknown = true;
      await _show(tester, repository);
      await _tap(tester, 'avatar-pick');
      await _tap(tester, 'avatar-save');
      expect(repository.writes, 1);
      await _tap(tester, 'avatar-check');
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('avatar-save')))
            .onPressed,
        isNull,
      );
      expect(repository.writes, 1);
      repository.saved = OwnAvatar(photo: photo, revision: 1);
      await _tap(tester, 'avatar-check');
      expect(find.text('Saved photo confirmed.'), findsOneWidget);
      expect(repository.writes, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'unknown photo and original revision survive leaving and reopening the editor',
    (tester) async {
      final repository = _Repository()..unknown = true;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authSessionProvider.overrideWith(
              (ref) => Stream.value(
                const AuthSessionAuthenticated(subject: 'avatar-owner'),
              ),
            ),
            ownAvatarRepositoryProvider.overrideWithValue(repository),
            avatarPhotoPickerProvider.overrideWithValue(_Picker()),
          ],
          child: MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const OwnAvatarEditor(),
                    ),
                  ),
                  child: const Text('Open editor'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Open editor'));
      await tester.pumpAndSettle();
      await _tap(tester, 'avatar-pick');
      await _tap(tester, 'avatar-save');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Open editor'));
      await tester.pumpAndSettle();
      expect(repository.writes, 1);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('avatar-save')))
            .onPressed,
        isNull,
      );
      await _tap(tester, 'avatar-check');
      expect(repository.writes, 1);
      expect(
        tester
            .widget<OutlinedButton>(find.byKey(const Key('avatar-pick')))
            .onPressed,
        isNull,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
