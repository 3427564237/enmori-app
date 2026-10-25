# Own photo avatar — bounded first delivery

Authority: LI explicitly [selected uploading their own photo](../docs/decisions/2026-10-25-li-core-experience-repair.md).
The first delivery displays the saved photo on the owner's Home/Profile only,
with an explicit “Only you can see this photo for now” notice. It does not add
photos to discovery, participants, public profiles, model inputs or scoring.
No third-party storage, upload SDK, background access or new dependency.

Android uses the system photo picker (with a document-picker fallback). Only
an explicitly selected image is read, temporarily and with bounded bytes and
decoded dimensions. The original is not copied into app storage or uploaded.
Create a small square PNG preview, at most 256 pixels per side and 128 KiB;
re-encoding removes source metadata. Cancel leaves the stored avatar unchanged.
Explicit Save alone sends the preview through the existing authenticated Backend.

Use separate `/v1/me/profile/avatar` GET/PUT operations so the old strict
`/v1/me/profile` response and PUT semantics remain byte-shape compatible.
GET returns `{avatar:{pngBase64,sourceSha256,revision}}`: nullable image/hash,
nonnegative safe integer revision. PUT accepts exactly
`{pngBase64:string|null,expectedRevision:integer}`. Null explicitly removes the
avatar. No URL, arbitrary MIME, account ID or external file path is accepted.

The Backend validates canonical base64, PNG byte/pixel/chunk/decompression bounds,
8-bit RGB/RGBA non-interlaced pixels, chunk checksums and complete file shape.
Reject malformed or animated payloads, any bytes after IEND, palette/unknown
critical chunks and RGB transparency via tRNS. The native preview uses RGB or
RGBA directly. Canonical re-encoding with built-in zlib keeps only required PNG
chunks, stripping accepted non-rendering ancillary metadata. Do not silently
drop a chunk that changes pixel transparency or accept a trailing payload.
Store the bounded canonical bytes plus SHA-256 of the validated submitted PNG;
this digest permits readback comparison after an unacknowledged write without
retaining the original metadata. No raw image or digest belongs in logs.

The existing completed-owner binding and one-attempt Firestore transaction write
the three optional account fields `avatarPngBase64`, `avatarSourceSha256` and
`avatarRevision`. Missing fields mean no avatar/revision zero; malformed present
state fails as unavailable. Read original revision and increment with the same
transaction. Other profile/settings/consent fields and revision are untouched.
Explicit removal stores null bytes/hash at the next avatar revision. No collection,
index, historical backfill or migration is introduced. Account deletion removes
these fields with its existing account record deletion.

Use existing invalid-profile/revision/service failure vocabulary. A failed or
unknown PUT preserves the draft; never automatically retry a write. A GET may
show current authority and compare advanced revision/hash with the intended
photo. Unchanged or inconsistent readback is not proof of no effect. Account
replacement, departure and background fences prevent late results displaying
another owner's image; fresh foreground reads reestablish current state.
No model, external notification, public sharing or live test upload is authorized
by this source implementation contract.
