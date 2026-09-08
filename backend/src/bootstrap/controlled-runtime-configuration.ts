export interface ControlledRuntimeConfiguration {
  readonly firebaseProjectId: string;
  readonly host: "127.0.0.1" | "::1";
  readonly port: number;
}

type Environment = Readonly<Record<string, string | undefined>>;

const PROJECT_ID = /^[a-z][a-z0-9-]{4,29}$/;
const EMULATOR_ENVIRONMENT_NAMES = [
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIRESTORE_EMULATOR_HOST",
] as const;

export function requireControlledRuntimeConfiguration(
  environment: Environment,
): ControlledRuntimeConfiguration {
  if (environment.ENMORI_ENVIRONMENT !== "controlled-demo") {
    throw new Error("ENMORI Backend runtime requires controlled-demo mode");
  }
  for (const name of EMULATOR_ENVIRONMENT_NAMES) {
    if (environment[name] !== undefined) {
      throw new Error("Firebase Emulator configuration is forbidden at runtime");
    }
  }

  const firebaseProjectId = environment.ENMORI_FIREBASE_PROJECT_ID;
  if (
    firebaseProjectId === undefined ||
    !PROJECT_ID.test(firebaseProjectId) ||
    firebaseProjectId.startsWith("demo-")
  ) {
    throw new Error("A controlled non-Emulator Firebase project is required");
  }

  const host = environment.ENMORI_BACKEND_HOST;
  if (host !== "127.0.0.1" && host !== "::1") {
    throw new Error("The raw Backend listener must use an explicit loopback host");
  }

  const portText = environment.ENMORI_BACKEND_PORT;
  if (portText === undefined || !/^[1-9]\d{0,4}$/.test(portText)) {
    throw new Error("The Backend listener requires an explicit valid port");
  }
  const port = Number(portText);
  if (port > 65_535) {
    throw new Error("The Backend listener requires an explicit valid port");
  }

  return { firebaseProjectId, host, port };
}
