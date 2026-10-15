import type { Firestore } from "firebase-admin/firestore";
import { requireControlledEmulatorEnvironment } from "../../shared/infrastructure/firebase/controlled-emulator-environment.js";

/** Fail closed on the locked SDK's actual binding, not an environment assertion.
 * These Infrastructure-only settings are checked against 8.7.1's applySettings
 * mapping; a changed/unknown SDK representation must receive separate evidence.
 */
export function requireIsolatedContextFirestore(firestore: Firestore,
  environment: Readonly<Record<string, string | undefined>>): void {
  const expected = requireControlledEmulatorEnvironment(environment);
  const bound = firestore as unknown as {
    readonly projectId?: unknown;
    readonly _settings?: { readonly servicePath?: unknown; readonly port?: unknown; readonly ssl?: unknown };
  };
  const settings = bound._settings;
  const target = new URL(`http://${expected.firestoreHost}`);
  if (bound.projectId !== expected.projectId || settings?.servicePath !== target.hostname ||
      settings.port !== Number(target.port) || settings.ssl !== false) {
    throw new Error("Isolated context Firestore binding unavailable");
  }
}
