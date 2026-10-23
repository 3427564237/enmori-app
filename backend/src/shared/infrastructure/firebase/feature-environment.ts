import { requireControlledEmulatorEnvironment } from './controlled-emulator-environment.js';
export type FeatureEnvironment = Readonly<Record<string, string | undefined>>;
/** Separate opt-in. Existing Emulator validation is deliberately unchanged. */
export function requireRemoteGroupEnvironment(environment: FeatureEnvironment): void {
  if (environment.ENMORI_REMOTE_GROUP !== 'true' ||
      environment.ENMORI_ENVIRONMENT !== 'controlled-demo' ||
      environment.ENMORI_FIREBASE_PROJECT_ID !== 'enmori-rmvp-controlled') {
    throw new Error('Remote group configuration unavailable');
  }
  for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
    if (environment[name] !== undefined || process.env[name] !== undefined) {
      throw new Error('Remote group cannot use Firebase Emulators');
    }
  }
}
export function requireFeatureEnvironment(environment: FeatureEnvironment): void {
  if (environment.ENMORI_REMOTE_GROUP === 'true') requireRemoteGroupEnvironment(environment);
  else requireControlledEmulatorEnvironment(environment);
}
