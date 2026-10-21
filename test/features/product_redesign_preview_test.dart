import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:enmori/app/event_recommendation_card.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/features/event_participation/data/backend_participation_repository.dart';
import 'package:enmori/features/event_participation/participation_providers.dart';
import 'package:enmori/features/weather/domain/foreground_location.dart';
import 'package:enmori/features/weather/domain/weather.dart';
import 'package:enmori/features/weather/weather_providers.dart';
import 'package:enmori/app/social_demo_presentation.dart';
import 'package:enmori/features/event_recommendations/domain/event_recommendation_repository.dart';
import 'package:enmori/app/home_shell_page.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/account/account_providers.dart';
import 'package:enmori/features/account/account_preferences_providers.dart';
import 'package:enmori/features/account/domain/account_preferences_repository.dart';
import 'package:enmori/features/account/domain/profile_details.dart';
import 'package:enmori/features/account/presentation/own_profile_page.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/check_in/presentation/check_in_page.dart';
import 'package:enmori/features/event_browse/domain/activity_repository.dart';
import 'package:enmori/features/event_browse/event_browse_providers.dart';
import 'package:enmori/features/event_participation/presentation/participation_events_page.dart';
import 'package:enmori/features/event_recommendations/event_recommendations_providers.dart';
import 'package:enmori/features/interests/interests_providers.dart';
import 'package:enmori/features/interests/domain/interest_repository.dart';

import '../support/fakes.dart';
import '../support/fake_account_preferences.dart';

