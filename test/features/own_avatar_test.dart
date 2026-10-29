import 'dart:async';
import 'dart:convert';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/content_access.dart';
import 'package:enmori/features/account/data/backend_own_avatar_repository.dart';
import 'package:enmori/features/account/domain/own_avatar.dart';
import 'package:enmori/features/account/own_avatar_providers.dart';
import 'package:enmori/features/account/presentation/own_avatar_editor.dart';
import 'package:enmori/features/account/presentation/own_avatar_view.dart';
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
  int writes = 0, reads = 0;
  Completer<Result<OwnAvatar>>? pendingRead;
  Completer<Result<OwnAvatar>>? pendingSave;
  @override
  Future<Result<OwnAvatar>> read(bool Function() current) async {
    reads++;
    return pendingRead?.future ?? Success(saved);
  }

  @override
  Future<Result<OwnAvatar>> save({
    required AvatarPhoto? photo,
    bool visibleToAuthenticatedUsers = false,
    required int expectedRevision,
    required bool Function() current,
  }) async {
    expect(current(), isTrue);
    expect(expectedRevision, saved.revision);
    writes++;
    if (pendingSave case final pending?) return pending.future;
    if (unknown) return const Failure(avatarUnavailable);
    saved = OwnAvatar(
      photo: photo,
      revision: saved.revision + 1,
      visibleToAuthenticatedUsers: visibleToAuthenticatedUsers,
    );
    return Success(saved);
  }
}

class _Picker implements AvatarPhotoPicker {
  Completer<Result<AvatarPhoto?>>? pending;
  @override
  Future<Result<AvatarPhoto?>> pick() async =>
      pending?.future ?? Success(photo);
}

Future<void> _show(
  WidgetTester tester,
  _Repository repository, {
  GlobalKey<NavigatorState>? navigator,
  AvatarPhotoPicker? picker,
  bool settle = true,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authSessionProvider.overrideWithValue(
          const AsyncData(AuthSessionAuthenticated(subject: 'avatar-owner')),
        ),
        ownAvatarRepositoryProvider.overrideWithValue(repository),
        avatarPhotoPickerProvider.overrideWithValue(picker ?? _Picker()),
      ],
      child: MaterialApp(
        navigatorKey: navigator,
        home: const OwnAvatarEditor(),
      ),
    ),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

