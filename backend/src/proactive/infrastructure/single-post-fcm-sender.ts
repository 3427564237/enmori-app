/** S1 adapter. This module never constructs credentials, changes SDK internals,
 * follows redirects or retries an FCM message. Credential traffic is separate.
 * Firebase Admin's public Credential is structurally compatible with this input.
 */
export interface FcmCredential {
  getAccessToken(): Promise<{ readonly access_token: string; readonly expires_in: number }>;
}

export interface SinglePostInput {
  readonly registrationValue: string;
  readonly deliveryRef: string;
  readonly preview: "generic" | "hidden";
  readonly signal: AbortSignal;
}

/** Implemented by the application over the current source/store Ports. claim()
 * MUST re-read authority after credential acquisition and atomically claim the
 * not_started outbox. current() also runs after the asynchronous claim. */
export interface DispatchAuthorization {
  claimAfterCredential(): Promise<boolean>;
  current(): boolean;
}

export type SinglePostResult =
  | { readonly kind: "accepted" }
  | { readonly kind: "rejected" }
  | { readonly kind: "unknown" }
  | { readonly kind: "not_attempted"; readonly reason: "invalid_input" | "credential_unavailable" | "not_authorized" };

export interface SinglePostFcmOptions {
  readonly projectId: string;
  readonly credential: FcmCredential;
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
}

const notAttempted = (reason: Extract<SinglePostResult, { kind: "not_attempted" }>["reason"]): SinglePostResult =>
  ({ kind: "not_attempted", reason });

export class SinglePostFcmSender {
  private readonly fetch: typeof globalThis.fetch;
  private readonly endpoint: string | undefined;
  private readonly timeoutMs: number;

  constructor(private readonly options: SinglePostFcmOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.endpoint = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(options.projectId)
      ? `https://fcm.googleapis.com/v1/projects/${options.projectId}/messages:send` : undefined;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  async sendOnce(input: SinglePostInput, authority: DispatchAuthorization): Promise<SinglePostResult> {
    input = Object.freeze({ registrationValue: input.registrationValue, deliveryRef: input.deliveryRef,
      preview: input.preview, signal: input.signal });
    const permitted = (): boolean => {
      try { return !input.signal.aborted && authority.current(); } catch { return false; }
    };
    if (!this.endpoint || !Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 15000 ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(input.deliveryRef) || !input.registrationValue.trim() ||
      Buffer.byteLength(input.registrationValue, "utf8") > 4096 || /[\u0000-\u001f\u007f]/.test(input.registrationValue) ||
      (input.preview !== "generic" && input.preview !== "hidden")) return notAttempted("invalid_input");
    if (!permitted()) return notAttempted("not_authorized");

    let accessToken: string;
    try {
      const token = await this.options.credential.getAccessToken();
      if (!token.access_token.trim() || /[\u0000-\u0020\u007f]/.test(token.access_token) || token.access_token.length > 8192 ||
        !Number.isFinite(token.expires_in) || token.expires_in <= 0) return notAttempted("credential_unavailable");
      accessToken = token.access_token;
    } catch { return notAttempted("credential_unavailable"); }
    // Never let a delayed OAuth result grant stale business authority.
    if (!permitted()) return notAttempted("not_authorized");
    try {
      if (!await authority.claimAfterCredential()) return notAttempted("not_authorized");
    } catch { return notAttempted("not_authorized"); }
    // A lost/late claim ACK is not permission to dispatch or recycle the claim.
    if (!permitted()) return notAttempted("not_authorized");

    const notification = input.preview === "hidden" ? { title: "ENMORI" } :
      { title: "ENMORI", body: "Open ENMORI to view an update." };
    const data = { deliveryRef: input.deliveryRef };
    if (Buffer.byteLength(JSON.stringify({ notification, data }), "utf8") > 512) return notAttempted("invalid_input");
    const signal = AbortSignal.any([input.signal, AbortSignal.timeout(this.timeoutMs)]);
    // There is exactly one fetch invocation, with no SDK sender/wrapper/fallback.
    // Local transport tests count received POSTs, not only this invocation.
    try {
      const response = await this.fetch(this.endpoint, {
        method: "POST", redirect: "error", signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ message: { token: input.registrationValue, notification, data,
          android: { priority: "NORMAL", ttl: "0s" } } }),
      });
      accessToken = "";
      if (response.status !== 200) {
        await response.body?.cancel().catch(() => undefined);
        return [400, 401, 403, 404, 422].includes(response.status) ? { kind: "rejected" } : { kind: "unknown" };
      }
      const reader = response.body?.getReader();
      if (!reader) return { kind: "unknown" };
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 8192) { await reader.cancel(); return { kind: "unknown" }; }
        chunks.push(chunk.value);
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      return body && typeof body === "object" && !Array.isArray(body) && "name" in body &&
        typeof body.name === "string" && body.name.length <= 2048 && /^projects\/[^/\s]+\/messages\/[^\s]+$/.test(body.name)
        ? { kind: "accepted" } : { kind: "unknown" };
    } catch { return { kind: "unknown" }; }
    finally { accessToken = ""; }
  }
}
