import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:enmori/core/result/result.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_repository.dart';
import 'package:enmori/features/ai_conversation/data/ai_wire_transport.dart';
import 'package:enmori/features/ai_conversation/domain/ai_conversation.dart';

void main() {
  test(
    'cloud provenance decodes only as a complete fixed-provider tuple',
    () async {
      final base = <String, Object?>{
        'messageId': '22222222-2222-4222-8222-222222222222',
        'sequence': 2,
        'role': 'assistant',
        'persistedAt': '2026-10-28T00:00:00.000Z',
        'availability': 'available',
        'text': 'Synthetic cloud reply.',
      };
      Future<Result<AiMessagePage>> read(Map<String, Object?> row) =>
          AiWireRepository(_Transport(row)).readMessages(
            token: 'synthetic',
            abort: AiAbortSignal(),
            conversationId: '11111111-1111-4111-8111-111111111111',
          );
      final cloud = {
        ...base,
        'processing': 'cloud',
        'provider': 'groq',
        'disclosureVersion': 'groq_cloud_v1',
      };
      expect(
        (await read(
          base,
        ) as Success<AiMessagePage>).value.messages.single.cloudProcessed,
        isFalse,
      );
      expect(
        (await read(
          cloud,
        ) as Success<AiMessagePage>).value.messages.single.cloudProcessed,
        isTrue,
      );
      for (final broken in [
        {...cloud}..remove('provider'),
        {...cloud, 'provider': 'other'},
        {...cloud, 'role': 'user'},
        {...cloud, 'disclosureVersion': 'other'},
      ]) {
        expect(await read(broken), isA<Failure<AiMessagePage>>());
      }
    },
  );
}

final class _Transport implements AiWireTransport {
  _Transport(this.row);
  final Map<String, Object?> row;
  @override
  Future<AiWireResponse> send(AiWireRequest request) async => AiWireResponse(
    statusCode: 200,
    body: jsonEncode({
      'messages': [row],
    }),
  );
}
