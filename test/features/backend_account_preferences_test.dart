import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/data/backend_account_preferences_repository.dart';
import 'package:enmori/features/account/data/backend_account_repository.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';

void main() {
  test(
    'malformed Profile names fail closed instead of rendering unsafe content',
    () async {
      Object? name;
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'profile': {
                'username': 'member_a',
                'displayName': name,
                'profileVisibility': 'private',
                'revision': 0,
              },
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          ),
        ),
      );
      addTearDown(client.close);
      final repository = BackendAccountPreferencesRepository(client);
      expect(await repository.readProfile(), isA<Success<OwnProfile>>());
      for (final invalid in [
        'a\u202eb',
        'a\u200db',
        'a\u2028b',
        '',
        ' leading',
        'a' * 51,
      ]) {
        name = invalid;
        expect(await repository.readProfile(), isA<Failure<OwnProfile>>());
      }
    },
  );
  test('owner Profile save encodes only approved fields and preserves nullable/three-way projection', () async {
    late http.Request sent;
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic'),
      httpClient: MockClient((request) async {
        sent = request;
        return http.Response(
          jsonEncode({
            'profile': {
              'username': 'member_a',
              'displayName': null,
              'profileVisibility': 'friends_only',
              'revision': 2,
            },
          }),
          200,
        );
      }),
    );
    addTearDown(client.close);
    final result = await BackendAccountPreferencesRepository(client)
        .saveProfile(
          displayName: null,
          visibility: ProfileVisibility.friendsOnly,
          expectedRevision: 1,
        );
    expect(sent.url.path, '/v1/me/profile');
    expect(sent.headers.containsKey('Idempotency-Key'), false);
    expect(jsonDecode(sent.body), {
      'displayName': null,
      'profileVisibility': 'friends_only',
      'expectedRevision': 1,
    });
    expect(result, isA<Success<OwnProfile>>());
    final profile = (result as Success<OwnProfile>).value;
    expect(profile.visibility, ProfileVisibility.friendsOnly);
    expect(profile.displayName, isNull);
    expect(profile.revision, 2);
  });
  test('current onboarding Account accepts Friends-only while initial choice remains Accept/Reject', () async {
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic'),
      httpClient: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'status': 'completed',
            'account': {
              'username': 'member_a',
              'optionalProcessingConsent': 'rejected',
              'checkInVisibility': 'friends_only',
              'onboardingCompletedAt': '2026-10-05T00:00:00.000Z',
            },
          }),
          200,
        ),
      ),
    );
    addTearDown(client.close);
    final result = await BackendAccountRepository(client)
        .readOnboardingStatus();
    final account =
        ((result as Success<OnboardingStatus>).value as OnboardingCompleted)
            .account;
    expect(account.checkInVisibility, CheckInVisibility.friendsOnly);
    expect(InitialChoice.values.length, 2);
  });
  test(
    'Settings response validates enum/revision and rejects undeclared identity',
    () async {
      Object body = {
        'settings': {
          'checkInVisibility': 'public',
          'optionalProcessingConsent': 'rejected',
          'revision': 0,
        },
      };
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient(
          (_) async => http.Response(jsonEncode(body), 200),
        ),
      );
      addTearDown(client.close);
      final repository = BackendAccountPreferencesRepository(client);
      expect(await repository.readSettings(), isA<Success<OwnSettings>>());
      for (final value in [
        {
          'checkInVisibility': 'unknown',
          'optionalProcessingConsent': 'rejected',
          'revision': 0,
        },
        {
          'checkInVisibility': 'public',
          'optionalProcessingConsent': 'rejected',
          'revision': -1,
        },
        {
          'checkInVisibility': 'public',
          'optionalProcessingConsent': 'rejected',
          'revision': 0,
          'accountId': 'private',
        },
      ]) {
        body = {'settings': value};
        expect(await repository.readSettings(), isA<Failure<OwnSettings>>());
      }
    },
  );
  test('new revision failures retain stable types and never become successful saves', () async {
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic'),
      httpClient: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'error': {
              'code': 'PROFILE_REVISION_PRECONDITION_FAILED',
              'message': 'Your profile changed. Reload it before saving again.',
              'requestId': 'synthetic',
            },
          }),
          412,
        ),
      ),
    );
    addTearDown(client.close);
    final result = await BackendAccountPreferencesRepository(client)
        .saveProfile(
          displayName: 'Alex',
          visibility: ProfileVisibility.public,
          expectedRevision: 0,
        );
    expect(
      (result as Failure<OwnProfile>).failure.kind,
      AppFailureKind.profileRevisionPreconditionFailed,
    );
  });
}
