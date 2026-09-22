import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:enmori/app/app.dart';
import 'package:enmori/app/bootstrap.dart';
import 'package:enmori/app/providers.dart';
import 'package:enmori/app/router/app_router.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/presentation/command_state.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/data/backend_account_repository.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/data/firebase_auth_repository.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/check_in_providers.dart';
import 'package:enmori/features/check_in/data/backend_check_in_repository.dart';
import 'package:enmori/features/check_in/domain/check_in_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_controller.dart';
import 'package:enmori/features/event_recommendations/data/backend_event_recommendation_repository.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_controller.dart';
import 'package:enmori/features/event_recommendations/presentation/event_recommendations_page.dart';
import 'package:enmori/features/interests/data/backend_interest_repository.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/presentation/interest_editor_controller.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';

// Real controlled-Demo execution only. No fake repositories, Auth Emulator,
// custom TLS trust, server fault injection, or fixture initialization.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('S2-06 controlled Demo eight-row cross-feature gate', (
    tester,
  ) async {
    const enabled = bool.fromEnvironment('ENMORI_S2_06_EXECUTE');
    const baseUrl = String.fromEnvironment('ENMORI_API_BASE_URL');
    const project = String.fromEnvironment('ENMORI_FIREBASE_PROJECT_ID');
    const originalAppHead = 'cdd0b9dad5705e4ac9887efe2cd86d3c07b7f4b4';
    if (!enabled || project != 'enmori-rmvp-controlled') {
      throw StateError('Explicit S2-06 controlled-Demo execution is required.');
    }
    final config = FirebaseRuntimeConfiguration.fromEnvironment();
    if (config.useAuthEmulator ||
        config.options == null ||
        parseApprovedBackendBaseUri(baseUrl) == null) {
      throw StateError(
        'Approved HTTPS and real Firebase configuration required.',
      );
    }
    final report = _Report(originalAppHead);
    final httpObserver = _ObservedHttpClient();
    ProviderContainer? container;
    await report.initialize();
    try {
      await Firebase.initializeApp(options: config.options);
      // This dedicated test run requires fresh onboarding, not a prior session.
      await FirebaseAuth.instance.signOut();
      final auth = FirebaseAuthRepository(FirebaseAuth.instance);
      var tokenCalls = 0;
      final api = BackendApiClient(parseApprovedBackendBaseUri(baseUrl), () {
        tokenCalls++;
        return auth.getIdToken();
      }, httpClient: httpObserver);
      final scope = container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(auth),
          backendApiClientProvider.overrideWithValue(api),
          accountRepositoryProvider.overrideWith(
            (ref) =>
                BackendAccountRepository(ref.watch(backendApiClientProvider)),
          ),
          checkInRepositoryProvider.overrideWith(
            (ref) =>
                BackendCheckInRepository(ref.watch(backendApiClientProvider)),
          ),
          interestRepositoryProvider.overrideWith(
            (ref) =>
                BackendInterestRepository(ref.watch(backendApiClientProvider)),
          ),
          eventRecommendationRepositoryProvider.overrideWith(
            (ref) => BackendEventRecommendationRepository(
              ref.watch(backendApiClientProvider),
            ),
          ),
        ],
      );
      final ui = _Ui(tester, report);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: scope, child: const EnmoriApp()),
      );
      final random = Random.secure();
      final suffix = List.generate(
        12,
        (_) => random.nextInt(16).toRadixString(16),
      ).join();
      final email = 'jin.s206.$suffix@example.invalid';
      final password =
          'S206!${List.generate(24, (_) => random.nextInt(36).toRadixString(36)).join()}';
      final username = 'jin_s206_$suffix';
      const note = 'A synthetic S2-06 cross-feature verification note.';
      const tags = ['interest_community', 'interest_music'];
      var savedRevision = -1;
      var savedSequence = -1;
      var homeSequence = -1;

      await report.row(1, () async {
        await ui.waitKey('route-register');
        await ui.enter('r6-register-email', email);
        await ui.enter('r6-register-password', password);
        await ui.enter('r6-register-confirm-password', password);
        await ui.tap('r6-register-submit');
        await ui.waitKey('route-onboarding');
        report.check(
          scope.read(authSessionProvider).asData?.value
              is AuthSessionAuthenticated,
          'real_observed_authenticated_session',
        );
        await ui.enter('r6-onboarding-username', username);
        await ui.tap('r6-onboarding-username-continue');
        await ui.tap('r6-initial-choice-info-continue');
        await ui.tap('r6-initial-choice-reject');
        await ui.waitKey('route-check-in');
        final afterWrite = httpObserver.sequence;
        final read = await scope
            .read(accountRepositoryProvider)
            .readOnboardingStatus();
        report.check(
          read is Success<OnboardingStatus> &&
              read.value is OnboardingCompleted,
          'protected_later_onboarding_completed',
        );
        report.check(
          httpObserver.records.any(
            (r) =>
                r.sequence > afterWrite &&
                r.operation == 'onboarding_read' &&
                r.status == 200,
          ),
          'independent_protected_onboarding_read',
        );
        final account =
            ((read as Success<OnboardingStatus>).value as OnboardingCompleted)
                .account;
        report.check(
          account.username == username &&
              account.optionalProcessingConsent ==
                  OptionalProcessingConsent.rejected &&
              account.checkInVisibility == CheckInVisibility.private,
          'initial_choice_private_contract',
        );
        report.ui('S2-06-01', [
          'authenticated',
          'onboarding_completed',
          'check_in_route',
        ]);
      });

      await report.row(2, () async {
        await ui.enter('r6-check-in-note', note);
        await ui.tap('r6-check-in-create');
        await ui.waitKey('r6-check-in-committed');
        final created = scope.read(checkInControllerProvider);
        report.check(
          created is CommandSucceeded<CheckIn>,
          'note_create_success',
        );
        final value = (created as CommandSucceeded<CheckIn>).value;
        final beforeRead = httpObserver.sequence;
        await ui.tap('r6-check-in-confirm');
        await ui.waitKey('r6-check-in-confirmed');
        final later = scope.read(checkInControllerProvider);
        report.check(
          later is CommandSucceeded<CheckIn> &&
              later.value.note == note &&
              later.value.checkInId == value.checkInId,
          'owned_later_note_matches_create',
        );
        report.check(
          httpObserver.records.any(
            (r) =>
                r.sequence > beforeRead &&
                r.operation == 'note_read' &&
                r.status == 200,
          ),
          'independent_owned_note_read',
        );
        await ui.tap('r6-return-home-inline');
        await ui.waitKey('route-home');
        await ui.waitKey('event-recommendations-empty');
        report.ui('S2-06-02', [
          'note_create_success',
          'owned_later_read_success',
          'home_route',
        ]);
      });

      await report.row(3, () async {
        await ui.tap('edit-interests-button');
        await ui.waitKey('interest-option-interest_community');
        final before = scope.read(interestEditorControllerProvider).revision;
        for (final tag in tags) {
          await ui.tap('interest-option-$tag');
        }
        await ui.tap('interest-save');
        await ui.waitKey('interest-save-success');
        final saved = scope
            .read(interestEditorControllerProvider)
            .savedSelection;
        report.check(
          saved != null &&
              saved.revision == before + 1 &&
              _sameTags(saved, tags),
          'interest_save_revision_and_selection',
        );
        savedRevision = saved!.revision;
        savedSequence = httpObserver.sequence;
        final later = await scope.read(interestRepositoryProvider).readOwn();
        report.check(
          later is Success<InterestSelection> &&
              later.value.revision == savedRevision &&
              _sameTags(later.value, tags),
          'independent_own_interest_read_matches_save',
        );
        report.check(
          httpObserver.records.any(
            (r) =>
                r.sequence > savedSequence &&
                r.operation == 'interests_read' &&
                r.status == 200,
          ),
          'own_interest_read_reaches_backend',
        );
        // Return through the real Done callback, then leave/reopen the editor.
        await ui.tap('interest-done');
        await ui.waitKey('event-recommendation-s2_demo_community_music');
        await ui.tap('edit-interests-button');
        await ui.waitKey('interest-option-interest_community');
        for (final tag in tags) {
          report.check(
            tester
                    .widget<CheckboxListTile>(
                      find.byKey(Key('interest-option-$tag')),
                    )
                    .value ==
                true,
            'editor_later_read_selected_$tag',
          );
        }
        report.check(
          scope.read(interestEditorControllerProvider).revision ==
              savedRevision,
          'editor_later_revision_matches',
        );
        // Re-save unchanged through UI so row 4 directly observes its fresh Home request.
        await ui.tap('interest-save');
        await ui.waitKey('interest-save-success');
        savedSequence = httpObserver.sequence;
        report.ui('S2-06-03', [
          'interest_save_success',
          'later_read_matches',
          'reopened_both_selected',
        ]);
      });

      await report.row(4, () async {
        await ui.tap('interest-done');
        await ui.waitKey('event-recommendation-s2_demo_community_music');
        final request = httpObserver.latestEvent('home', after: savedSequence);
        report.check(
          request != null && request.status == 200,
          'fresh_post_save_home_http_request',
        );
        homeSequence = request!.sequence;
        await ui.assertEvents(request, scope, expectedCount: 2);
        report.ui('S2-06-04', [
          'home_route',
          'top_two',
          'backend_order',
          'title_time_match_reason',
        ]);
      });

      await report.row(5, () async {
        final before = httpObserver.sequence;
        await ui.tap('event-recommendations-see-all');
        await ui.waitKey('route-event-recommendations');
        await ui.waitKey('event-recommendation-s2_demo_community_late');
        final request = httpObserver.latestEvent('all', after: before);
        report.check(
          request != null &&
              request.status == 200 &&
              request.sequence > homeSequence,
          'separate_all_http_request',
        );
        await ui.assertEvents(request!, scope, expectedCount: 4);
        report.ui('S2-06-05', [
          'all_route',
          'four_items',
          'independent_response',
          'backend_order',
        ]);
      });

      await report.row(6, () async {
        // All is a root route without a Back button; navigate via the production router.
        scope.read(appRouterProvider).go(AppRoutes.home);
        await ui.waitKey('route-home');
        await ui.tap('edit-interests-button');
        await ui.waitKey('interest-clear');
        await ui.tap('interest-clear');
        await ui.tap('interest-save');
        await ui.waitKey('interest-save-success');
        final before = httpObserver.sequence;
        await ui.tap('interest-done');
        await ui.waitKey('event-recommendations-empty');
        final home = httpObserver.latestEvent('home', after: before);
        report.check(
          home != null &&
              home.status == 200 &&
              home.eventBody?['items'] is List &&
              (home.eventBody!['items'] as List).isEmpty,
          'successful_empty_home_response',
        );
        ui.assertEmpty();
        final beforeAll = httpObserver.sequence;
        await ui.tap('event-recommendations-see-all-empty');
        await ui.waitKey('route-event-recommendations');
        await ui.waitKey('event-recommendations-empty');
        final all = httpObserver.latestEvent('all', after: beforeAll);
        report.check(
          all != null &&
              all.status == 200 &&
              all.eventBody?['items'] is List &&
              (all.eventBody!['items'] as List).isEmpty,
          'independent_successful_empty_all_response',
        );
        ui.assertEmpty();
        report.ui('S2-06-06', [
          'home_and_all_successful_empty',
          'required_empty_copy',
          'no_error_or_stale_cards',
        ]);
      });

      await report.row(7, () async {
        scope.read(appRouterProvider).go(AppRoutes.home);
        await ui.waitKey('route-home');
        await ui.tap('edit-interests-button');
        await ui.waitKey('interest-option-interest_community');
        for (final tag in tags) {
          await ui.tap('interest-option-$tag');
        }
        await ui.tap('interest-save');
        await ui.waitKey('interest-save-success');
        savedRevision = scope.read(interestEditorControllerProvider).revision;
        await ui.tap('interest-done');
        await ui.waitKey('event-recommendation-s2_demo_community_music');
        await report.phase('disable_radios');
        await ui.waitHost('radios_off');
        final before = httpObserver.sequence;
        await ui.tap('event-recommendations-see-all');
        await ui.waitKey('event-recommendations-error');
        report.check(
          find
                  .byKey(const Key('event-recommendations-retry'))
                  .evaluate()
                  .length ==
              1,
          'explicit_retry_visible',
        );
        report.check(
          find
                  .byKey(const Key('event-recommendations-empty'))
                  .evaluate()
                  .isEmpty &&
              _cards().evaluate().isEmpty,
          'offline_is_error_not_empty_or_stale',
        );
        report.check(
          find.text('Event recommendations unavailable').evaluate().length ==
                  1 &&
              find
                      .text(
                        'This service is temporarily unavailable. Try again.',
                      )
                      .evaluate()
                      .length ==
                  1,
          'safe_public_error_copy',
        );
        final visible = tester
            .widgetList<Text>(find.byType(Text))
            .map((t) => t.data ?? '')
            .join(' ');
        report.check(
          !RegExp(
            r'https?://|Bearer |FirebaseException|SocketException|#0|ts\.net',
          ).hasMatch(visible),
          'no_vendor_token_endpoint_or_stack_in_error_ui',
        );
        final attempted = httpObserver.records
            .where((r) => r.sequence > before && r.operation == 'event_all')
            .toList();
        report.check(
          attempted.every((r) => r.status == null),
          'no_successful_http_during_outage',
        );
        report.failureBoundary = attempted.isEmpty
            ? 'auth_refresh'
            : 'backend_transport';
        final calls = httpObserver.sequence;
        final authCalls = tokenCalls;
        await tester.pump(const Duration(seconds: 5));
        report.check(
          httpObserver.sequence == calls && tokenCalls == authCalls,
          'no_hidden_retry_during_five_second_observation',
        );
        report.ui('S2-06-07', [
          'safe_unavailable',
          'retry_visible',
          'no_empty_or_stale',
          'no_hidden_retry',
        ]);
      });

      await report.row(8, () async {
        await report.phase('restore_radios');
        await ui.waitHost('radios_restored');
        // Radio restoration alone does not establish private HTTPS reachability.
        await ui.waitNetwork(baseUrl);
        report.check(
          find
                  .byKey(const Key('event-recommendations-error'))
                  .evaluate()
                  .length ==
              1,
          'error_retained_until_explicit_retry',
        );
        final before = httpObserver.sequence;
        await ui.tap('event-recommendations-retry');
        await ui.waitKey('event-recommendation-s2_demo_community_late');
        final request = httpObserver.latestEvent('all', after: before);
        report.check(
          request != null && request.status == 200,
          'explicit_retry_new_successful_request',
        );
        await ui.assertEvents(request!, scope, expectedCount: 4);
        report.check(
          find
              .byKey(const Key('event-recommendations-error'))
              .evaluate()
              .isEmpty,
          'success_replaces_error',
        );
        final later = await scope.read(interestRepositoryProvider).readOwn();
        report.check(
          later is Success<InterestSelection> &&
              later.value.revision == savedRevision &&
              _sameTags(later.value, tags),
          'saved_interests_preserved_after_recovery',
        );
        report.ui('S2-06-08', [
          'explicit_retry_success',
          'four_items',
          'saved_interests_retained',
        ]);
        scope.read(appRouterProvider).go(AppRoutes.home);
        await ui.waitKey('event-recommendation-s2_demo_community_music');
      });
    } finally {
      await report.finish(httpObserver.records);
      await report.phase('finished');
      await report.waitEvidenceReceipt();
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      container?.dispose();
      httpObserver.close();
    }
  }, timeout: const Timeout(Duration(minutes: 12)));
}

