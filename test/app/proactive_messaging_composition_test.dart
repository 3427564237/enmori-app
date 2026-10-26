import 'dart:async';

import 'package:enmori/app/proactive_messaging_composition.dart';
import 'package:enmori/app/router/companion_navigation.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation_repository.dart';
import 'package:enmori/features/ai_conversation/domain/ai_owned_sources.dart';
import 'package:enmori/features/proactive/domain/proactive.dart';
import 'package:enmori/features/proactive/domain/proactive_messaging.dart';
import 'package:enmori/features/proactive/proactive_notification_controller.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _target = AiMessageAnchor(
  locator: AiMessageLocator(
    conversationId: '11111111-1111-4111-8111-111111111111',
    messageId: '22222222-2222-4222-8222-222222222222',
  ),
  sequence: 3,
  pageBefore: 'NA',
);

void main() {
  for (final installation in <String?>[null, 'invalid-installation']) {
    testWidgets(
      'unconfigured installation $installation does not create the notification controller or touch its SDK',
      (tester) async {
        final sdk = _UntouchedMessaging();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              companionFirstFlowEnabledProvider.overrideWithValue(true),
              proactiveMessagingEnabledProvider.overrideWithValue(true),
              proactiveMessagingInstallationRefProvider.overrideWithValue(
                installation,
              ),
              proactiveMessagingPortProvider.overrideWithValue(sdk),
            ],
            child: const CompanionNotificationBoundary(child: SizedBox()),
          ),
        );
        await tester.pump();
        final container = ProviderScope.containerOf(
          tester.element(find.byType(CompanionNotificationBoundary)),
        );
        expect(
          container.exists(proactiveNotificationControllerProvider),
          isFalse,
        );
        expect(sdk.calls, 0);
        expect(tester.takeException(), isNull);
      },
    );
  }

  test('notification bridge forwards only the opaque reference and verified target', () async {
    final abort = ProactiveAbortSignal();
    late AiAbortSignal forwarded;
    final resolver = companionDeliveryResolver(
      _Resolver((token, signal, deliveryRef) async {
        expect(token, 'synthetic-token');
        expect(deliveryRef, '33333333-3333-4333-8333-333333333333');
        forwarded = signal;
        return const Success(_target);
      }),
    );
    final result = await resolver(
      token: 'synthetic-token',
      deliveryRef: '33333333-3333-4333-8333-333333333333',
      abort: abort,
    );
    expect(result, isA<Success<ProactiveMessageTarget>>());
    final target = (result as Success<ProactiveMessageTarget>).value;
    expect(target.conversationId, _target.locator.conversationId);
    expect(target.messageId, _target.locator.messageId);
    expect(forwarded.isAborted, isTrue);
    abort.abort();
  });

  test('retired notification bridge cannot expose a late target or submit an already cancelled read', () async {
    final completion = Completer<Result<AiMessageAnchor>>();
    late AiAbortSignal signal;
    var calls = 0;
    final resolver = companionDeliveryResolver(
      _Resolver((token, abort, deliveryRef) {
        calls++;
        signal = abort;
        return completion.future;
      }),
    );
    final abort = ProactiveAbortSignal();
    final pending = resolver(
      token: 'synthetic-token',
      deliveryRef: 'synthetic-ref',
      abort: abort,
    );
    abort.abort();
    await Future<void>.delayed(Duration.zero);
    expect(signal.isAborted, isTrue);
    completion.complete(const Success(_target));
    expect(await pending, isA<Failure<ProactiveMessageTarget>>());
    expect(
      await resolver(
        token: 'synthetic-token',
        deliveryRef: 'synthetic-ref',
        abort: abort,
      ),
      isA<Failure<ProactiveMessageTarget>>(),
    );
    expect(calls, 1);
  });
}

final class _UntouchedMessaging implements ProactiveMessagingPort {
  var calls = 0;
  @override
  dynamic noSuchMethod(Invocation invocation) {
    calls++;
    throw StateError('Unconfigured SDK must remain untouched');
  }
}

final class _Resolver implements AiOwnedSourcesRepository {
  _Resolver(this.run);
  final Future<Result<AiMessageAnchor>> Function(String, AiAbortSignal, String)
  run;
  @override
  Future<Result<AiMessageAnchor>> resolveDelivery({
    required String token,
    required AiAbortSignal abort,
    required String deliveryRef,
  }) => run(token, abort, deliveryRef);
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected source operation');
}
