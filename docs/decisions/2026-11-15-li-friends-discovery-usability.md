# LI: Friends, starred filtering and Event discovery — 15 November 2026

## Confirmed instruction

LI approved the reviewed proposal: “可以，就按你说的直接优化吧，先把好友页布局、星标和完整筛选、推荐与浏览入口做好，再验证推荐排序是否真的有效。” LI also reported that changing selected interests to Gaming alone still produces Music recommendations.

This approves implementation of the three named usability changes and investigation/verification of recommendation behavior. It does not assert that an interest save failed or that live ranking has been verified.

## Bounded behavior

- Friends uses three sibling tabs: My friends / Activity / Discover. The Discover content retains the full People you may know heading. Requests remain in the app bar. Existing navigation, account isolation and privacy remain applicable.
- A visible Starred action reuses the existing requester-private Special Care flag. It does not add another relationship, notification subscription or new ranking weight. The existing profile entry uses consistent wording.
- Starred filtering and submitted name searches cover all pages of the existing authorized friend list/search. A partial or failed traversal never claims that no matches exist. Traversal stops on user cancellation, account/access change, backgrounding or disposal. No new database, index, endpoint or persistent client cache is needed.
- Each list star action reads the current existing profile/revision before calling the existing revision-protected care mutation. No optimistic persisted-success claim or automatic mutation retry. Re-read after settlement; reject late replies from obsolete account/access contexts.
- Events exposes For you / Browse as explicit sibling destinations, reusing the existing recommendation and browse implementations. Preserve the complete backend recommendation order, participation/detail routes, source failures and existing search/filter behavior.

## Investigation and authority

The current v3 formula admits zero-interest candidates with a location, visible-friend or target-age reason. A synthetic Gaming-only example reproduces a Music recommendation on same-area points alone. This is source-level evidence, not a live-account diagnosis.

The choice between strict interest eligibility, interest-first separate discovery and existing mixed ranking is pending LI's answer. Until resolved, do not silently alter recommendation weights/eligibility or add behavioral tracking.

This decision refines the affected presentation and page-local filtering behavior under the retained 14 October social-navigation, 21 October UI, 25 October recommendation-completion, 28 October acceptance-followup and 29 October usability decisions. It supersedes the former page-local filtered-result presentation only within the scope above. The old records remain available. No Sponsor decision is claimed, and existing privacy, consent, source authority, revision checks and controlled-runtime safeguards remain unchanged.

## Verification scope

Exercise multi-page and sparse filtered results, cancellation, failed continuation, stale account replies and revision-protected star actions; check tab/route navigation and narrow-screen layout. Verify Gaming-only changes through fresh selection reads, classification and ranking, including candidates with no matching interests. Build a reviewable Android candidate when the existing build prerequisites are available. Source tests, APK creation, deployment and physical-phone verification are separate evidence levels.
