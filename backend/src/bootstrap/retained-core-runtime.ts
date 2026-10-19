import { setTimeout as wait } from "node:timers/promises";
import { createIsolatedConversationComposition } from "./isolated-conversation-composition.js";
import { LocalChatTransport, simpleChatGates } from "../ai-runtime/infrastructure/local-chat-transport.js";
import { createControlledEventBrowse } from "./controlled-event-browse.js";
import { createControlledEventRecommendations } from "./controlled-event-recommendations.js";
import type { BrowseSource } from "../event-browse/ports/event-browse.js";
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
import { FirebaseAdminEventReadGateway } from "../event-recommendations/infrastructure/event-read-gateway.js";

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
  readonly eventBrowseControl: ReturnType<typeof createControlledEventBrowse>;
  readonly stopEvents: () => Promise<void>;
  readonly stopAi: () => Promise<void>;
  readonly aiStatus: () => { configured: boolean; available: boolean; maintenanceHealthy: boolean; pending: boolean; outcomeUnknown: boolean };
}

async function createControlledRuntime(
  configuration: ControlledRuntimeConfiguration,
  isolatedEnvironment?: Readonly<Record<string, string | undefined>>,
  eventInput?: { readonly source: BrowseSource; readonly musicInterestTagId: string },
  chatModel?: string,
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
    let running = true;
    const pending = new Set<Promise<unknown>>();
    const eventBrowseControl = createControlledEventBrowse({
      ...(eventInput ? { source: eventInput.source } : {}), projectionCache: true,
      running: () => running,
      track: async work => {
        const result = work(); pending.add(result);
        try { return await result; } finally { pending.delete(result); }
      },
    });
    const stopEvents = async () => {
      running = false; eventBrowseControl.disable();
      await Promise.allSettled([...pending]);
    };
    const realEvents = createControlledEventRecommendations({
      gateway: new FirebaseAdminEventReadGateway(getFirestore(firebaseApp)),
      source: eventBrowseControl.source, clock, requireRecommendationConsent: true,
      ...(eventInput ? { musicInterestTagId: eventInput.musicInterestTagId } : {}),
    });
    let chat: Awaited<ReturnType<typeof createIsolatedConversationComposition>> | undefined;
    let healthy = true;
    let maintenanceHealthy = true;
    const chatTransport = chatModel ? new LocalChatTransport(chatModel) : undefined;
    if (chatTransport && isolatedEnvironment) {
      try {
        await chatTransport.prepareModel();
        chat = await createIsolatedConversationComposition({
          firestore: getFirestore(firebaseApp), environment: isolatedEnvironment,
          transport: chatTransport, gates: simpleChatGates, simpleChat: true,
          conversationStrategy: 'open_conversation_v1',
          report: (_phase, result) => { if (!result.complete) maintenanceHealthy = false; },
          reportRetirement: confirmed => { if (!confirmed) healthy = false; },
        });
      } catch { healthy = false; }
    }
    const stopAi = async () => {
      if (!chat) return;
      await chat.stopAdmissionAndMaintenance();
      // Let accepted work settle normally. Unknown generation outcomes retain
      // the process/data rather than exporting a false clean shutdown.
      while (chat.runtime.state.nonTerminal > 0 || chatTransport?.state.pending) await wait(250);
      chat.runtime.shutdown();
    };
    const aiStatus = () => ({ configured: !!chatTransport, available: !!chat && healthy,
      maintenanceHealthy, pending: chatTransport?.state.pending ?? false, outcomeUnknown: chatTransport?.state.outcomeUnknown ?? false });
    const app = await buildApp({
      ...(isolatedEnvironment ? { isolatedSlices: {
        environment: isolatedEnvironment,
        ...(chat && healthy ? { conversations: {
          ...chat.operations,
          prepare: (...args: Parameters<typeof chat.operations.prepare>) => healthy
            ? chat!.operations.prepare(...args) : Promise.resolve({ kind: 'failure' as const, code: 'AI_UNAVAILABLE' as const }),
          execute: (...args: Parameters<typeof chat.operations.execute>) => healthy
            ? chat!.operations.execute(...args) : Promise.resolve({ kind: 'failure' as const, code: 'AI_UNAVAILABLE' as const }),
        } } : {}),
        eventBrowse: { source: eventBrowseControl.source },
        eventDetail: realEvents.eventDetail,
        friends: new FriendRequests(new FirestoreFriendRepository(gateway, clock), clock),
        checkInHistory: new ListOwnCheckInsForDate(new FirestoreCheckInHistoryRepository(new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp))), createHistoryCursorCodec(), clock),
        personas: new OwnPersonas(new FirestorePersonaRepository(gateway, { now: () => ok(new Date()) })),
      } } : {}),
      checkInCalendar:new OwnCheckInCalendar(new FirestoreCheckInCalendar(new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp)))),
      editCheckIn: new EditCheckIn(new FirestoreCheckInMutations(gateway)),
      createInterestTag: new CreateInterestTag(new FirebaseInterestAdmin(getAuth(firebaseApp)), new FirestoreCatalogueWriter(gateway)),
      accountPreferences: new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(gateway, isolatedEnvironment)),
      recommendEvents: realEvents.recommendEvents,
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
    return { app, firebaseApp, eventBrowseControl, stopEvents, stopAi, aiStatus };
  } catch (error: unknown) {
    await deleteApp(firebaseApp);
    throw error;
  }
}

export async function closeControlledRuntime(runtime: ControlledRuntime): Promise<void> {
  await runtime.stopAi();
  await runtime.stopEvents();
  await runtime.app.close();
  await deleteApp(runtime.firebaseApp);
}

/** Retained local environment; optional explicitly selected real Events and simple chat. */
export async function createRetainedCoreRuntime(environment: Readonly<Record<string, string | undefined>>,
  events?: { readonly source: BrowseSource; readonly musicInterestTagId: string },
  chatModel?: string,
): Promise<ControlledRuntime> {
  const checked = requireControlledEmulatorEnvironment(environment);
  if (JSON.stringify(requireControlledEmulatorEnvironment(process.env)) !== JSON.stringify(checked)) {
    throw new Error('Core SDK environment does not match the verified endpoints');
  }
  return createControlledRuntime({ firebaseProjectId: checked.projectId, host: '127.0.0.1', port: 9380 }, environment, events, chatModel);
}
