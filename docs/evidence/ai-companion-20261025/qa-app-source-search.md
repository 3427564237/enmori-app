# QA — source-body search bypass repair

25 October 2026. Independent focused review of App repair
`bd10a8e1598e71f040e38fd3330f7e5baaf64859`, parent
`629a22d7b00580e2a39360efd1270a7bd7ac7e94`. This closes the reported search
display bypass within source/widget evidence; it does not accept the complete
origin/source UI, F1 selection flow or final integrated candidate.

## Original P1 and source repair

At `629a22d`, Product reported that a failed source resolver hid the old body in
chat through `AiOwnedSourcesState`, while search still derived matches, selected
messages and adjacent context directly from available canonical message text.
Searching the body or opening its neighboring user message could display it
again. This was a source counterexample; QA did not execute the older head to
claim an independent red run. The original finding and head are retained here.

The five-file repair adds the shared pure `canDisplayAiMessage` check and uses it
in chat and every search body path: matches/excerpts, selected content, adjacent
context, previous/next controls and captured selection callbacks. Search watches
the current source state, so an already open result reacts to later invalidation.
Callbacks reread current state before selecting instead of relying on the state
that produced an older enabled button.

Source review confirms that unavailable/null bodies remain unavailable, and
referenced/proactive rows are hidden when source state belongs to another
session/topic or needs a fresh read. Unaffected ordinary messages remain
searchable. The repair does not rewrite canonical text or availability into a
permanent tombstone. Existing read-revision handling restores only message IDs
actually present in the accepted transcript page; reading an unrelated page
does not clear the cached message's hidden-ID entry. This last boundary was
inspected in source, not rerun as an additional test in this window.

## Independent execution

Integration assigned QA a short exclusive Flutter window. QA used a private
`git archive` of the exact repair and independently ran only its three new
regressions from the unchanged author test file. **3/3 passed**:

| Counterexample | Observed result |
| --- | --- |
| Denied body searched directly | No result or body is displayed; a source-check notice appears and an unrelated current user message remains searchable. |
| Source denial while neighboring context is already open | The body disappears, Next becomes disabled, and invoking its previously captured callback cannot select or redisplay it. The user context remains available. |
| Selected source message across background/resume | The body disappears in the background, remains hidden on resume, and returns only after an accepted transcript read containing that message. |

All three fixtures also assert zero prepare/execute calls. They use fake owned
repositories and local widget interactions. QA did not repeat the author's
27-case batch or the earlier 104 cases, and those counts are not added together.
There was no production edit, package resolution, service/Emulator connection,
model request, native notification operation, Gradle/APK run or device action.

Private evidence:
`/home/miku/.local/state/enmori-ai-companion-20261025/qa-review/app-bd10a8e/`.
`command.json`, `result.json`, `source-manifest.json` and `source-readback.json`
bind the source head, exact three-test selection and all 393 unchanged archived
files. The existing pinned package configuration/graph and unchanged lockfile
were reused with `fvm flutter test --no-pub` under the shared nonblocking lock.
The command exited 0; `flutter.log` SHA-256 is
`254f52c289188ea1abd0bbe772c8990dd2985720f851c39d63de72471a1dfa88`.

QA returned the Flutter window and sent the exact scoped closure to Integration,
App and Product. P1 is closed at `bd10a8e` for these source/widget paths. Final
composition, F1 behavior, broad responsive/visual review, real services and
physical-device acceptance remain separate evidence layers.
