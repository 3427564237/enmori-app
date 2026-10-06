# PM approval — first own Profile slice

- **Source ID:** S-PM-0930-OWN-PROFILE-01
- **Status:** Approved for bounded implementation
- **Decision date/owner:** 2026-09-30, LI HOURUI
- **Scope:** LI's own Profile UI and navigation increment under [#45](https://github.com/3427564237/enmori-app/issues/45)

LI selected the earlier request “查看最小切片提案。确认按这个范围继续实现吗”, annotated “实现”, and explicitly replied “确认”. This approves the exact [first-slice preview](../planning/2026-09-30-li-own-profile-first-slice-preview.md): authenticated owner Username and saved Interests, existing Interest editor, safe reads/retry, and Home return/refresh.

Retain the preview's original proposal and referenced RMVP-01A, S2 Interest, Q16, Q18 and Q04-D sources. This decision changes only the preview's Pending implementation authorization. The current Account and Interest contracts remain unchanged. No new endpoint, field, storage, dependency, other-user disclosure or Profile/Settings mutation is approved.

Implementation uses an independent Home recommendation read after returning from Profile, including cancellation; cancellation itself creates no saved change. Returning from the editor rereads the canonical own-interest projection, so a successful save is reflected whether the user then chooses Done or Back; an unsaved cancellation sends no mutation or success notice. Both AppBar and system Back use the same route stack, and old-account/disposed callbacks are discarded.

Other Profile screenshot functions remain later work, not cancelled features. This is not full Profile, Sprint completion, review, merge or release approval. DU retains the assigned independent review of the combined implementation/evidence packet under the [practical delivery guidance](2026-09-30-sprint3-practical-delivery.md).