bool _sameTags(InterestSelection value, List<String> expected) {
  final actual = value.interestTags.map((t) => t.interestTagId).toSet();
  return actual.length == expected.length && actual.containsAll(expected);
}

Finder _cards() => find.byWidgetPredicate(
  (widget) =>
      widget is ListTile &&
      widget.key is ValueKey<String> &&
      (widget.key! as ValueKey<String>).value.startsWith(
        'event-recommendation-',
      ),
);

class _Ui {
  _Ui(this.tester, this.report);
  final WidgetTester tester;
  final _Report report;

  Future<void> waitKey(String key) async {
    final until = DateTime.now().add(const Duration(seconds: 45));
    while (find.byKey(Key(key)).evaluate().isEmpty &&
        DateTime.now().isBefore(until)) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    report.check(find.byKey(Key(key)).evaluate().isNotEmpty, 'visible_$key');
    await tester.pump(const Duration(milliseconds: 100));
  }

  Future<void> tap(String key) async {
    await waitKey(key);
    final finder = find.byKey(Key(key));
    await tester.ensureVisible(finder);
    await tester.pump(const Duration(milliseconds: 150));
    await tester.tap(finder);
    await tester.pump(const Duration(milliseconds: 200));
  }

  Future<void> enter(String key, String value) async {
    await waitKey(key);
    await tester.ensureVisible(find.byKey(Key(key)));
    await tester.enterText(find.byKey(Key(key)), value);
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump(const Duration(milliseconds: 200));
  }

