# S2-01 Interest API and Firestore mapping

- **Authority:** S-PM-0913-SPRINT2 at commit `3a110132b01f2dee3605351ce123aa90a3376ccb`
- **Issue:** #27 / S2-01
- **Purpose:** Fix the smallest shared Interest wire and persistence mapping needed by LI, SHI and DU.
- **Scope:** Ordinary member catalogue read and own-selection read/write only. This does not add Admin catalogue mutation, Event APIs, fixtures or initialization.

## Public API mapping

`GET /v1/interest-tags` returns:

```json
{
  "interestTags": [
    { "interestTagId": "interest_community", "displayName": "Community" }
  ]
}
```

Only Active tags are returned. The array is ordered by `interestTagId` ascending so clients do not depend on Firestore query order.

`GET /v1/me/interests` and a successful `PUT /v1/me/interests` return:

```json
{
  "interests": {
    "interestTags": [
      {
        "interestTagId": "interest_community",
        "displayName": "Community",
        "lifecycleState": "active"
      }
    ],
    "revision": 1
  }
}
```

The own-selection array preserves saved order. It includes safe current labels and `active` or `inactive` lifecycle state so an existing Inactive reference can be shown and removed. A member with no `account_interests` document receives an empty array and revision `0`.

`PUT /v1/me/interests` accepts exactly:

```json
{
  "interestTagIds": ["interest_community"],
  "expectedRevision": 0
}
```

The Backend derives ownership from the verified Firebase identity and existing Auth Binding. The request has no owner field and no `Idempotency-Key`. Every successful save advances the authoritative non-negative integer revision exactly once. `INTEREST_SELECTION_INVALID` / 422 covers more than 10 IDs, duplicates, missing tags and newly assigning an Inactive tag. `INTEREST_REVISION_PRECONDITION_FAILED` / 412 requires a fresh read before another save. Existing Auth, onboarding and dependency failure codes and the existing error envelope remain unchanged.

## Firestore mapping

| Path | Fields | Notes |
| --- | --- | --- |
| `interest_tags/{interestTagId}` | `displayName: string`, `lifecycleState: "active" \| "inactive"`, `revision: integer >= 1` | Controlled catalogue record. The document ID is the opaque `InterestTagId`. S2-01 only reads it. |
| `account_interests/{accountId}` | `interestTagIds: string[]`, `revision: integer >= 1` | One own-selection document per existing product Account. No Firebase UID or duplicate owner field is stored. |

The existing `auth_bindings/{uid_<unpadded-base64url-utf8-uid>}` record supplies `accountId`; the corresponding `accounts/{accountId}` record must remain valid. Selection replacement reads the binding, Account, current selection and every requested Tag in one Firestore transaction. It compares `expectedRevision` before assignment checks, permits an Inactive requested ID only when that same ID is already in the current selection, and writes only after all reads and checks succeed.

No Account or Check-in DTO/record changes, index, migration, general query framework, Interest idempotency record or client Firestore access is introduced.
