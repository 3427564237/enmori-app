# PM: Motion and micro-interaction pass

- Source: LI HOURUI's explicit 21 Oct 2026 instruction in the existing UI/UX chat.
- Extends S-PM-1021-LI-PRODUCT-UI-DEFAULTS and PR #169 on its existing branch.
- Authorizes a restrained, coherent native Flutter motion pass across navigation, Home, Check-in, AI, Events/map, Profile and shared feedback. Preserve green/Playfair, platform gestures, focus, rapid input, state ownership and reduced motion. No unrelated business/API/dependency changes.
- Use the installed `flutter-motion-engineering` Skill. Prefer 120–220 ms feedback/content and 220–350 ms navigation; no required spring, Hero or effect where continuity cannot be preserved.
- Verification is deliberately limited to static analysis and minimal directly affected checks. No full/regression/integration suite, recordings, screenshot package, emulator cycles or APK builds. Device frame timing remains unmeasured.
- Deliver an independent commit on #169; keep Draft. Main chat owns APK, physical-device and real-service validation. No main merge or deployment.