  Future<void> waitHost(String state) async {
    final file = File('${Directory.systemTemp.path}/s2-06-$state');
    final until = DateTime.now().add(const Duration(seconds: 120));
    while (!file.existsSync() && DateTime.now().isBefore(until)) {
      await tester.pump(const Duration(milliseconds: 250));
    }
    report.check(file.existsSync(), 'host_ack_$state');
  }

  Future<void> waitNetwork(String baseUrl) async {
    final client = http.Client();
    final until = DateTime.now().add(const Duration(seconds: 60));
    var ready = false;
    try {
      while (!ready && DateTime.now().isBefore(until)) {
        ready = true;
        for (final path in [
          '/v1/interest-tags',
          '/v1/recommendations/events?view=home',
        ]) {
          try {
            final response = await client
                .get(Uri.parse(baseUrl).resolve(path))
                .timeout(const Duration(seconds: 5));
            final body = jsonDecode(response.body);
            ready =
                ready &&
                response.statusCode == 401 &&
                body is Map<String, dynamic> &&
                body['error'] is Map<String, dynamic> &&
                body['error']['code'] == 'AUTH_REQUIRED';
          } catch (_) {
            ready = false;
          }
        }
        if (!ready) await tester.pump(const Duration(seconds: 1));
      }
    } finally {
      client.close();
    }
    report.check(ready, 'restored_private_https_both_401_auth_required');
  }

