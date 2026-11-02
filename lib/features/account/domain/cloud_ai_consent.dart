enum CloudAiProvider {
  groq('groq_cloud_v1', 'GroqCloud'),
  openai('openai_cloud_v1', 'OpenAI');

  const CloudAiProvider(this.disclosureVersion, this.displayName);
  final String disclosureVersion;
  final String displayName;
}

/// One explicit client composition value binds request mode and disclosure.
/// Local retains the historical Groq disclosure without enabling cloud use.
enum AiClientProcessing {
  local(null),
  groqCloud(CloudAiProvider.groq),
  openaiCloud(CloudAiProvider.openai);

  const AiClientProcessing(this.cloudProvider);
  final CloudAiProvider? cloudProvider;
  String get wireProcessing => cloudProvider == null ? 'local' : 'cloud';
  CloudAiProvider get disclosureProvider =>
      cloudProvider ?? CloudAiProvider.groq;
}

/// The historical values remain Groq-specific; they never grant OpenAI use.
enum CloudAiConsent {
  accepted(CloudAiProvider.groq, true),
  declined(CloudAiProvider.groq, false),
  openaiAccepted(CloudAiProvider.openai, true),
  openaiDeclined(CloudAiProvider.openai, false);

  const CloudAiConsent(this.provider, this.isAccepted);
  final CloudAiProvider provider;
  final bool isAccepted;
  String get wireState => isAccepted ? 'accepted' : 'declined';
  String get disclosureVersion => provider.disclosureVersion;

  static CloudAiConsent forProvider(
    CloudAiProvider provider, {
    required bool accepted,
  }) => switch ((provider, accepted)) {
    (CloudAiProvider.groq, true) => CloudAiConsent.accepted,
    (CloudAiProvider.groq, false) => CloudAiConsent.declined,
    (CloudAiProvider.openai, true) => CloudAiConsent.openaiAccepted,
    (CloudAiProvider.openai, false) => CloudAiConsent.openaiDeclined,
  };
}
