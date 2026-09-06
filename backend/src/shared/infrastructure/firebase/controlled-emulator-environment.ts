export interface ControlledEmulatorEnvironment {
  readonly projectId: string;
  readonly authHost: string;
  readonly firestoreHost: string;
}

type Environment = Readonly<Record<string, string | undefined>>;

const LOOPBACK_ENDPOINT = /^(?:127\.0\.0\.1|localhost):([1-9]\d{0,4})$/;
const CREDENTIAL_ENVIRONMENT_NAME =
  /(?:^|_)(?:ACCESS_KEY|API_KEY|APPLICATION_CREDENTIALS|CLIENT_SECRET|CREDENTIAL|CREDENTIALS|PASSWORD|PRIVATE_KEY|SECRET|SERVICE_ACCOUNT|TOKEN)(?:_|$)/;
const CREDENTIAL_DISCOVERY_ENVIRONMENT_NAMES = new Set([
  "CLOUDSDK_CONFIG",
  "FIREBASE_CONFIG",
]);
const CONTROLLED_PROFILE_ENVIRONMENT_NAMES = [
  "APPDATA",
  "HOME",
  "USERPROFILE",
  "XDG_CONFIG_HOME",
] as const;
const CONTROLLED_EMULATOR_ENVIRONMENT_NAMES = [
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIRESTORE_EMULATOR_HOST",
  "GCLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT",
] as const;
const SAFE_RUNTIME_ENVIRONMENT_NAMES = [
  "COMSPEC",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "WINDIR",
] as const;

function requireNoAmbientCredentialMaterial(environment: Environment): void {
  for (const [name, value] of Object.entries(environment)) {
    if (
      value !== undefined &&
      (CREDENTIAL_DISCOVERY_ENVIRONMENT_NAMES.has(name.toUpperCase()) ||
        CREDENTIAL_ENVIRONMENT_NAME.test(name.toUpperCase()))
    ) {
      throw new Error(
        `Controlled Firebase Emulator execution forbids ambient credential material: ${name}`,
      );
    }
  }
}

function requireControlledCredentialProfile(environment: Environment): void {
  const controlledProfile = environment.ENMORI_CONTROLLED_PROFILE_DIRECTORY;
  if (controlledProfile === undefined || controlledProfile.length === 0) {
    throw new Error(
      "Controlled Firebase Emulator execution requires an isolated credential profile",
    );
  }
  for (const name of CONTROLLED_PROFILE_ENVIRONMENT_NAMES) {
    if (environment[name] !== controlledProfile) {
      throw new Error(
        "Controlled Firebase Emulator execution requires an isolated credential profile",
      );
    }
  }
}

function requireLoopbackEndpoint(
  name: "FIREBASE_AUTH_EMULATOR_HOST" | "FIRESTORE_EMULATOR_HOST",
  value: string | undefined,
): string {
  if (value === undefined) {
    throw new Error(`${name} must identify a loopback Emulator endpoint`);
  }
  const match = LOOPBACK_ENDPOINT.exec(value);
  const port = match === null ? Number.NaN : Number(match[1]);
  if (match === null || port > 65_535) {
    throw new Error(`${name} must identify a loopback Emulator endpoint`);
  }
  return value;
}

export function requireControlledEmulatorEnvironment(
  environment: Environment,
): ControlledEmulatorEnvironment {
  requireNoAmbientCredentialMaterial(environment);
  requireControlledCredentialProfile(environment);

  const authHost = environment.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = environment.FIRESTORE_EMULATOR_HOST;
  const hasEmulatorConfiguration =
    authHost !== undefined || firestoreHost !== undefined;

  if (environment.ENMORI_ENVIRONMENT !== "test") {
    if (hasEmulatorConfiguration) {
      throw new Error(
        "Firebase Emulator configuration is forbidden outside test mode",
      );
    }
    throw new Error("Controlled Firebase Emulator execution requires test mode");
  }

  const gcloudProject = environment.GCLOUD_PROJECT;
  const googleCloudProject = environment.GOOGLE_CLOUD_PROJECT;
  if (
    gcloudProject !== undefined &&
    googleCloudProject !== undefined &&
    gcloudProject !== googleCloudProject
  ) {
    throw new Error("Firebase Emulator project identifiers must match");
  }
  const projectId = gcloudProject ?? googleCloudProject;
  if (projectId === undefined || !projectId.startsWith("demo-")) {
    throw new Error("Controlled Firebase Emulator execution requires a demo project");
  }

  return {
    projectId,
    authHost: requireLoopbackEndpoint(
      "FIREBASE_AUTH_EMULATOR_HOST",
      authHost,
    ),
    firestoreHost: requireLoopbackEndpoint(
      "FIRESTORE_EMULATOR_HOST",
      firestoreHost,
    ),
  };
}

export function buildControlledEmulatorTestEnvironment(
  hostEnvironment: Environment,
  controlledProfileDirectory: string,
): Record<string, string> {
  const childEnvironment: Record<string, string> = {
    APPDATA: controlledProfileDirectory,
    ENMORI_ENVIRONMENT: "test",
    ENMORI_CONTROLLED_PROFILE_DIRECTORY: controlledProfileDirectory,
    HOME: controlledProfileDirectory,
    METADATA_SERVER_DETECTION: "none",
    USERPROFILE: controlledProfileDirectory,
    XDG_CONFIG_HOME: controlledProfileDirectory,
  };

  for (const name of [
    ...CONTROLLED_EMULATOR_ENVIRONMENT_NAMES,
    ...SAFE_RUNTIME_ENVIRONMENT_NAMES,
  ]) {
    const value = hostEnvironment[name];
    if (value !== undefined) childEnvironment[name] = value;
  }

  requireControlledEmulatorEnvironment(childEnvironment);
  return childEnvironment;
}