  void assertEmpty() {
    report.check(
      find.text(eventEmptyTitle).evaluate().length == 1 &&
          find.text(eventEmptyBody).evaluate().length == 1,
      'approved_empty_copy',
    );
    report.check(
      _cards().evaluate().isEmpty &&
          find
              .byKey(const Key('event-recommendations-error'))
              .evaluate()
              .isEmpty,
      'no_stale_cards_or_dependency_error',
    );
  }

  Future<void> assertEvents(
    _Request observation,
    ProviderContainer scope, {
    required int expectedCount,
  }) async {
    final body = observation.eventBody;
    report.check(
      body != null && body['asOf'] is String && body['items'] is List,
      'own_backend_asof_and_items',
    );
    final items = (body!['items'] as List).cast<Map<String, dynamic>>();
    const ids = [
      's2_demo_community_music',
      's2_demo_community_early',
      's2_demo_music_early',
      's2_demo_community_late',
    ];
    report.check(
      items.length == expectedCount &&
          List.generate(
            expectedCount,
            (i) => items[i]['eventId'] == ids[i],
          ).every((x) => x),
      'approved_fixture_count_and_ranking',
    );
    final asOf = DateTime.parse(body['asOf'] as String);
    report.check(
      items.every(
        (item) => DateTime.parse(item['startAt'] as String).isAfter(asOf),
      ),
      'fixtures_future_at_actual_server_asof',
    );
    final state = scope
        .read(eventRecommendationsControllerProvider)
        .asData
        ?.value;
    report.check(
      state != null &&
          state.asOf == asOf &&
          state.items.length == expectedCount,
      'ui_state_from_this_response',
    );
    final rendered = tester.widgetList<ListTile>(_cards()).toList();
    report.check(rendered.length == expectedCount, 'rendered_card_count');
    for (var i = 0; i < expectedCount; i++) {
      final item = items[i];
      final tile = rendered[i];
      report.check(
        tile.key == Key('event-recommendation-${ids[i]}') &&
            tile.title is Text &&
            (tile.title! as Text).data == item['title'],
        'rendered_order_and_title_$i',
      );
      final start = DateTime.parse(item['startAt'] as String)
          .toLocal()
          .toString()
          .substring(0, 16);
      final end = DateTime.parse(item['endAt'] as String)
          .toLocal()
          .toString()
          .substring(0, 16);
      final matches = (item['matchedInterests'] as List)
          .cast<Map<String, dynamic>>();
      final reason = matches.map((m) => m['displayName']).join(', ');
      report.check(
        tile.subtitle is Text &&
            (tile.subtitle! as Text).data == '$start to $end\nMatches: $reason',
        'rendered_time_and_match_reason_$i',
      );
    }
  }
}

