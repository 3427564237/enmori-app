/** S-PM-1013-LI-REMAINING-AI-A: only the selected checkin_conversation purpose. */
export function nextPurposeRevocationGeneration(
  generation: unknown,
  previousConsent: unknown,
  nextConsent: unknown,
): number | undefined {
  if (typeof generation !== "number" || !Number.isSafeInteger(generation) || generation < 0 ||
      (previousConsent !== "accepted" && previousConsent !== "rejected") ||
      (nextConsent !== "accepted" && nextConsent !== "rejected")) return undefined;
  if (previousConsent !== "accepted" || nextConsent !== "rejected") return generation;
  return generation === Number.MAX_SAFE_INTEGER ? undefined : generation + 1;
}
