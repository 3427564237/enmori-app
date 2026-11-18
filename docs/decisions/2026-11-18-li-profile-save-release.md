# Profile save compatibility and Android delivery

On 18 November 2026 LI requested a final deliverable, including fixes for known defects and visibly broken layouts. LI approved deploying the profile fix to the existing Azure service after validation, including its restart and rollback if necessary. LI confirmed the app is still on test devices and has not been delivered to users.

Under the [profile settings approval](2026-10-05-li-profile-settings-approval.md) and [legacy region decision](2026-11-15-li-registration-profile-guide.md), the newer profile screen presents a saved region as read-only. The [area contract](../../api/event-profile-discovery-v3.md) keeps raw coordinates out of new requests. The existing profile update replaced the entire details object, so a client hiding an older coordinate-shaped region could accidentally clear it while saving other fields.

LI approved the compatible extension proposed in this task. In `PUT /v1/me/profile`, an omitted `details.region` preserves the stored value within the existing revision-checked transaction. An explicit `null` clears the value. Omitting all details continues to preserve them. The other details fields retain their existing validation and the server still returns the complete profile. No migration is needed.

Use the current v89 service and paid grant as the deployment baseline. Preserve account data and financial history. Verify the signed release APK on the Android emulator. The request about reinstalling test devices did not select a data wipe.
