import {OwnCheckInCalendar} from "../check-ins/application/check-in-calendar.js";
import {FirestoreCheckInCalendar} from "../check-ins/infrastructure/firestore-check-in-calendar.js";
import { EditCheckIn } from "../check-ins/application/edit-check-in.js";
import { FirestoreCheckInMutations } from "../check-ins/infrastructure/firestore-check-in-mutations.js";
import { requireControlledEmulatorEnvironment } from '../shared/infrastructure/firebase/controlled-emulator-environment.js';
import { FriendRequests } from "../friends/application/friend-requests.js";
import { FirestoreFriendRepository } from "../friends/infrastructure/firestore-friend-repository.js";
import { OwnPersonas } from "../personas/application/own-personas.js";
import { FirestorePersonaRepository } from "../personas/infrastructure/firestore-persona-repository.js";
import { ListOwnCheckInsForDate } from '../check-ins/application/check-in-history.js';
import { FirestoreCheckInHistoryRepository } from '../check-ins/infrastructure/firestore-check-in-history-repository.js';
import { FirebaseAdminCheckInHistoryGateway } from "../check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";
import { createHistoryCursorCodec } from '../check-ins/infrastructure/aes-gcm-history-cursor-codec.js';
import { createAuthBindingDocumentId, parseAuthBinding } from '../shared/infrastructure/firebase/firestore-records.js';
import { ok } from '../shared/domain/result.js';
import { CreateInterestTag } from '../interests/application/create-interest-tag.js';
import { FirebaseInterestAdmin } from '../interests/infrastructure/firebase-interest-admin.js';
import { FirestoreCatalogueWriter } from '../interests/infrastructure/firestore-catalogue-writer.js';
import { OwnAccountPreferences } from "../account/application/own-account-preferences.js";
import { FirestoreAccountPreferencesRepository } from "../account/infrastructure/firestore-account-preferences-repository.js";
import { RecommendEvents } from "../event-recommendations/application/recommend-events.js";
import { FirebaseAdminEventReadGateway } from "../event-recommendations/infrastructure/event-read-gateway.js";
import { FirestoreEventRecommendationRepository } from "../event-recommendations/infrastructure/firestore-event-recommendation-repository.js";

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
  type ControlledRuntimeConfiguration,
} from "./controlled-runtime-configuration.js";

interface ControlledRuntime {
  readonly app: FastifyInstance;
  readonly firebaseApp: FirebaseApp;
}

async function createControlledRuntime(
  configuration: ControlledRuntimeConfiguration,
  isolatedEnvironment?: Readonly<Record<string, string | undefined>>,
): Promise<ControlledRuntime> {
  const firebaseApp = initializeApp(
    { projectId: configuration.firebaseProjectId },
    "enmori-controlled-backend",
  );
  try {
    const gateway = new FirebaseAdminFirestoreGateway(
      getFirestore(firebaseApp),
    );
    const onboardingRepository = new FirestoreOnboardingRepository(gateway, isolatedEnvironment);
    const checkInRepository = new FirestoreCheckInRepository(gateway);
    const interestRepository = new FirestoreInterestRepository(gateway);
    const clock = new SystemClock();
    const ids = new CryptoOpaqueIdGenerator();
    const complete = new CompleteOnboarding(onboardingRepository, clock, ids);
    const app = await buildApp({
      ...(isolatedEnvironment ? { isolatedSlices: {
        environment: isolatedEnvironment,
        friends: new FriendRequests(new FirestoreFriendRepository(gateway, clock), clock),
        checkInHistory: new ListOwnCheckInsForDate(new FirestoreCheckInHistoryRepository(new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp))), createHistoryCursorCodec(), clock),
        personas: new OwnPersonas(new FirestorePersonaRepository(gateway, { now: () => ok(new Date()) })),
      } } : {}),
      checkInCalendar:new OwnCheckInCalendar(new FirestoreCheckInCalendar(new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp)))),
      editCheckIn: new EditCheckIn(new FirestoreCheckInMutations(gateway)),
      createInterestTag: new CreateInterestTag(new FirebaseInterestAdmin(getAuth(firebaseApp)), new FirestoreCatalogueWriter(gateway)),
      accountPreferences: new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(gateway, isolatedEnvironment)),
      recommendEvents: new RecommendEvents(new FirestoreEventRecommendationRepository(
        new FirebaseAdminEventReadGateway(getFirestore(firebaseApp)),
      ), clock),
      identityVerifier: new FirebaseIdentityVerifier(getAuth(firebaseApp)),
      completeOnboarding: { execute: async input => {
        const result = await complete.execute(input);
        if (result.ok && isolatedEnvironment) {
          // Idempotent scaffolding only. Never replace saved interests/relations/Personas.
          await gateway.runTransaction(async tx => {
            const binding = await tx.get(`auth_bindings/${createAuthBindingDocumentId(input.principal.firebaseUid)!}`);
            const owner = binding && parseAuthBinding(binding);
            if (!owner) throw new Error('Core account unavailable');
            const records = {
              [`friend_access/${owner}`]: { eligibilityState: 'eligible' },
              [`friend_lists/${owner}`]: { initialized: true },
              [`friend_inboxes/${owner}`]: { initialized: true },
              [`account_interests/${owner}`]: { interestTagIds: [], revision: 1 },
              [`accounts/${owner}/persona_state/current`]: { livePersonaIds: [], stateRevision: 0 },
            };
            const missing = [];
            for (const [path, data] of Object.entries(records)) if (!await tx.get(path)) missing.push({ path, data });
            for (const { path, data } of missing) tx.create(path, data);
          });
        }
        return result;
      } },
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

export async function closeControlledRuntime(runtime: ControlledRuntime): Promise<void> {
  await runtime.app.close();
  await deleteApp(runtime.firebaseApp);
}

/** Core-only controlled environment. No AI epoch, model activation or destructive cleanup. */
export async function createRetainedCoreRuntime(environment: Readonly<Record<string, string | undefined>>): Promise<ControlledRuntime> {
  const checked = requireControlledEmulatorEnvironment(environment);
  if (JSON.stringify(requireControlledEmulatorEnvironment(process.env)) !== JSON.stringify(checked)) {
    throw new Error('Core SDK environment does not match the verified endpoints');
  }
  return createControlledRuntime({ firebaseProjectId: checked.projectId, host: '127.0.0.1', port: 9380 }, environment);
}
