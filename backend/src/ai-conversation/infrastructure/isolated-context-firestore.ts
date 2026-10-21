import { requireRemoteGroupEnvironment } from '../../shared/infrastructure/firebase/feature-environment.js';
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

/** Real callers must select the approved project and the default Google endpoint. */
export function requireFeatureContextFirestore(firestore: Firestore,
  environment: Readonly<Record<string, string | undefined>>): void {
  if (environment.ENMORI_REMOTE_GROUP !== 'true') return requireIsolatedContextFirestore(firestore, environment);
  requireRemoteGroupEnvironment(environment);
  const bound = firestore as unknown as { projectId?: unknown; _settings?: {
    host?: unknown; servicePath?: unknown; port?: unknown; ssl?: unknown } };
  const settings = bound._settings;
  if (bound.projectId !== 'enmori-rmvp-controlled' || !settings ||
      settings.ssl === false ||
      (settings.host !== undefined && settings.host !== 'firestore.googleapis.com') ||
      (settings.servicePath !== undefined && settings.servicePath !== 'firestore.googleapis.com') ||
      (settings.port !== undefined && settings.port !== 443)) {
    throw new Error('Remote Firestore binding unavailable');
  }
}
