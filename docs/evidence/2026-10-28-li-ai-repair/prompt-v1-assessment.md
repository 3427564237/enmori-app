# Local prompt candidate: rejected

The fixed 24 cases were run once, serially, with Qwen 3.5 9B, 8192 context, 512 output and thinking off. All responses settled; 24/24 were protocol eligible. Owner assessment against the unchanged rubric: **15 pass, 9 fail**. Four of the original ten failures improved; six remain, and cases 8, 16 and 20 regressed. This is not independent QA or production acceptance.

The candidate source is retained in commit `012ae1ed` and `prompt-v1.patch`; the production prompt is restored to its previous source. The running v40 service used its unchanged source and was restarted after the isolated run. No failed or unknown operation was replayed.

The remaining failures include goal/label confusion, withholding a usable checklist, incorrect time sums, invented materials, missing code explanation, wrong reply language and lost historical timing. A stronger cloud model will be evaluated separately; no prompt sweep or weakened fixture is justified by these results.
