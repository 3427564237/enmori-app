# LI real runtime deployment and content direction

- Source ID: S-PM-1014-LI-REAL-RUNTIME-CONTENT.
- Authority: human LI HOURUI / PM and current controlled-host owner.
- Confirmed human answer: "暂无，请帮我部署，我们后面尽量都要接入真实内容而不是假模型假内容包括event，friend等，如果需要凭证/部署/认证/环境请给我说并帮我完成".
- Scope: deploy the approved Qwen3.5-9B runtime on the current controlled Linux
  host, prepare its environment and matching tokenizer, and progress toward
  real authorized AI/Event/Friend content using approved Backend contracts.

The human reports no other already-provisioned model host and explicitly
authorizes this installation/deployment work. This prospectively supersedes
the **no model install/download and already-provisioned-only** restriction of
[S-PM-1014-LI-QWEN-EVENT-SELECTION](https://github.com/3427564237/enmori-app/blob/948579ec82b2c5363ab2b3b2ea353ca652020f07/docs/decisions/2026-10-14-li-controlled-qwen-and-synthetic-event-selection.md)
for this host. Preserve that earlier selection and the actual negative preflight
in [the progress disposition](2026-10-14-li-pr106-and-ai-join-disposition.md).
It does not rewrite a prior fake/model-not-run result as a real-model result.

LI handles host installation and configuration; JIN retains the sole-writer
Qwen Infrastructure adapter/HTTP/Bootstrap/storage/cleanup assignment, ZHOU the
inner Application/read/mobile assignment. No parallel replacement adapter is
created. Use the formal9B model, pin observed binary and resolved model identity,
keep model/tokenizer/runtime files outside Git, and test non-sensitive synthetic
input before joining application data. 4B is not automatically substituted.

Operator implementation choice under this deployment request: prefer an official
version-pinned user-local Ollama distribution and systemd user service so this
work can proceed without seeking a sudo password or changing system GPU drivers.
Use the current working NVIDIA driver, bind only127.0.0.1:11434, disable cloud
features, use one loaded model/one parallel generation, and configure8192 context.
Keep the approved Backend's original60/5/45 deadline, one-active/two-queued and
full-input4096/output512 checks. Installation/model loading alone is not those
checks or semantic validation. A matching tokenizer must be tied to the actual
loaded model before passing the real application input gate.

Real content is the next delivery direction. The previous synthetic-only target
is no longer a reason to defer authorized real integration preparation. Existing
offline fixtures remain visibly labelled until genuinely replaced. Provider
access/permission, Auth, current consent/visibility, accepted projection/API and
retention obligations still apply. No scraped Event data, fabricated participant
or Friend data, unauthorized Note exposure, model-authored Event facts, or new
schema/endpoint follows merely from this direction. Continue existing approved
producer/consumer work and localize exact missing contracts/permissions.

Identify the required account/credential/environment and assist the human with
local setup and authentication. Keep passwords, API secrets and service-account
material out of chat, Git and public Issues; human authentication remains human-
controlled. This request does not authorize public network exposure, paid/cloud
provisioning, account signup/terms acceptance, or bypassing third-party licences.

Keep source PRs Draft/Open, main/Issues/Project states unchanged. Real-service
execution, device, all42/38-state, Sprint/UAT/Release acceptance require their
actual evidence. The prior target is retained without a feasibility promise.

## Confirmed environment follow-up

Human LI subsequently selected **"没有，请带我开通并配置"** for the existing
Ticketmaster Discovery route, and **"复用已有受控项目"** for Firebase.
Assist the human with official developer registration and a mode0600 local key
file; the human completes mailbox verification and provider terms acceptance.
The first provider operation remains the existing bounded Singapore search
(size3, no pagination) and at most one corresponding Detail field-presence probe
after the human has saved a key and confirmed the applicable terms. No real
import/mapping/storage/removal policy is silently selected before actual evidence.

Reuse the exact previously approved controlled Firebase target from the existing
private configuration; read-only credential/runtime preflight is now authorized.
Do not select the CLI's possibly different default project, create a new project,
reset fixtures, register people or copy their credentials. Real Friend test flows
use voluntary authenticated test users and the existing privacy/API contracts.
