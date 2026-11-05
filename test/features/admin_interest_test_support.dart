import 'dart:async';
import 'dart:collection';

import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/interests/admin_interest_providers.dart';
import 'package:enmori/features/interests/domain/admin_interest_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/presentation/admin_interest_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../support/fakes.dart';

const adminArt = InterestTagOption(
  interestTagId: 'tag-art',
  displayName: 'Art',
);
const adminCreated = CreatedInterestTag(
  interestTagId: 'tag-new',
  displayName: 'Photography',
);
const adminUnavailable = AppFailure(
  kind: AppFailureKind.serviceUnavailable,
  message: 'Unavailable',
);

final class FakeAdminInterestRepository implements AdminInterestRepository {
  bool allowed = true;
  List<InterestTagOption> tags = [adminArt];
  final capabilities = Queue<Future<Result<bool>>>();
  final catalogues = Queue<Future<Result<List<InterestTagOption>>>>();
  final creates = Queue<Future<Result<CreatedInterestTag>>>();
  final createdNames = <String>[];
  final guards = <bool Function()>[];
  int capabilityReads = 0;
  int catalogueReads = 0;

  @override
  Future<Result<bool>> readCapability({required bool Function() current}) {
    capabilityReads++;
    return capabilities.isEmpty
        ? Future.value(Success(allowed))
        : capabilities.removeFirst();
  }

  @override
  Future<Result<List<InterestTagOption>>> readCatalogue({
    required bool Function() current,
  }) {
    catalogueReads++;
    return catalogues.isEmpty
        ? Future.value(Success(List.of(tags)))
        : catalogues.removeFirst();
  }

  @override
  Future<Result<CreatedInterestTag>> create({
    required String displayName,
    required bool Function() current,
  }) {
    createdNames.add(displayName);
    guards.add(current);
    if (creates.isNotEmpty) return creates.removeFirst();
    tags = [
      ...tags,
      const InterestTagOption(
        interestTagId: 'tag-new',
        displayName: 'Photography',
      ),
    ];
    return Future.value(const Success(adminCreated));
  }
}

const managedArt = ManagedInterestTag(
  interestTagId: 'tag-art',
  displayName: 'Art',
  lifecycleState: InterestLifecycleState.active,
  revision: 1,
);
const managedMusic = ManagedInterestTag(
  interestTagId: 'tag-music',
  displayName: 'Music',
  lifecycleState: InterestLifecycleState.inactive,
  revision: 4,
);

final class FakeManagedAdminInterestRepository
    extends FakeAdminInterestRepository
    implements AdminInterestManagementRepository {
  List<ManagedInterestTag> managed = [managedArt, managedMusic];
  final managementCatalogues =
      Queue<Future<Result<List<ManagedInterestTag>>>>();
  final updates = Queue<Future<Result<ManagedInterestTag>>>();
  final changes =
      <
        ({
          String id,
          int revision,
          String? name,
          InterestLifecycleState? lifecycle,
        })
      >[];
  int managementReads = 0, deletes = 0;
  @override
  bool permanentDeletionAvailable = false;
  @override
  Future<Result<List<ManagedInterestTag>>> readManagementCatalogue({
    required bool Function() current,
  }) {
    managementReads++;
    return managementCatalogues.isEmpty
        ? Future.value(Success(List.of(managed)))
        : managementCatalogues.removeFirst();
  }

  Future<Result<ManagedInterestTag>> update(
    ManagedInterestTag expected,
    String? name,
    InterestLifecycleState? lifecycle,
    bool Function() current,
  ) {
    changes.add((
      id: expected.interestTagId,
      revision: expected.revision,
      name: name,
      lifecycle: lifecycle,
    ));
    guards.add(current);
    if (updates.isNotEmpty) return updates.removeFirst();
    final value = ManagedInterestTag(
      interestTagId: expected.interestTagId,
      displayName: name?.trim() ?? expected.displayName,
      lifecycleState: lifecycle ?? expected.lifecycleState,
      revision: expected.revision + 1,
    );
    managed = [
      for (final tag in managed)
        if (tag.interestTagId == expected.interestTagId) value else tag,
    ];
    return Future.value(Success(value));
  }

  @override
  Future<Result<ManagedInterestTag>> rename({
    required ManagedInterestTag expected,
    required String displayName,
    required bool Function() current,
  }) => update(expected, displayName, null, current);
  @override
  Future<Result<ManagedInterestTag>> changeLifecycle({
    required ManagedInterestTag expected,
    required InterestLifecycleState lifecycleState,
    required bool Function() current,
  }) => update(expected, null, lifecycleState, current);
  @override
  Future<Result<void>> delete({
    required ManagedInterestTag expected,
    required bool Function() current,
  }) async {
    deletes++;
    managed = managed
        .where((tag) => tag.interestTagId != expected.interestTagId)
        .toList();
    return const Success(null);
  }
}

final class AdminHarness {
  AdminHarness._(this.container, this.auth, this.repository);
  final ProviderContainer container;
  final FakeAuthRepository auth;
  final FakeAdminInterestRepository repository;

  static Future<AdminHarness> start({
    FakeAdminInterestRepository? repository,
  }) async {
    final auth = FakeAuthRepository();
    final repo = repository ?? FakeAdminInterestRepository();
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        adminInterestRepositoryProvider.overrideWithValue(repo),
      ],
    );
    container.listen(authSessionProvider, (_, _) {});
    auth.emit(const AuthSessionAuthenticated(subject: 'admin-a'));
    await container.read(authSessionProvider.future);
    container.listen(adminInterestControllerProvider, (_, _) {});
    await container.pump();
    return AdminHarness._(container, auth, repo);
  }

  AdminInterestController get controller =>
      container.read(adminInterestControllerProvider.notifier);
  AdminInterestState get state =>
      container.read(adminInterestControllerProvider);
  AuthSessionAuthenticated get session =>
      container.read(authSessionProvider).asData!.value
          as AuthSessionAuthenticated;

  Future<void> load() => controller.load(session: session);
  void draft([String value = 'Photography']) =>
      controller.editDraft(value, session: session);
  Future<void> create() => controller.create(session: session, expected: state);

  Future<void> replaceSession([String subject = 'admin-a']) async {
    auth.emit(AuthSessionAuthenticated(subject: subject));
    await container.pump();
  }

  Future<void> close() async {
    container.dispose();
    await auth.close();
  }
}