Future<void> _tap(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  await tester.ensureVisible(target);
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'native picker background return keeps the explicitly chosen preview',
    (tester) async {
      final selected = Completer<Result<AvatarPhoto?>>();
      final picker = _Picker()..pending = selected;
      final repository = _Repository();
      await _show(tester, repository, picker: picker);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(OwnAvatarEditor)),
      );
      await tester.tap(find.byKey(const Key('avatar-pick')));
      await tester.pump();
      container.read(contentAccessProvider.notifier).setForeground(false);
      await tester.pump();
      container.read(contentAccessProvider.notifier).setForeground(true);
      await tester.pump();
      selected.complete(Success(photo));
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        same(photo),
      );
      expect(repository.reads, 2);
      expect(repository.writes, 0);
      await _tap(tester, 'avatar-save');
      expect(repository.writes, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'picker result from a covered route cannot replace the returned draft',
    (tester) async {
      final selected = Completer<Result<AvatarPhoto?>>();
      final picker = _Picker()..pending = selected;
      final repository = _Repository();
      final navigator = GlobalKey<NavigatorState>();
      await _show(tester, repository, navigator: navigator, picker: picker);
      await tester.tap(find.byKey(const Key('avatar-pick')));
      await tester.pump();
      navigator.currentState!.push<void>(
        MaterialPageRoute(builder: (_) => const Scaffold(body: Text('Cover'))),
      );
      await tester.pumpAndSettle();
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      selected.complete(Success(photo));
      await tester.pumpAndSettle();
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        isNull,
      );
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('avatar-save')))
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<OutlinedButton>(find.byKey(const Key('avatar-pick')))
            .onPressed,
        isNotNull,
      );
      expect(repository.writes, 0);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('covered avatar read cannot strand the editor on return', (
    tester,
  ) async {
    final oldRead = Completer<Result<OwnAvatar>>();
    final repository = _Repository()..pendingRead = oldRead;
    final navigator = GlobalKey<NavigatorState>();
    await _show(tester, repository, navigator: navigator, settle: false);
    expect(repository.reads, 1);
    navigator.currentState!.push<void>(
      MaterialPageRoute(builder: (_) => const Scaffold(body: Text('Cover'))),
    );
    await tester.pumpAndSettle();
    oldRead.complete(Success(OwnAvatar(photo: photo, revision: 1)));
    repository.pendingRead = null;
    await tester.pump();
    expect(repository.reads, 1);
    expect(
      tester
          .widget<AvatarPixels>(find.byType(AvatarPixels, skipOffstage: false))
          .photo,
      isNull,
    );
    navigator.currentState!.pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    expect(repository.reads, 2);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(
      tester
          .widget<OutlinedButton>(find.byKey(const Key('avatar-pick')))
          .onPressed,
      isNotNull,
    );
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'covered avatar draft hides then returns with a fresh saved revision',
    (tester) async {
      final repository = _Repository();
      final navigator = GlobalKey<NavigatorState>();
      await _show(tester, repository, navigator: navigator);
      await _tap(tester, 'avatar-pick');
      navigator.currentState!.push<void>(
        MaterialPageRoute(builder: (_) => const Scaffold(body: Text('Cover'))),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<AvatarPixels>(
              find.byType(AvatarPixels, skipOffstage: false),
            )
            .photo,
        isNull,
      );
      repository.saved = const OwnAvatar(photo: null, revision: 5);
      navigator.currentState!.pop();
      await tester.pumpAndSettle();
      expect(repository.reads, 2);
      expect(
        tester.widget<AvatarPixels>(find.byType(AvatarPixels)).photo,
        same(photo),
      );
      expect(repository.writes, 0);
      await _tap(tester, 'avatar-save');
      expect(repository.saved.revision, 6);
      expect(repository.writes, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'covered avatar save is confirmed by readback without a second write',
    (tester) async {
      final oldSave = Completer<Result<OwnAvatar>>();
      final repository = _Repository()..pendingSave = oldSave;
      final navigator = GlobalKey<NavigatorState>();
      await _show(tester, repository, navigator: navigator);
      await _tap(tester, 'avatar-pick');
      await tester.ensureVisible(find.byKey(const Key('avatar-save')));
      await tester.tap(find.byKey(const Key('avatar-save')));
      await tester.pump();
      expect(repository.writes, 1);
      navigator.currentState!.push<void>(
        MaterialPageRoute(builder: (_) => const Scaffold(body: Text('Cover'))),
      );
      await tester.pumpAndSettle();
      repository.saved = OwnAvatar(
        photo: photo,
        revision: 1,
        visibleToAuthenticatedUsers: true,
      );
      oldSave.complete(Success(repository.saved));
      await tester.pump();
      navigator.currentState!.pop();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump();
      expect(repository.reads, 2);
      expect(find.text('Saved photo confirmed.'), findsOneWidget);
      expect(repository.writes, 1);
      expect(find.byType(LinearProgressIndicator), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'old private image needs explicit sharing and save; preview alone does not publish',
    (tester) async {
      final repository = _Repository()
        ..saved = OwnAvatar(photo: photo, revision: 3);
      await _show(tester, repository);
      expect(repository.saved.visibleToAuthenticatedUsers, isFalse);
      await tester.scrollUntilVisible(
        find.byKey(const Key('avatar-publish')),
        200,
      );
      await _tap(tester, 'avatar-publish');
      expect(repository.writes, 0);
      await _tap(tester, 'avatar-save');
      expect(repository.writes, 1);
      expect(repository.saved.visibleToAuthenticatedUsers, isTrue);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'unknown public save is not confirmed by same image with private visibility',
    (tester) async {
      final repository = _Repository()..unknown = true;
      await _show(tester, repository);
      await _tap(tester, 'avatar-pick');
      await _tap(tester, 'avatar-save');
      repository.saved = OwnAvatar(photo: photo, revision: 1);
      await _tap(tester, 'avatar-check');
      expect(find.text('Saved photo confirmed.'), findsNothing);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('avatar-save')))
            .onPressed,
        isNull,
      );
      repository.saved = OwnAvatar(
        photo: photo,
        revision: 2,
        visibleToAuthenticatedUsers: true,
      );
      await _tap(tester, 'avatar-check');
      expect(find.text('Saved photo confirmed.'), findsOneWidget);
      expect(repository.writes, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

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
      expect(
        find.textContaining('visible to all signed-in users'),
        findsOneWidget,
      );
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
      repository.saved = OwnAvatar(
        photo: photo,
        revision: 1,
        visibleToAuthenticatedUsers: true,
      );
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