import 'dart:io';
import 'dart:ui' as ui;

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/account/domain/account_repository.dart';
import 'package:enmori/features/ai_conversation/ai_conversation_providers.dart';
import 'package:enmori/features/ai_conversation/presentation/ai_conversation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Actual production widgets with explicitly synthetic data and no network tiles.
/// Optional rasters are review evidence, not device/provider acceptance.
void main() {
  testWidgets('five production pages fit phone and large-text landscape', (
    tester,
  ) async {
    final feedback = Platform.environment['ENMORI_FEEDBACK_PREVIEW'] != null;
    final participation = BackendApiClient(
      Uri.parse('https://preview.invalid'),
      () async => const Success('synthetic-preview'),
      httpClient: MockClient(
        (request) async => http.Response(
          jsonEncode({
            'participation': {
              'eventId': request.url.pathSegments[2],
              'status': 'going',
              'ignored': false,
              'revision': 1,
              'updatedAt': '2026-10-21T09:00:00.000Z',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        ),
      ),
    );
    addTearDown(participation.close);
    for (final (family, path) in [
      ('Roboto', Platform.environment['ENMORI_CAPTURE_FONT']),
      ('MaterialIcons', Platform.environment['ENMORI_CAPTURE_ICONS']),
      (
        'Playfair Display',
        'assets/fonts/playfair_display/PlayfairDisplay[wght].ttf',
      ),
    ]) {
      if (path != null) {
        final bytes = await tester.runAsync(() => File(path).readAsBytes());
        await tester.runAsync(
          () => (FontLoader(
            family,
          )..addFont(Future.value(ByteData.sublistView(bytes!)))).load(),
        );
      }
    }
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    for (final (size, scale, label) in [
      (const Size(375, 812), 1.0, 'phone'),
      if (!feedback) (const Size(812, 375), 2.0, 'landscape-2x'),
    ]) {
      tester.view.physicalSize = size;
      for (final (name, page) in <(String, Widget)>[
        (
          'home',
          HomeShellPage(
            socialStyle: true,
            recommendationCardBuilder: (context, event, onOpen) =>
                ConnectedRecommendationCard(event: event, onOpen: (_) {}),
            onStartCheckIn: () {},
            onSeeAllEvents: () {},
            onBrowseActivities: () {},
            onOpenEvent: (_) {},
            onSelectTab: (_) {},
            onOpenHistory: () {},
            onOpenFootprint: () {},
            onOpenAi: () {},
          ),
        ),
        (
          'check-in',
          CheckInComposerPage(
            socialStyle: true,
            located: true,
            onReturnHome: () {},
          ),
        ),
        ('events', _tab(ParticipationEventsPage(onSelect: (_) {}), 2)),
        (
          'profile',
          _tab(
            OwnProfilePage(
              onEditInterests: () async {},
              onOpenHistory: () {},
              onOpenFootprint: () {},
            ),
            4,
          ),
        ),
        (
          'chat-pending',
          AiConversationPage(
            socialStyle: true,
            onBack: () {},
            onOpenSettings: () {},
            navigationBarBuilder: (_) =>
                SocialDemoNavigation(selectedIndex: 3, onSelected: (_) {}),
          ),
        ),
      ]) {
        if (feedback && name == 'profile') continue;
        await tester.pumpWidget(
          ProviderScope(
            key: ValueKey('$name-$label'),
            overrides: [
              participationRepositoryProvider.overrideWithValue(
                BackendParticipationRepository(participation),
              ),
              if (feedback)
                foregroundLocationProvider.overrideWithValue(
                  _PendingLocation(),
                ),
              authSessionProvider.overrideWithValue(
                const AsyncData(AuthSessionAuthenticated(subject: 'preview')),
              ),
              currentAuthSubjectProvider.overrideWithValue('preview'),
              accountRepositoryProvider.overrideWithValue(
                FakeAccountRepository()
                  ..statusResult = Success(
                    OnboardingCompleted(testAccount(username: 'alex_w')),
                  ),
              ),
              accountPreferencesRepositoryProvider.overrideWithValue(
                FakeAccountPreferences()
                  ..settings = OwnSettings(
                    defaultCheckInLocation: feedback,
                    defaultCheckInWeather: feedback,
                    checkInVisibility: CheckInVisibility.private,
                    consent: OptionalProcessingConsent.rejected,
                    revision: 1,
                  )
                  ..profile = const OwnProfile(
                    username: 'alex_w',
                    displayName: 'Alex Williams',
                    details: ProfileDetails(
                      bio: 'Finding quiet moments between classes.',
                    ),
                    visibility: ProfileVisibility.private,
                    revision: 1,
                  ),
              ),
              interestRepositoryProvider.overrideWithValue(
                FakeInterestRepository()
                  ..ownResult = const Success(
                    InterestSelection(
                      interestTags: [
                        SelectedInterestTag(
                          interestTagId: 'books',
                          displayName: 'Books',
                          lifecycleState: InterestLifecycleState.active,
                        ),
                        SelectedInterestTag(
                          interestTagId: 'art',
                          displayName: 'Art',
                          lifecycleState: InterestLifecycleState.active,
                        ),
                      ],
                      revision: 1,
                    ),
                  ),
              ),
              eventRecommendationRepositoryProvider.overrideWithValue(
                FakeEventRecommendationRepository()
                  ..homeResult = Success(
                    EventRecommendationResponse(
                      asOf: DateTime.utc(2026, 10, 21),
                      formulaVersion: 'preview',
                      items: [
                        EventRecommendation(
                          eventId: 'preview-1',
                          title: 'Evening jazz at the gardens',
                          startAt: DateTime.utc(2026, 10, 23, 11),
                          matchedInterests: const [
                            MatchedInterest(
                              interestTagId: 'music',
                              displayName: 'Music',
                            ),
                          ],
                          reasonCode: 'preview',
                        ),
                        EventRecommendation(
                          eventId: 'preview-2',
                          title: 'Weekend art workshop',
                          startAt: DateTime.utc(2026, 10, 24, 2),
                          matchedInterests: const [
                            MatchedInterest(
                              interestTagId: 'art',
                              displayName: 'Art',
                            ),
                          ],
                          reasonCode: 'preview',
                        ),
                      ],
                    ),
                  ),
              ),
              activityRepositoryProvider.overrideWithValue(_PreviewEvents()),
              aiConversationControllerProvider.overrideWith(
                _PreviewConversation.new,
              ),
            ],
            child: RepaintBoundary(
              key: const Key('capture'),
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: enmoriTheme(),
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    textScaler: TextScaler.linear(scale),
                    disableAnimations: true,
                  ),
                  child: child!,
                ),
                home: page,
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        if (feedback && name == 'home') {
          await Scrollable.ensureVisible(
            tester.element(find.byKey(const ValueKey('event-card-preview-1'))),
            alignment: 0,
          );
          await tester.pumpAndSettle();
        }
        if (feedback && name == 'check-in') {
          await tester.enterText(
            find.byType(TextField).first,
            'A quiet walk after class.',
          );
          tester.testTextInput.hide();
          FocusManager.instance.primaryFocus?.unfocus();
          await tester.pumpAndSettle();
        }
        final output =
            Platform.environment['ENMORI_FEEDBACK_PREVIEW'] ??
            Platform.environment['ENMORI_PRODUCT_PREVIEW'];
        if (output != null) {
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(const Key('capture')),
          );
          final bitmap = await tester.runAsync(
            () => boundary.toImage(pixelRatio: 2),
          );
          final bytes = await tester.runAsync(
            () => bitmap!.toByteData(format: ui.ImageByteFormat.png),
          );
          await tester.runAsync(() async {
            await Directory(output).create(recursive: true);
            await File('$output/$name-$label.png')
                .writeAsBytes(bytes!.buffer.asUint8List());
          });
          bitmap!.dispose();
        }
        if (name == 'check-in') {
          final save = find.text(
            feedback ? 'Preparing location…' : 'Save Check-in',
          );
          await tester.ensureVisible(save);
          await tester.pumpAndSettle();
          expect(save.hitTestable(), findsOneWidget);
          expect(tester.takeException(), isNull);
        }
        await tester.pumpWidget(const SizedBox.shrink());
      }
    }
  });
}

class _PreviewConversation extends AiConversationController {
  @override
  AiConversationState build() => AiConversationState(
    sessionKey: 'preview',
    phase: AiConversationPhase.waiting,
    canCancel: true,
    localOutgoingKey: 'preview-request',
    localOutgoingText: 'I enjoyed a quiet walk today.',
  );
  @override
  void detach({Object? sessionKey}) {}
}

class _PreviewEvents implements ActivityRepository {
  @override
  Future<Result<ActivityRead>> read(String? id) async => Success(
    ActivityBatch(
      asOf: '2026-10-21T09:00:00Z',
      items: const [
        ActivitySummary(
          browseId: 'preview-1',
          eventId: 'preview-1',
          title: 'Evening jazz at the gardens',
          startAt: '2026-10-23T11:00:00Z',
          locationLabel: 'Singapore · Botanic Gardens',
          categoryLabel: 'Music',
        ),
        ActivitySummary(
          browseId: 'preview-2',
          eventId: 'preview-2',
          title: 'Weekend art workshop',
          startAt: '2026-10-24T02:00:00Z',
          locationLabel: 'Singapore',
          categoryLabel: 'Arts',
        ),
      ],
    ),
  );
}

Widget _tab(Widget page, int index) => Scaffold(
  body: page,
  bottomNavigationBar: SocialDemoNavigation(
    selectedIndex: index,
    onSelected: (_) {},
  ),
);

class _PendingLocation implements ForegroundLocation {
  @override
  Future<Result<GeoPoint>> capture({required bool precise}) =>
      Completer<Result<GeoPoint>>().future;
}
