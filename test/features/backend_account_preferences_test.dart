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
import 'package:enmori/features/account/domain/profile_details.dart';

void main() {
  test('profile writes distinguish a preserved region from an explicit clear', () async {
    final requests = <Map<String, dynamic>>[];
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic'),
      httpClient: MockClient((request) async {
        requests.add(jsonDecode(request.body) as Map<String, dynamic>);
        return http.Response(jsonEncode({'profile': {
          'username': 'member_a', 'displayName': null,
          'profileVisibility': 'private', 'revision': 2,
        }}), 200);
      }),
    );
    addTearDown(client.close);
    final repository = BackendAccountPreferencesRepository(client);
    for (final retain in [true, false]) {
      await repository.saveProfile(
        displayName: null, visibility: ProfileVisibility.private, expectedRevision: 1,
        details: ProfileDetails(bio: 'Edited', region: retain ? '1.30°, 103.80°' : null),
        preserveRegion: retain,
      );
    }
    expect((requests.first['details'] as Map).containsKey('region'), isFalse);
    expect(requests.last['details'], {...requests.first['details'] as Map, 'region': null});
  });
  test('cloud consent is explicit, version-bound and omitted by legacy-style saves', () async {
    final settings = <String, dynamic>{
      'checkInVisibility': 'private',
      'optionalProcessingConsent': 'accepted',
      'revision': 0,
    };
    Map<String, dynamic>? sent;
    final client = BackendApiClient(
      Uri.parse('https://example.invalid'),
      () async => const Success('synthetic'),
      httpClient: MockClient((request) async {
        if (request.method == 'PUT') {
          sent = jsonDecode(request.body) as Map<String, dynamic>;
        }
        return http.Response(jsonEncode({'settings': settings}), 200);
      }),
    );
    addTearDown(client.close);
    final repository = BackendAccountPreferencesRepository(client);
    expect(
      (await repository.readSettings() as Success<OwnSettings>)
          .value
          .cloudAiConsent,
      isNull,
    );
    settings['cloudAiConsent'] = {
      'state': 'accepted',
      'disclosureVersion': 'groq_cloud_v1',
    };
    expect(
      (await repository.readSettings() as Success<OwnSettings>)
          .value
          .cloudAiConsent,
      CloudAiConsent.accepted,
    );
    await repository.saveSettings(
      visibility: CheckInVisibility.private,
      consent: OptionalProcessingConsent.accepted,
      expectedRevision: 0,
    );
    expect(sent!.containsKey('cloudAiConsent'), isFalse);
    await repository.saveSettings(
      visibility: CheckInVisibility.private,
      consent: OptionalProcessingConsent.accepted,
      expectedRevision: 0,
      cloudAiConsent: CloudAiConsent.declined,
    );
    expect(sent!['cloudAiConsent'], {
      'state': 'declined',
      'disclosureVersion': 'groq_cloud_v1',
    });
    settings['cloudAiConsent'] = {
      'state': 'accepted',
      'disclosureVersion': 'openai_cloud_v1',
    };
    expect(
      (await repository.readSettings() as Success<OwnSettings>)
          .value
          .cloudAiConsent,
      CloudAiConsent.openaiAccepted,
    );
    await repository.saveSettings(
      visibility: CheckInVisibility.private,
      consent: OptionalProcessingConsent.accepted,
      expectedRevision: 0,
      cloudAiConsent: CloudAiConsent.openaiDeclined,
    );
    expect(sent!['cloudAiConsent'], {
      'state': 'declined',
      'disclosureVersion': 'openai_cloud_v1',
    });
    settings['cloudAiConsent'] = {
      'state': 'declined',
      'disclosureVersion': 'openai_cloud_v1',
    };
    expect(
      (await repository.readSettings() as Success<OwnSettings>)
          .value
          .cloudAiConsent,
      CloudAiConsent.openaiDeclined,
    );
    for (final invalid in [
      null,
      {'state': 'accepted'},
      {'state': 'unknown', 'disclosureVersion': 'openai_cloud_v1'},
      {
        'state': 'accepted',
        'disclosureVersion': 'openai_cloud_v1',
        'provider': 'groq',
      },
      {'state': 'accepted', 'disclosureVersion': 'other'},
      {
        'state': 'accepted',
        'disclosureVersion': 'groq_cloud_v1',
        'provider': 'other',
      },
    ]) {
      settings['cloudAiConsent'] = invalid;
      expect(await repository.readSettings(), isA<Failure<OwnSettings>>());
    }
  });
  test(
    'default booleans decode legacy as off and reject malformed present values',
    () async {
      final settings = <String, dynamic>{
        'checkInVisibility': 'private',
        'optionalProcessingConsent': 'rejected',
        'revision': 0,
      };
      final client = BackendApiClient(
        Uri.parse('https://example.invalid'),
        () async => const Success('synthetic'),
        httpClient: MockClient(
          (_) async => http.Response(jsonEncode({'settings': settings}), 200),
        ),
      );
      addTearDown(client.close);
      final repository = BackendAccountPreferencesRepository(client);
      final legacy = await repository.readSettings() as Success<OwnSettings>;
      expect(legacy.value.defaultCheckInLocation, isFalse);
      expect(legacy.value.defaultCheckInWeather, isFalse);
      expect(legacy.value.homeWeatherAuto, isFalse);
      settings['homeWeatherAuto'] = true;
      settings['defaultCheckInWeather'] = true;
      final explicit = await repository.readSettings() as Success<OwnSettings>;
      expect(explicit.value.defaultCheckInWeather, isTrue);
      expect(explicit.value.homeWeatherAuto, isTrue);
      expect(explicit.value.defaultCheckInLocation, isFalse);
      for (final invalid in ['true', null, 1]) {
        settings['homeWeatherAuto'] = invalid;
        expect(await repository.readSettings(), isA<Failure<OwnSettings>>());
      }
    },
  );

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
