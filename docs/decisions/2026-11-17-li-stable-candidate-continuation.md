# LI: continue repairing the stable candidate after v85 deployment

Date: 17 November 2026, Asia/Singapore. Authority: LI / PM, current task.

After the [v85 deployment and v84 emulator results](../evidence/2026-11-17-v85-deployment/README.md),
LI instructed: “继续修复一个稳定版”. Continue the existing stability audit and
repair work toward a reviewable stable candidate; this is not release acceptance.

The [earlier client-repair authorization](2026-11-17-li-stable-candidate-followup.md)
continues: reproduce a defect, make the smallest client repair within the approved
behavior, regress it, and verify the resulting single APK with its actual backend.
Investigate remaining activity-detail and startup failures without interpreting
one successful retry as causal closure. The recorded layout/read-state findings
remain within the original audit scope.

The [exact v85 deployment approval](2026-11-17-li-v85-deployment.md) has been executed.
This continuation does not turn it into approval for an unspecified new backend
package, diagnostic sink, business rule, schema, dependency or infrastructure.
Prepare any necessary backend change as a concrete reviewable proposal before
implementation/deployment under the existing decision boundary.

AI renewal remains deferred. Use the permitted emulator, never the user's
physical phone. Preserve accounts/data, remove temporary test settings and keep
private captures and sensitive logs outside Git. Retain unresolved and unverified
items, original evidence and supersession links. Do not label the result stable
until the recorded acceptance conditions are actually satisfied.

## SC-05 content confirmation

Asked for an approved terms URL or existing approved version for the registration
agreement, LI answered “并没有”. No approved terms content is available from this
confirmation. Keep SC-05 open as a content decision; this answer neither supplies
legal/product commitments nor authorizes removing or bypassing the agreement.