// Pass-through observation at BackendApiClient's existing injection seam.
// No request headers, bodies, URLs, account IDs or Note contents are recorded.
// Only Event responses remain briefly in memory to assert fixture/UI alignment.
class _ObservedHttpClient extends http.BaseClient {
  final http.Client _real = http.Client();
  final List<_Request> records = [];
  int get sequence => records.length;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final path = request.url.path;
    final operation = switch (path) {
      '/v1/recommendations/events' =>
        'event_${request.url.queryParameters['view'] ?? 'unknown'}',
      '/v1/me/onboarding' =>
        request.method == 'PUT' ? 'onboarding_write' : 'onboarding_read',
      '/v1/me/interests' =>
        request.method == 'PUT' ? 'interests_write' : 'interests_read',
      '/v1/interest-tags' => 'interest_catalogue',
      '/v1/check-ins' => 'note_create',
      _ => path.startsWith('/v1/check-ins/') ? 'note_read' : 'other',
    };
    final record = _Request(sequence + 1, operation);
    records.add(record);
    try {
      final response = await _real.send(request);
      record.status = response.statusCode;
      if (!operation.startsWith('event_')) return response;
      final bytes = await response.stream.toBytes();
      if (response.statusCode == 200) {
        final value = jsonDecode(utf8.decode(bytes));
        if (value is Map<String, dynamic>) record.eventBody = value;
      }
      return http.StreamedResponse(
        Stream.value(bytes),
        response.statusCode,
        contentLength: response.contentLength,
        request: response.request,
        headers: response.headers,
        isRedirect: response.isRedirect,
        persistentConnection: response.persistentConnection,
        reasonPhrase: response.reasonPhrase,
      );
    } catch (_) {
      record.transportFailed = true;
      rethrow;
    }
  }

  _Request? latestEvent(String view, {required int after}) {
    final found = records.where(
      (r) => r.sequence > after && r.operation == 'event_$view',
    );
    return found.isEmpty ? null : found.last;
  }

  @override
  void close() => _real.close();
}

