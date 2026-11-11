import 'dart:async';
import 'dart:convert';

import 'package:enmori/app/enmori_theme.dart';
import 'package:enmori/features/account/domain/cloud_ai_consent.dart';
import 'package:enmori/core/network/backend_api_client.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/auth/auth_providers.dart';
import 'package:enmori/features/auth/domain/auth_repository.dart';
import 'package:enmori/features/personas/data/backend_persona_preview_repository.dart';
import 'package:enmori/features/personas/domain/persona.dart';
import 'package:enmori/features/personas/domain/persona_preview_repository.dart';
import 'package:enmori/features/personas/persona_preview_providers.dart';
import 'package:enmori/features/personas/presentation/persona_preview_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _draft = PersonaFields(
  displayName: 'Draft guide',
  tone: PersonaTone.warm,
  responseLength: PersonaResponseLength.detailed,
  formatStyle: PersonaFormatStyle.bulleted,
  relationship: 'Study companion',
  shortIntroduction: 'Take it one step at a time.',
  description: 'A calm guide',
  personality: 'Curious',
  communicationStyle: 'Ask a short follow-up',
  interests: 'Reading, custom interest',
  extraInstructions: 'Use concrete examples\nRespect my pace.',
);

void main() {
  group('stateless preview transport', () {
    test('rejects error status/code mismatch, unknown fields and blank request identity', () async {
      for (final body in <Object>[
        {
          'error': {'code': 'AI_BUSY', 'message': 'Busy'},
          'requestId': 'req_test',
        },
        {
          'error': {
            'code': 'AI_UNAVAILABLE',
            'message': 'Unavailable',
            'private': true,
          },
          'requestId': 'req_test',
        },
        {
          'error': {'code': 'AI_UNAVAILABLE', 'message': ''},
          'requestId': 'req_test',
        },
        {
          'error': {'code': 'AI_UNAVAILABLE', 'message': 'Unavailable'},
          'requestId': '',
        },
        {
          'error': {'code': 'UNKNOWN_CODE', 'message': 'Unavailable'},
          'requestId': 'req_test',
        },
      ]) {
        final result = await _repository((_) async => _response(body, 503))
            .preview(draft: _draft, text: 'Hello', isEligible: () => true);
        expect(
          (result as Failure<String>).failure.kind,
          AppFailureKind.unexpected,
        );
      }
    });
    test(
      'sends only current draft and text, never selection/history/identity',
      () async {
        final requests = <http.Request>[];
        final repository = _repository((request) async {
          requests.add(request);
          expect(request.followRedirects, isFalse);
          return _response({'message': 'Let us take one small step.'});
        });
        final result = await repository.preview(
          draft: _draft,
          text: 'Help me get started',
          isEligible: () => true,
        );
        expect(
          (result as Success<String>).value,
          'Let us take one small step.',
        );
        expect(requests.single.method, 'POST');
        expect(requests.single.url.path, '/v1/me/persona-preview');
        expect(
          requests.single.headers['Authorization'],
          'Bearer synthetic-token',
        );
        expect(requests.single.headers.containsKey('Idempotency-Key'), isFalse);
        expect(jsonDecode(requests.single.body), {
          'draft': {
            'displayName': 'Draft guide',
            'tone': 'warm',
            'responseLength': 'detailed',
            'formatStyle': 'bulleted',
            ..._draft.expressionFields,
          },
          'text': 'Help me get started',
        });
      },
    );

    test('OpenAI preview explicitly marks the selected processor and no other payload', () async {
      final requests = <http.Request>[];
      final client = MockClient((request) async {
        requests.add(request);
        return _response({'message': 'Hello'});
      });
      addTearDown(client.close);
      final repository = BackendPersonaPreviewRepository(
        baseUri: Uri.parse('https://enmori-backend-20261029.azurewebsites.net'),
        tokenProvider: () async => const Success('synthetic-token'),
        client: client,
        processing: AiClientProcessing.openaiCloud,
      );
      expect(
        await repository.preview(
          draft: _draft,
          text: 'Hello',
          isEligible: () => true,
        ),
        isA<Success<String>>(),
      );
      final body = jsonDecode(requests.single.body) as Map<String, dynamic>;
      expect(body.keys.toSet(), {
        'draft',
        'text',
        'processing',
        'provider',
        'disclosureVersion',
      });
      expect(body['processing'], 'cloud');
      expect(body['provider'], 'openai');
      expect(body['disclosureVersion'], 'openai_cloud_v1');
    });

    test('invalid text never dispatches and draft strings have no invented length cap', () async {
      var sends = 0;
      final repository = _repository((_) async {
        sends++;
        return _response({'message': 'Preview'});
      });
      for (final text in ['', '  ', 'a' * 2401, '\ud800']) {
        expect(
          await repository.preview(
            draft: _draft,
            text: text,
            isEligible: () => true,
          ),
          isA<Failure<String>>(),
        );
      }
      expect(sends, 0);
      final longDraft = PersonaFields(
        displayName: 'Long draft',
        tone: PersonaTone.neutral,
        responseLength: PersonaResponseLength.balanced,
        formatStyle: PersonaFormatStyle.plain,
        description: 'a' * 3000,
      );
      expect(
        await repository.preview(
          draft: longDraft,
          text: 'Hello',
          isEligible: () => true,
        ),
        isA<Success<String>>(),
      );
      expect(sends, 1);
    });

    test(
      'consent/session change during token wait prevents dispatch',
      () async {
        final token = Completer<Result<String>>();
        var eligible = true;
        var sends = 0;
        final repository = _repository((_) async {
          sends++;
          return _response({'message': 'Late'});
        }, token: () => token.future);
        final request = repository.preview(
          draft: _draft,
          text: 'Hello',
          isEligible: () => eligible,
        );
        eligible = false;
        token.complete(const Success('synthetic-token'));
        expect(
          (await request as Failure<String>).failure.kind,
          AppFailureKind.aiAuthorityChanged,
        );
        expect(sends, 0);
      },
    );

    test(
      'token completing after original deadline cannot dispatch later',
      () async {
        final token = Completer<Result<String>>();
        var sends = 0;
        final repository = _repository(
          (_) async {
            sends++;
            return _response({'message': 'Late'});
          },
          token: () => token.future,
          timeout: const Duration(milliseconds: 10),
        );
        expect(
          await repository.preview(
            draft: _draft,
            text: 'Hello',
            isEligible: () => true,
          ),
          isA<Failure<String>>(),
        );
        token.complete(const Success('synthetic-token'));
        await Future<void>.delayed(Duration.zero);
        expect(sends, 0);
      },
    );

    test('late response is rejected after eligibility ends', () async {
      var eligible = true;
      final repository = _repository((_) async {
        eligible = false;
        return _response({'message': 'Private late reply'});
      });
      expect(
        (await repository.preview(
          draft: _draft,
          text: 'Hello',
          isEligible: () => eligible,
        ) as Failure<String>).failure.kind,
        AppFailureKind.aiAuthorityChanged,
      );
    });

    test(
      'rejects malformed success envelopes and sanitizes typed failure copy',
      () async {
        for (final body in <Object>[
          {},
          {'message': ''},
          {'message': 'a' * 2401},
          {'message': 'Fine', 'conversationId': 'unapproved'},
          {'message': 2},
          {'message': '\ud800'},
          [],
        ]) {
          expect(
            await _repository((_) async => _response(body))
                .preview(draft: _draft, text: 'Hello', isEligible: () => true),
            isA<Failure<String>>(),
          );
        }
        final error = await _repository(
          (_) async => _response({
            'error': {
              'code': 'AI_CONTEXT_NOT_PERMITTED',
              'message': 'private provider details',
            },
            'requestId': 'req_synthetic',
          }, 403),
        ).preview(draft: _draft, text: 'Hello', isEligible: () => true);
        expect(
          (error as Failure<String>).failure.kind,
          AppFailureKind.aiContextNotPermitted,
        );
        expect(error.failure.message, isNot(contains('private provider')));
      },
    );
  });

  for (final cause in ['consent', 'same UID session', 'auth error']) {
    test(
      'preview drops late reply and clears prior state after $cause',
      () async {
        final auth = StreamController<AuthSession>();
        var accepted = true;
        final repository = _PreviewRepository();
        final container = ProviderContainer(
          overrides: [
            authSessionProvider.overrideWith((ref) => auth.stream),
            personaPreviewAccessProvider.overrideWith((ref) => accepted),
            personaPreviewRepositoryProvider.overrideWithValue(repository),
          ],
        );
        addTearDown(() {
          container.dispose();
          unawaited(auth.close());
        });
        final subscription = container.listen(
          personaPreviewControllerProvider,
          (_, _) {},
        );
        addTearDown(subscription.close);
        auth.add(AuthSessionAuthenticated(subject: 'synthetic-owner'));
        await container.pump();
        final controller = container.read(
          personaPreviewControllerProvider.notifier,
        );
        final before = container.read(personaPreviewControllerProvider);
        final pending = controller.preview(_draft, 'A private question');
        if (cause == 'consent') {
          accepted = false;
          container.invalidate(personaPreviewAccessProvider);
        } else if (cause == 'auth error') {
          auth.addError(StateError('synthetic observation error'));
        } else {
          auth.add(AuthSessionAuthenticated(subject: 'synthetic-owner'));
        }
        await container.pump();
        expect(repository.eligible!(), isFalse);
        repository.reply.complete(const Success('Private late reply'));
        await pending;
        final after = container.read(personaPreviewControllerProvider);
        expect(after.sessionKey, isNot(same(before.sessionKey)));
        expect(after.reply, isNull);
        expect(after.isBusy, isFalse);
        if (cause != 'same UID session') expect(after.canPreview, isFalse);
      },
    );
  }

  for (final size in [const Size(375, 812), const Size(812, 375)]) {
    for (final dark in [false, true]) {
      testWidgets(
        'preview wraps at $size, dark=$dark, large text and reduced motion',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final container = ProviderContainer(
            overrides: [
              authSessionProvider.overrideWith(
                (ref) => Stream.value(
                  AuthSessionAuthenticated(subject: 'synthetic-owner'),
                ),
              ),
              personaPreviewAccessProvider.overrideWithValue(true),
              personaPreviewRepositoryProvider.overrideWithValue(
                _PreviewRepository(),
              ),
            ],
          );
          addTearDown(container.dispose);
          final authSub = container.listen(authSessionProvider, (_, _) {});
          addTearDown(authSub.close);
          await container.pump();
          await tester.pumpWidget(
            UncontrolledProviderScope(
              container: container,
              child: MaterialApp(
                theme: dark ? ThemeData.dark() : enmoriTheme(),
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    textScaler: const TextScaler.linear(2.5),
                    disableAnimations: true,
                  ),
                  child: child!,
                ),
                home: const PersonaPreviewPage(fields: _draft),
              ),
            ),
          );
          await tester.pumpAndSettle();
          final send = find.byKey(const Key('persona-preview-send'));
          await tester.scrollUntilVisible(
            send,
            200,
            scrollable: find.byType(Scrollable).first,
          );
          await tester.pumpAndSettle();
          expect(send.hitTestable(), findsOneWidget);
          await tester.tap(send);
          await tester.pumpAndSettle();
          expect(
            find.text('Enter a message of 1–2400 characters.'),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('preview hides input before permission and never submits', (
    tester,
  ) async {
    final repository = _PreviewRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authSessionProvider.overrideWith(
            (ref) => Stream.value(
              AuthSessionAuthenticated(subject: 'synthetic-owner'),
            ),
          ),
          personaPreviewRepositoryProvider.overrideWithValue(repository),
        ],
        child: const MaterialApp(home: PersonaPreviewPage(fields: _draft)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('persona-preview-input')), findsNothing);
    expect(repository.calls, 0);
  });

  testWidgets(
    'preview failure keeps input and manual retry succeeds; withdrawal clears it',
    (tester) async {
      final auth = StreamController<AuthSession>();
      var accepted = true;
      final repository = _PreviewRepository();
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith((ref) => auth.stream),
          personaPreviewAccessProvider.overrideWith((ref) => accepted),
          personaPreviewRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(() {
        container.dispose();
        unawaited(auth.close());
      });
      final authSub = container.listen(authSessionProvider, (_, _) {});
      addTearDown(authSub.close);
      auth.add(AuthSessionAuthenticated(subject: 'synthetic-owner'));
      await container.pump();
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: PersonaPreviewPage(fields: _draft)),
        ),
      );
      await tester.pumpAndSettle();
      final input = find.byKey(const Key('persona-preview-input'));
      await tester.enterText(input, 'Help me begin');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('persona-preview-send')));
      await tester.pump();
      repository.reply.complete(
        const Failure(
          AppFailure(kind: AppFailureKind.aiBusy, message: 'Synthetic busy'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('persona-preview-error')), findsOneWidget);
      expect(
        tester.widget<TextFormField>(input).controller!.text,
        'Help me begin',
      );
      expect(repository.calls, 1);
      repository.reply = Completer<Result<String>>();
      await tester.tap(find.byKey(const Key('persona-preview-send')));
      await tester.pump();
      repository.reply.complete(const Success('Try one small step.'));
      await tester.pumpAndSettle();
      expect(find.text('Try one small step.'), findsOneWidget);
      expect(repository.calls, 2);
      expect(repository.draft, _draft);
      accepted = false;
      container.invalidate(personaPreviewAccessProvider);
      await tester.pumpAndSettle();
      expect(find.text('Try one small step.'), findsNothing);
      expect(input, findsNothing);
      expect(find.text('Preview cleared'), findsOneWidget);
      accepted = true;
      container.invalidate(personaPreviewAccessProvider);
      await tester.pumpAndSettle();
      expect(input, findsNothing);
      expect(repository.calls, 2);
      expect(tester.takeException(), isNull);
    },
  );
}

BackendPersonaPreviewRepository _repository(
  Future<http.Response> Function(http.Request) handler, {
  AuthTokenProvider? token,
  Duration timeout = const Duration(seconds: 2),
}) {
  final client = MockClient(handler);
  addTearDown(client.close);
  return BackendPersonaPreviewRepository(
    baseUri: Uri.parse('https://example.invalid'),
    client: client,
    tokenProvider: token ?? () async => const Success('synthetic-token'),
    timeout: timeout,
  );
}

http.Response _response(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

final class _PreviewRepository implements PersonaPreviewRepository {
  Completer<Result<String>> reply = Completer<Result<String>>();
  int calls = 0;
  bool Function()? eligible;
  PersonaFields? draft;
  @override
  Future<Result<String>> preview({
    required PersonaFields draft,
    required String text,
    required bool Function() isEligible,
  }) {
    calls++;
    this.draft = draft;
    eligible = isEligible;
    return reply.future;
  }
}
