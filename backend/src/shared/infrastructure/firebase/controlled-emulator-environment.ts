export interface ControlledEmulatorEnvironment {
  readonly projectId: string;
  readonly authHost: string;
  readonly firestoreHost: string;
}

type Environment = Readonly<Record<string, string | undefined>>;

const LOOPBACK_ENDPOINT = /^(?:127\.0\.0\.1|localhost):([1-9]\d{0,4})$/;

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