class _Request {
  _Request(this.sequence, this.operation);
  final int sequence;
  final String operation;
  final String startedUtc = DateTime.now().toUtc().toIso8601String();
  int? status;
  bool transportFailed = false;
  Map<String, dynamic>? eventBody;
  Map<String, Object?> sanitized() => {
    'sequence': sequence,
    'operation': operation,
    'startedUtc': startedUtc,
    'status': status,
    'transportFailed': transportFailed,
    if (eventBody != null) 'asOf': eventBody!['asOf'],
    if (eventBody?['items'] is List)
      'itemCount': (eventBody!['items'] as List).length,
  };
}

class _Report {
  _Report(this.appHead);
  final String appHead;
  final String startedUtc = DateTime.now().toUtc().toIso8601String();
  final Map<String, String> rows = {
    for (var i = 1; i <= 8; i++) 'S2-06-0$i': 'Not Run',
  };
  final List<Map<String, Object?>> assertions = [];
  final Map<String, List<String>> uiEvidence = {};
  String? failureBoundary;
  String? currentRow;
  String get cache => Directory.systemTemp.path;
  Future<void> initialize() async {
    for (final name in ['radios_off', 'radios_restored', 'evidence_saved']) {
      final file = File('$cache/s2-06-$name');
      if (await file.exists()) await file.delete();
    }
    await phase('running');
  }

  void check(bool value, String label) {
    assertions.add({'row': currentRow, 'assertion': label, 'pass': value});
    if (!value) throw TestFailure('S2-06 assertion failed: $label');
  }

  void ui(String row, List<String> labels) {
    uiEvidence[row] = labels;
  }

  Future<void> row(int number, Future<void> Function() action) async {
    final id = 'S2-06-0$number';
    currentRow = id;
    try {
      await action();
      rows[id] = 'Pass';
    } catch (_) {
      rows[id] = 'Fail';
      rethrow;
    } finally {
      // Fixed, sanitized labels only; no assertion actual-value dumps.
      // ignore: avoid_print
      print('S2_06_ROW $id ${rows[id]!}');
    }
  }

  Future<void> phase(String value) =>
      File('$cache/s2-06-phase').writeAsString(value, flush: true);
  Future<void> waitEvidenceReceipt() async {
    // flutter test may uninstall the app on completion. Keep its sandbox alive
    // until the host has read and validated the sanitized result JSON.
    final receipt = File('$cache/s2-06-evidence_saved');
    final until = DateTime.now().add(const Duration(seconds: 60));
    while (!receipt.existsSync() && DateTime.now().isBefore(until)) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
    }
    if (!receipt.existsSync()) {
      throw TestFailure('Host did not acknowledge sanitized evidence export.');
    }
  }

  Future<void> finish(List<_Request> requests) async {
    final evidence = {
      'appSource': appHead,
      'startedUtc': startedUtc,
      'endedUtc': DateTime.now().toUtc().toIso8601String(),
      'rows': rows,
      'assertions': assertions,
      'uiEvidence': uiEvidence,
      'failureBoundary': failureBoundary,
      'requests': requests.map((r) => r.sanitized()).toList(),
    };
    await File('$cache/s2-06-result.json').writeAsString(
      const JsonEncoder.withIndent('  ').convert(evidence),
      flush: true,
    );
    // ignore: avoid_print
    print('S2_06_RESULT ${jsonEncode(rows)}');
  }
}
