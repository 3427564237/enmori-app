import 'package:flutter/material.dart';

import 'harness/ai_conversation/ai_conversation_harness_app.dart';

/// Explicit opt-in entry point. The ordinary app never imports this harness.
void main() {
  runApp(const AiConversationHarnessApp());
}
