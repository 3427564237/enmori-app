import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/controlled_demo_app.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/app/router/companion_navigation.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/cloud_ai_consent.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/ai_selected_sources_providers.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:enmori/features/event_participation/presentation/event_plans_page.dart';
import 'package:enmori/features/personas/persona_preview_providers.dart';
import 'package:enmori/features/proactive/proactive_notification_controller.dart';
import 'package:enmori/features/proactive/proactive_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

final class AuthDouble implements AuthRepository {
  final sessions = StreamController<AuthSession>.broadcast(sync: true);
  int registrations = 0;
  @override
  Stream<AuthSession> watchSession() => sessions.stream;
  @override
  Future<Result<String>> getIdToken() async =>
      const Success('synthetic-test-token');
  @override
  Future<Result<void>> signOut() async {
    sessions.add(const AuthSessionUnauthenticated());
    return const Success(null);
  }

  @override
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async => const Success(null);
  @override
  Future<Result<void>> register({
    required String email,
    required String password,
  }) async {
    registrations++;
    return const Success(null);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('OpenAI app uses its own consent and Today wire request', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(900, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const zone = MethodChannel('com.enmori.app/time_zone');
    final messenger = tester.binding.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(
      zone,
      (call) async => switch (call.method) {
        'ianaTimeZone' => 'Etc/UTC',
        'currentDate' => '2026-11-05',
        'formatInstants' => <String>[],
        _ => null,
      },
    );
    addTearDown(() => messenger.setMockMethodCallHandler(zone, null));
    final auth = AuthDouble();
    final edge = Uri.parse('https://enmori-backend-20261029.azurewebsites.net');
    final prepares = <Map<String, dynamic>>[];
    final savedGrants = <Map<String, dynamic>>[];
    var revision = 0;
    var grant = <String, dynamic>{
      'state': 'accepted',
      'disclosureVersion': 'groq_cloud_v1',
    };
    final client = MockClient((request) async {
      expect(request.url.origin, edge.origin);
      expect(request.headers['authorization'], 'Bearer synthetic-test-token');
      final path = request.url.path;
      Object response;
      var status = 200;
      if (path == '/v1/me/onboarding') {
        response = {
          'status': 'completed',
          'account': {
            'username': 'controlled_primary',
            'optionalProcessingConsent': 'accepted',
            'checkInVisibility': 'private',
            'onboardingCompletedAt': '2026-10-19T00:00:00.000Z',
          },
        };
      } else if (path == '/v1/me/settings') {
        if (request.method == 'PUT') {
          final change = jsonDecode(request.body) as Map<String, dynamic>;
          expect(change['expectedRevision'], revision);
          expect(change['optionalProcessingConsent'], 'accepted');
          grant = change['cloudAiConsent'] as Map<String, dynamic>;
          savedGrants.add(grant);
          revision++;
        }
        response = {
          'settings': {
            'checkInVisibility': 'private',
            'optionalProcessingConsent': 'accepted',
            'revision': revision,
            'cloudAiConsent': grant,
          },
        };
      } else {
        if (path == '/v1/me/ai/operations' && request.method == 'POST') {
          prepares.add(jsonDecode(request.body) as Map<String, dynamic>);
        }
        response = {
          'error': {'code': 'SERVICE_UNAVAILABLE', 'message': 'Synthetic'},
        };
        status = 503;
      }
      return http.Response(
        jsonEncode(response),
        status,
        headers: {'content-type': 'application/json'},
      );
    });
    addTearDown(auth.sessions.close);
    addTearDown(client.close);
    await tester.pumpWidget(
      ControlledDemoApp(
        baseUri: edge,
        auth: auth,
        client: client,
        remoteGroupEnabled: true,
        aiProcessing: AiClientProcessing.openaiCloud,
        onClose: () async => const Success(null),
      ),
    );
    await tester.pump();
    auth.sessions.add(
      const AuthSessionAuthenticated(subject: 'controlled_primary'),
    );
    await tester.pumpAndSettle();
    final home = tester.element(find.byKey(const Key('route-home')));
    final scope = ProviderScope.containerOf(home);
    final router = GoRouter.of(home);
    expect(
      scope.read(aiClientProcessingProvider),
      AiClientProcessing.openaiCloud,
    );
    expect(
      scope.read(aiConversationRepositoryProvider),
      isA<AiWireRepository>().having(
        (repo) => repo.processing,
        'processing',
        AiClientProcessing.openaiCloud,
      ),
    );
    expect(scope.read(aiCompanionReferencesEnabledProvider), isTrue);
    expect(scope.read(aiTodayReferencesEnabledProvider), isTrue);
    expect(scope.read(companionFirstFlowEnabledProvider), isFalse);
    expect(scope.read(proactiveRepositoryProvider), isNull);
    expect(scope.read(proactiveMessagingEnabledProvider), isFalse);
    expect(scope.read(personaPreviewAccessProvider), isFalse);
    expect(
      router.configuration.findMatch(Uri.parse(AppRoutes.aiCheckIn)).isError,
      isFalse,
    );
    expect(
      router.configuration.findMatch(Uri.parse(AppRoutes.aiMessage)).isError,
      isFalse,
    );
    expect(
      router.configuration.findMatch(Uri.parse(AppRoutes.aiFollowUps)).isError,
      isTrue,
    );

    await tester.tap(find.byKey(const Key('social-nav-ai')));
    await tester.pumpAndSettle();
    final input = find.byKey(const Key('ai-message-input'));
    final consent = find.byKey(const Key('settings-cloud-consent'));
    final save = find.byKey(const Key('settings-save'));
    expect(input, findsNothing);
    expect(prepares, isEmpty);
    await tester.tap(find.text('Open settings'));
    await tester.pumpAndSettle();
    expect(router.state.uri.path, AppRoutes.aiSettings);
    await tester.ensureVisible(consent);
    expect(
      find.textContaining('checking request size and generating replies'),
      findsOneWidget,
    );
    expect(tester.widget<SwitchListTile>(consent).value, isFalse);
    await tester.tap(consent);
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pumpAndSettle();
    expect(savedGrants, [
      {'state': 'accepted', 'disclosureVersion': 'openai_cloud_v1'},
    ]);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(input, findsOneWidget);
    await tester.enterText(input, 'A synthetic message');
    await tester.pump();
    final send = find.byKey(const Key('ai-send'));
    await tester.ensureVisible(send);
    await tester.tap(send);
    await tester.pumpAndSettle();
    expect(prepares, [
      {
        'kind': 'send',
        'purpose': 'checkin_conversation',
        'contextSelection': {
          'processing': 'cloud',
          'today': {'timeZone': 'Etc/UTC'},
        },
      },
    ]);

    unawaited(router.push<void>(AppRoutes.aiSettings));
    await tester.pumpAndSettle();
    await tester.ensureVisible(consent);
    expect(tester.widget<SwitchListTile>(consent).value, isTrue);
    await tester.tap(consent);
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pumpAndSettle();
    expect(savedGrants.last, {
      'state': 'declined',
      'disclosureVersion': 'openai_cloud_v1',
    });
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(input, findsNothing);
    expect(prepares, hasLength(1));
    await tester.tap(find.text('Open settings'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(consent);
    expect(tester.widget<SwitchListTile>(consent).value, isFalse);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets(
    'explicit Events root connects Home, paged list, detail and saved state',
    (tester) async {
      tester.view.physicalSize = const Size(1200, 2200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final auth = AuthDouble();
      var status = 'none', revision = 0;
      var planReads = 0;
      final batchCursors = <String?>[];
      final client = MockClient((request) async {
        expect(request.headers['authorization'], 'Bearer synthetic-test-token');
        final path = request.url.path;
        Object body;
        if (path == '/v1/me/onboarding') {
          body = {
            'status': 'completed',
            'account': {
              'username': 'controlled_primary',
              'optionalProcessingConsent': 'accepted',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-10-19T00:00:00.000Z',
            },
          };
        } else if (path == '/v1/recommendations/events') {
          body = {
            'asOf': '2026-10-21T00:00:00.000Z',
            'formulaVersion': 'event_recommendation_v1',
            'items': [
              {
                'eventId': 'tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                'title': 'Synthetic integration concert',
                'startAt': '2026-10-25T00:00:00.000Z',
                'reasonCode': 'interest_match',
                'matchedInterests': [
                  {'interestTagId': 'interest_music', 'displayName': 'Music'},
                ],
              },
            ],
          };
        } else if (path ==
            '/v1/events/tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/participation') {
          if (request.method == 'PUT') {
            final change = jsonDecode(request.body) as Map<String, dynamic>;
            expect(change['expectedRevision'], revision);
            status = change['status'] as String;
            revision++;
          }
          body = {
            'participation': {
              'eventId': 'tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              'status': status,
              'ignored': false,
              'revision': revision,
              if (revision > 0) 'updatedAt': '2026-10-21T00:00:00.000Z',
            },
          };
        } else if (path ==
            '/v1/events/tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') {
          body = {
            'event': {
              'eventId': 'tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              'title': 'Synthetic integration concert',
              'startAt': '2026-10-25T00:00:00.000Z',
              'externalSourceUrl': 'https://ticketmaster.sg/event/a',
            },
          };
        } else if (path == '/v1/me/event-participations') {
          planReads++;
          body = {
            'items': [
              {
                'eventId': 'tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                'status': status,
                'ignored': false,
                'revision': revision,
                'updatedAt': '2026-10-21T00:00:00.000Z',
              },
            ],
          };
        } else if (path == '/v1/event-browse') {
          final cursor = request.url.queryParameters['cursor'];
          batchCursors.add(cursor);
          body = {
            'asOf': '2026-10-21T00:00:00.000Z',
            'scope': 'ticketmaster_sg_first_batch_v1',
            'items': cursor == null
                ? [
                    {
                      'browseId': 'tm_YQ',
                      'eventId': 'tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                      'title': 'Synthetic integration concert',
                      'startAt': '2026-10-25T00:00:00.000Z',
                    },
                  ]
                : [],
            if (cursor == null)
              'nextCursor':
                  'synthetic.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          };
        } else {
          throw StateError('Unexpected integration request: $path');
        }
        return http.Response(
          jsonEncode(body),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42001/'),
          auth: auth,
          client: client,
          dualAccounts: true,
          eventParticipationEnabled: true,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pump();
      auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'controlled_primary'),
      );
      await tester.pumpAndSettle();
      expect(find.text('Synthetic integration concert'), findsOneWidget);
      await tester.ensureVisible(find.text('Interested').first);
      await tester.tap(find.text('Interested').first);
      await tester.pumpAndSettle();
      expect(status, 'interested');
      expect(revision, 1);
      await tester.ensureVisible(find.text('Synthetic integration concert'));
      await tester.tap(find.text('Synthetic integration concert'));
      await tester.pumpAndSettle();
      expect(
        find.ancestor(
          of: find.text('Interested'),
          matching: find.byWidgetPredicate(
            (widget) =>
                widget is Semantics && widget.properties.selected == true,
          ),
        ),
        findsOneWidget,
      );
      final router = GoRouter.of(
        tester.element(find.widgetWithText(OutlinedButton, 'Interested')),
      );
      expect(
        router.state.uri.path,
        '/events/tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/participation',
      );
      router.go(AppRoutes.activities);
      await tester.pumpAndSettle();
      expect(find.text('Synthetic integration concert'), findsOneWidget);
      final coveredEventsCallback = tester
          .widget<ParticipationEventsPage>(find.byType(ParticipationEventsPage))
          .onSelect;
      await tester.ensureVisible(find.text('Synthetic integration concert'));
      await tester.tap(find.text('Synthetic integration concert'));
      await tester.pumpAndSettle();
      coveredEventsCallback(
        'tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      await tester.pumpAndSettle();
      expect(
        find.ancestor(
          of: find.text('Interested'),
          matching: find.byWidgetPredicate(
            (widget) =>
                widget is Semantics && widget.properties.selected == true,
          ),
        ),
        findsOneWidget,
      );
      router.pop();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Load more events'));
      await tester.pumpAndSettle();
      expect(batchCursors, [
        null,
        'synthetic.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ]);
      await tester.ensureVisible(find.text('My plans'));
      await tester.tap(find.text('My plans'));
      await tester.pumpAndSettle();
      expect(router.state.uri.path, AppRoutes.eventPlans);
      final coveredPlansCallback = tester
          .widget<EventPlansPage>(find.byType(EventPlansPage))
          .onOpenEvent;
      expect(planReads, 1);
      await tester.tap(find.text('Synthetic integration concert'));
      await tester.pumpAndSettle();
      coveredPlansCallback(
        'tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(OutlinedButton, 'Going'));
      await tester.pumpAndSettle();
      expect(status, 'going');
      expect(revision, 2);
      router.pop();
      await tester.pumpAndSettle();
      expect(router.state.uri.path, AppRoutes.eventPlans);
      expect(
        find.descendant(
          of: find.byKey(
            const ValueKey(
              'plan-tm_event_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            ),
          ),
          matching: find.text('Going'),
        ),
        findsOneWidget,
      );
      expect(planReads, 1);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(router.state.uri.path, AppRoutes.activities);
      expect(batchCursors.length, 2);

      // A direct plans link still has a usable Events fallback.
      router.go(AppRoutes.eventPlans);
      await tester.pumpAndSettle();
      expect(router.canPop(), isFalse);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(router.state.uri.path, AppRoutes.activities);
      auth.sessions.add(const AuthSessionUnauthenticated());
      await tester.pumpAndSettle();
      coveredPlansCallback('stale-plan');
      await tester.pumpAndSettle();
      expect(find.byType(EventPlansPage), findsNothing);
      expect(find.byType(ParticipationEventsPage), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.sessions.close();
      client.close();
    },
  );
  testWidgets(
    'v2 social Home reads recommendations and opens manual Events using its authenticated Backend repository',
    (tester) async {
      final auth = AuthDouble();
      final recommendationViews = <String?>[];
      final client = MockClient((request) async {
        expect(request.url.origin, 'https://127.0.0.1:42001');
        expect(request.method, 'GET');
        expect(request.headers['authorization'], 'Bearer synthetic-test-token');
        final Map<String, Object?> body;
        if (request.url.path == '/v1/me/onboarding') {
          body = {
            'status': 'completed',
            'account': {
              'username': 'controlled_primary',
              'optionalProcessingConsent': 'accepted',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-10-19T00:00:00.000Z',
            },
          };
        } else if (request.url.path == '/v1/event-browse') {
          body = {
            'asOf': '2026-10-21T00:00:00.000Z',
            'scope': 'ticketmaster_sg_first_batch_v1',
            'items': [],
          };
        } else {
          expect(request.url.path, '/v1/recommendations/events');
          recommendationViews.add(request.url.queryParameters['view']);
          body = {
            'asOf': '2026-10-19T00:00:00.000Z',
            'formulaVersion': 'event_recommendation_v1',
            'items': [
              {
                'eventId': 'synthetic-source-projection-id',
                'title': 'Synthetic source Music recommendation',
                'startAt': '2026-10-20T10:00:00.000Z',
                'matchedInterests': [
                  {'interestTagId': 'interest_music', 'displayName': 'Music'},
                ],
                'reasonCode': 'interest_match',
              },
            ],
          };
        }
        return http.Response(
          jsonEncode(body),
          200,
          headers: {'content-type': 'application/json'},
        );
      });
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42001/'),
          auth: auth,
          client: client,
          dualAccounts: true,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pump();
      auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'controlled_primary'),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      expect(recommendationViews, ['home']);
      final action = find.byKey(const Key('home-browse-activities'));
      await tester.ensureVisible(action);
      await tester.pumpAndSettle();
      await tester.tap(action);
      await tester.pumpAndSettle();
      expect(
        GoRouterState.of(tester.element(find.text('Browse activities')))
            .uri
            .path,
        AppRoutes.activities,
      );
      expect(recommendationViews, ['home']);
      expect(find.text('No activities to show'), findsOneWidget);
      expect(
        find.byKey(const Key('event-recommendations-error')),
        findsNothing,
      );
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      expect(recommendationViews, ['home']);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.sessions.close();
      client.close();
    },
  );
  testWidgets(
    'v2 enters registration through the existing router and keeps login available after observed signout',
    (tester) async {
      final auth = AuthDouble();
      final client = MockClient(
        (request) async => http.Response(
          jsonEncode({
            'status': 'completed',
            'account': {
              'username': 'controlled_primary',
              'optionalProcessingConsent': 'accepted',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-10-19T00:00:00.000Z',
            },
          }),
          200,
        ),
      );
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42001/'),
          auth: auth,
          client: client,
          dualAccounts: true,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pump();
      auth.sessions.add(const AuthSessionUnauthenticated());
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-register')), findsOneWidget);
      expect(find.textContaining('No public registration'), findsNothing);
      await tester.enterText(
        find.byKey(const Key('r6-register-email')),
        'controlled-primary@example.invalid',
      );
      await tester.enterText(
        find.byKey(const Key('r6-register-password')),
        'SyntheticPassword1!',
      );
      await tester.enterText(
        find.byKey(const Key('r6-register-confirm-password')),
        'SyntheticPassword1!',
      );
      await tester.ensureVisible(find.byKey(const Key('r6-register-submit')));
      await tester.ensureVisible(find.byKey(const Key('register-terms')));
      await tester.tap(find.byKey(const Key('register-terms')));
      await tester.ensureVisible(find.byKey(const Key('r6-register-submit')));
      await tester.tap(find.byKey(const Key('r6-register-submit')));
      await tester.pumpAndSettle();
      expect(auth.registrations, 1);
      expect(
        find.byKey(const Key('route-register')),
        findsOneWidget,
      ); // command does not invent a session
      await tester.pump(
        const Duration(seconds: 5),
      ); // let the success SnackBar leave the bottom action
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('register-sign-in')));
      await tester.tap(find.byKey(const Key('register-sign-in')));
      await tester.pumpAndSettle();
      expect(find.text('Leave registration?'), findsOneWidget);
      expect(find.byKey(const Key('route-register')), findsOneWidget);
      await tester.tap(find.text('Discard details'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-sign-in')), findsOneWidget);
      expect(auth.registrations, 1);
      auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'controlled_primary'),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      auth.sessions.add(const AuthSessionUnauthenticated());
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsNothing);
      expect(find.byKey(const Key('route-register')), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.sessions.close();
      client.close();
    },
  );
  testWidgets(
    'one observed owner and HTTPS client serve Home, Profile, interests, Friend, Footprint and Persona',
    (tester) async {
      final auth = AuthDouble(), paths = <String>[];
      final client = MockClient((request) async {
        expect(request.url.origin, 'https://127.0.0.1:42001');
        expect(request.headers['authorization'], 'Bearer synthetic-test-token');
        paths.add(request.url.path);
        final body = switch (request.url.path) {
          '/v1/me/onboarding' => {
            'status': 'completed',
            'account': {
              'username': 'synthetic_owner',
              'optionalProcessingConsent': 'accepted',
              'checkInVisibility': 'private',
              'onboardingCompletedAt': '2026-10-15T00:00:00.000Z',
            },
          },
          '/v1/me/settings' => {
            'settings': {
              'checkInVisibility': 'private',
              'optionalProcessingConsent': 'accepted',
              'revision': 0,
            },
          },
          '/v1/me/profile' => {
            'profile': {
              'username': 'synthetic_owner',
              'displayName': 'Synthetic owner',
              'profileVisibility': 'private',
              'revision': 0,
            },
          },
          '/v1/me/interests' => {'interestTags': [], 'revision': 1},
          '/v1/interest-tags' => {'interestTags': []},
          '/v1/me/friend-requests' => {'requests': [], 'nextCursor': null},
          '/v1/me/friends' => {'friends': [], 'nextCursor': null},
          '/v1/me/check-ins' => {'checkIns': [], 'nextCursor': null},
          '/v1/me/personas' => {
            'personas': {'items': [], 'stateRevision': 0},
          },
          _ => {
            'error': {'code': 'SERVICE_UNAVAILABLE', 'message': 'Unavailable'},
          },
        };
        return http.Response(
          jsonEncode(body),
          body.containsKey('error') ? 503 : 200,
          headers: {'content-type': 'application/json'},
        );
      });
      const zone = MethodChannel('com.enmori.app/time_zone');
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        zone,
        (call) async => switch (call.method) {
          'ianaTimeZone' => 'Etc/UTC',
          'currentDate' => '2026-10-15',
          'formatInstants' => <String>[],
          _ => null,
        },
      );
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42001/'),
          auth: auth,
          client: client,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pump();
      expect(paths, isEmpty);
      expect(find.textContaining('No public registration'), findsOneWidget);
      auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'owned-fixture'),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      final router = GoRouter.of(
        tester.element(find.byKey(const Key('route-home'))),
      );
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        0,
      );
      for (final destination in [
        ('social-nav-friends', 'route-friends', 1),
        ('social-nav-me', 'route-own-profile', 4),
        ('social-nav-home', 'route-home', 0),
      ]) {
        await tester.tap(find.byKey(Key(destination.$1)));
        await tester.pumpAndSettle();
        expect(find.byKey(Key(destination.$2)), findsOneWidget);
        expect(
          tester
              .widget<NavigationBar>(find.byType(NavigationBar))
              .selectedIndex,
          destination.$3,
        );
      }
      await tester.scrollUntilVisible(
        find.byKey(const Key('r6-new-check-in-button')),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byKey(const Key('r6-new-check-in-button')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('r6-check-in-note')), findsOneWidget);
      router.go(AppRoutes.home);
      await tester.pumpAndSettle();
      final oldHomeTab = tester
          .widget<NavigationBar>(find.byType(NavigationBar))
          .onDestinationSelected!;
      await tester.tap(find.byKey(const Key('social-nav-ai')));
      await tester.pumpAndSettle();
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        3,
      );
      oldHomeTab(1);
      await tester.pumpAndSettle();
      expect(
        router.routeInformationProvider.value.uri.path,
        AppRoutes.aiAssistant,
      );
      await tester.enterText(
        find.byKey(const Key('ai-message-input')),
        'Unsaved demo draft',
      );
      await tester.tap(find.byKey(const Key('social-nav-home')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);
      await tester.tap(find.byKey(const Key('social-nav-ai')));
      await tester.pumpAndSettle();
      expect(find.text('Unsaved demo draft'), findsOneWidget);
      await tester.tap(find.byKey(const Key('social-nav-home')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('route-home')), findsOneWidget);
      // A narrow viewport and large text keep the bottom bar and content usable.
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      for (final path in [
        AppRoutes.profile,
        AppRoutes.interests,
        '/friends',
        '/friends/list',
        AppRoutes.checkInHistory,
        AppRoutes.personas,
      ]) {
        router.go(path);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      }
      expect(
        paths,
        containsAll([
          '/v1/me/onboarding',
          '/v1/me/profile',
          '/v1/me/interests',
          '/v1/interest-tags',
          '/v1/me/friend-requests',
          '/v1/me/friends',
          '/v1/me/check-ins',
          '/v1/me/personas',
        ]),
      );
      await auth.signOut();
      await tester.pumpAndSettle();
      expect(find.textContaining('No public registration'), findsOneWidget);
      expect(find.byKey(const Key('route-home')), findsNothing);
      oldHomeTab(1);
      await tester.pumpAndSettle();
      expect(find.textContaining('No public registration'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.sessions.close();
      client.close();
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        zone,
        null,
      );
    },
  );
  testWidgets(
    'replacing the connection removes the old authenticated route tree',
    (tester) async {
      final auth = AuthDouble();
      final client = MockClient((_) async => http.Response('{}', 503));
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42001/'),
          auth: auth,
          client: client,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pump();
      auth.sessions.add(const AuthSessionAuthenticated(subject: 'old-owner'));
      await tester.pumpAndSettle();
      final replacement = AuthDouble();
      await tester.pumpWidget(
        ControlledDemoApp(
          baseUri: Uri.parse('https://127.0.0.1:42002/'),
          auth: replacement,
          client: client,
          onClose: () async => const Success(null),
        ),
      );
      await tester.pumpAndSettle();
      auth.sessions.add(
        const AuthSessionAuthenticated(subject: 'late-old-owner'),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('No public registration'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.sessions.close();
      await replacement.sessions.close();
      client.close();
    },
  );
}
