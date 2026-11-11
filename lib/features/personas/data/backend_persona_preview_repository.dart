import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/network/backend_api_client.dart';
import '../../../core/result/result.dart';
import '../../account/domain/cloud_ai_consent.dart';
import '../domain/persona.dart';
import '../domain/persona_preview_repository.dart';

/// The composition owns the HTTP client. This stateless adapter has no storage
/// and never uses any conversation, Persona CRUD or activation endpoint.
final class BackendPersonaPreviewRepository
    implements PersonaPreviewRepository {
  BackendPersonaPreviewRepository({
    required Uri baseUri,
    required this.tokenProvider,
    required this.client,
    this.processing = AiClientProcessing.local,
    Duration timeout = const Duration(seconds: 60),
  }) : _baseUri = baseUri,
       _timeout = timeout {
    if (!isApprovedBackendBaseUri(baseUri) ||
        baseUri.hasQuery ||
        baseUri.hasFragment ||
        !const {'', '/'}.contains(baseUri.path) ||
        timeout <= Duration.zero) {
      throw ArgumentError(
        'The Persona preview Backend address is not permitted.',
      );
    }
  }

  final Uri _baseUri;
  final AuthTokenProvider tokenProvider;
  final http.Client client;
  final AiClientProcessing processing;
  final Duration _timeout;

  @override
  Future<Result<String>> preview({
    required PersonaFields draft,
    required String text,
    required bool Function() isEligible,
  }) async {
    if (processing == AiClientProcessing.groqCloud) {
      return const Failure(_unavailable);
    }
    if (PersonaFields.nameValidationMessage(draft.displayName) != null ||
        !draft.expressionFields.values.every(isPersonaExpressionText) ||
        !isPersonaExpressionText(text) ||
        text.trim().isEmpty ||
        text.runes.length > 2400) {
      return const Failure(
        AppFailure(
          kind: AppFailureKind.aiInputInvalid,
          message:
              'Use a valid Persona name and a message of 1–2400 characters.',
        ),
      );
    }
    final elapsed = Stopwatch()..start();
    bool eligible() => elapsed.elapsed < _timeout && isEligible();
    try {
      return await _request(draft.normalized, text, eligible).timeout(_timeout);
    } on Object {
      return const Failure(_unavailable);
    } finally {
      elapsed.stop();
    }
  }

  Future<Result<String>> _request(
    PersonaFields draft,
    String text,
    bool Function() isEligible,
  ) async {
    if (!isEligible()) return const Failure(_authorityChanged);
    final token = await tokenProvider();
    if (!isEligible()) return const Failure(_authorityChanged);
    if (token case Failure<String>(:final failure)) return Failure(failure);
    final request =
        http.Request('POST', _baseUri.resolve('/v1/me/persona-preview'))
          ..followRedirects = false
          ..headers.addAll({
            'Authorization': 'Bearer ${(token as Success<String>).value}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          })
          ..body = jsonEncode({
            'draft': {
              'displayName': draft.displayName,
              'tone': draft.tone.name,
              'responseLength': draft.responseLength.name,
              'formatStyle': draft.formatStyle.name,
              ...draft.expressionFields,
            },
            'text': text,
            if (processing == AiClientProcessing.openaiCloud) ...{
              'processing': 'cloud',
              'provider': 'openai',
              'disclosureVersion': CloudAiProvider.openai.disclosureVersion,
            },
          });
    if (!isEligible()) return const Failure(_authorityChanged);
    final response = await http.Response.fromStream(await client.send(request));
    if (!isEligible()) return const Failure(_authorityChanged);
    final body = jsonDecode(response.body);
    if (body is! Map<String, dynamic>) return const Failure(_invalidResponse);
    if (response.statusCode == 200) {
      final message = body['message'];
      if (body.length != 1 ||
          message is! String ||
          message.trim().isEmpty ||
          message.runes.length > 2400 ||
          !isPersonaExpressionText(message)) {
        return const Failure(_invalidResponse);
      }
      return Success(message);
    }
    final error = body['error'];
    final requestId = body['requestId'];
    if (body.length != 2 ||
        error is! Map<String, dynamic> ||
        error.length != 2 ||
        error['code'] is! String ||
        error['message'] is! String ||
        (error['message'] as String).trim().isEmpty ||
        requestId is! String ||
        requestId.trim().isEmpty) {
      return const Failure(_invalidResponse);
    }
    final mapping = _errors[error['code']];
    if (mapping == null || response.statusCode != mapping.$1) {
      return const Failure(_invalidResponse);
    }
    // Model/provider copy is never promoted to UI or logs as error text.
    return Failure(
      AppFailure(
        kind: mapping.$2,
        message: 'Persona preview is unavailable. Try again.',
        requestId: requestId,
      ),
    );
  }
}

const _errors = <String, (int, AppFailureKind)>{
  'AUTH_REQUIRED': (401, AppFailureKind.authRequired),
  'AUTH_FORBIDDEN': (403, AppFailureKind.authForbidden),
  'ONBOARDING_REQUIRED': (409, AppFailureKind.onboardingRequired),
  'REQUEST_INVALID': (400, AppFailureKind.requestInvalid),
  'REQUEST_TOO_LARGE': (413, AppFailureKind.requestTooLarge),
  'AI_INPUT_INVALID': (422, AppFailureKind.aiInputInvalid),
  'AI_BUSY': (429, AppFailureKind.aiBusy),
  'AI_CONTEXT_NOT_PERMITTED': (403, AppFailureKind.aiContextNotPermitted),
  'AI_AUTHORITY_CHANGED': (409, AppFailureKind.aiAuthorityChanged),
  'AI_UNAVAILABLE': (503, AppFailureKind.aiUnavailable),
  'AI_REPLY_REJECTED': (502, AppFailureKind.aiReplyRejected),
};

const _authorityChanged = AppFailure(
  kind: AppFailureKind.aiAuthorityChanged,
  message: 'Your account or data consent changed. Reopen the preview.',
);
const _unavailable = AppFailure(
  kind: AppFailureKind.aiUnavailable,
  message: 'Persona preview is unavailable. Try again.',
);
const _invalidResponse = AppFailure(
  kind: AppFailureKind.unexpected,
  message: 'The service returned an invalid response.',
);
