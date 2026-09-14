import { pathToFileURL } from "node:url";

import {
  deleteApp,
  initializeApp,
  type App as FirebaseApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { FastifyInstance } from "fastify";

import { CreateCheckIn } from "../check-ins/application/create-check-in.js";
import { GetCheckIn } from "../check-ins/application/get-check-in.js";
import { GetInterestTags } from "../interests/application/get-interest-tags.js";
import { GetOwnInterests } from "../interests/application/get-own-interests.js";
import { ReplaceOwnInterests } from "../interests/application/replace-own-interests.js";
import { FirestoreInterestRepository } from "../interests/infrastructure/firestore-interest-repository.js";
import { FirestoreCheckInRepository } from "../check-ins/infrastructure/firestore-check-in-repository.js";
import { CompleteOnboarding } from "../onboarding/application/complete-onboarding.js";
import { GetOnboarding } from "../onboarding/application/get-onboarding.js";
import { FirestoreOnboardingRepository } from "../onboarding/infrastructure/firestore-onboarding-repository.js";
import { CryptoOpaqueIdGenerator } from "../shared/infrastructure/crypto-opaque-id-generator.js";
import { FirebaseIdentityVerifier } from "../shared/infrastructure/firebase/firebase-identity-verifier.js";
import { FirebaseAdminFirestoreGateway } from "../shared/infrastructure/firebase/firestore-gateway.js";
import { SystemClock } from "../shared/infrastructure/system-clock.js";
import { buildApp } from "./build-app.js";
import {
  requireControlledRuntimeConfiguration,
  type ControlledRuntimeConfiguration,
} from "./controlled-runtime-configuration.js";

interface ControlledRuntime {
  readonly app: FastifyInstance;
  readonly firebaseApp: FirebaseApp;
}

async function createControlledRuntime(
  configuration: ControlledRuntimeConfiguration,
): Promise<ControlledRuntime> {
  const firebaseApp = initializeApp(
    { projectId: configuration.firebaseProjectId },
    "enmori-controlled-backend",
  );
  try {
    const gateway = new FirebaseAdminFirestoreGateway(
      getFirestore(firebaseApp),
    );
    const onboardingRepository = new FirestoreOnboardingRepository(gateway);
    const checkInRepository = new FirestoreCheckInRepository(gateway);
    const interestRepository = new FirestoreInterestRepository(gateway);
    const clock = new SystemClock();
    const ids = new CryptoOpaqueIdGenerator();
    const app = await buildApp({
      identityVerifier: new FirebaseIdentityVerifier(getAuth(firebaseApp)),
      completeOnboarding: new CompleteOnboarding(
        onboardingRepository,
        clock,
        ids,
      ),
      getOnboarding: new GetOnboarding(onboardingRepository),
      createCheckIn: new CreateCheckIn(checkInRepository, clock, ids),
      getCheckIn: new GetCheckIn(checkInRepository),
      getInterestTags: new GetInterestTags(interestRepository),
      getOwnInterests: new GetOwnInterests(interestRepository),
      replaceOwnInterests: new ReplaceOwnInterests(interestRepository),
    });
    return { app, firebaseApp };
  } catch (error: unknown) {
    await deleteApp(firebaseApp);
    throw error;
  }
}

async function closeControlledRuntime(runtime: ControlledRuntime): Promise<void> {
  await runtime.app.close();
  await deleteApp(runtime.firebaseApp);
}

export async function startControlledRuntime(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const configuration = requireControlledRuntimeConfiguration(environment);
  const runtime = await createControlledRuntime(configuration);
  try {
    await runtime.app.listen({
      host: configuration.host,
      port: configuration.port,
    });
  } catch (error: unknown) {
    await closeControlledRuntime(runtime);
    throw error;
  }

  let closing: Promise<void> | undefined;
  const close = (): void => {
    closing ??= closeControlledRuntime(runtime).catch(() => {
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void startControlledRuntime().catch(() => {
    console.error("ENMORI Backend failed to start");
    process.exitCode = 1;
  });
}
