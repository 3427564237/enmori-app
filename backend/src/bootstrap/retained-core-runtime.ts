import { OwnAvatar } from "../account/application/own-avatar.js";
import { FirestoreOwnAvatarRepository } from "../account/infrastructure/firestore-own-avatar-repository.js";
import { socialEventSource } from './social-event-source.js';
import { OpenMeteoWeatherProvider } from '../weather/infrastructure/open-meteo-weather-provider.js';
import { requireRemoteGroupEnvironment } from '../shared/infrastructure/firebase/feature-environment.js';
import { randomBytes } from "node:crypto";
import { createIsolatedEventParticipation, createRemoteEventParticipation } from "./event-participation.js";
import { setTimeout as wait } from "node:timers/promises";
import { createIsolatedConversationComposition, createRemoteConversationComposition } from "./isolated-conversation-composition.js";
import { LocalChatTransport, simpleChatGates } from "../ai-runtime/infrastructure/local-chat-transport.js";
import { LocalModelLane } from "../ai-runtime/infrastructure/local-model-lane.js";
import { createFirstFlowComposition, type FirstFlowConfiguration } from "./first-flow-composition.js";
import { withDeliveryResolution } from "./owned-source-composition.js";
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
import { PreviewPersona } from "../personas/application/preview-persona.js";
import { FirestorePersonaPreviewAuthority } from "../personas/infrastructure/firestore-persona-preview-authority.js";
import { FirestorePersonaRepository } from "../personas/infrastructure/firestore-persona-repository.js";
import { ListOwnCheckInsForDate } from '../check-ins/application/check-in-history.js';
import { FirestoreCheckInHistoryRepository } from '../check-ins/infrastructure/firestore-check-in-history-repository.js';
import { FirebaseAdminCheckInHistoryGateway } from "../check-ins/infrastructure/firebase-admin-check-in-history-gateway.js";
import { createHistoryCursorCodec } from '../check-ins/infrastructure/aes-gcm-history-cursor-codec.js';
import { createAuthBindingDocumentId, parseAuthBinding } from '../shared/infrastructure/firebase/firestore-records.js';
import { ok } from '../shared/domain/result.js';
import { CreateInterestTag } from '../interests/application/create-interest-tag.js';
import { GetInterestAdminCapability } from '../interests/application/get-interest-admin-capability.js';
import { FirebaseInterestAdmin } from '../interests/infrastructure/firebase-interest-admin.js';
import { FirestoreCatalogueWriter } from '../interests/infrastructure/firestore-catalogue-writer.js';
import { OwnAccountPreferences } from "../account/application/own-account-preferences.js";
import { FirestoreAccountPreferencesRepository } from "../account/infrastructure/firestore-account-preferences-repository.js";
import { FirebaseAdminEventReadGateway } from "../event-recommendations/infrastructure/event-read-gateway.js";

import {
  deleteApp,
  applicationDefault,
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

/** Private real-entry selection only. Absence keeps F0/F1 off; this never
 * grants user consent, enables intents, discovers an owner or configures push. */
export function parseLocalFirstFlowConfiguration(value: unknown, nowMs = Date.now()): FirstFlowConfiguration | undefined {
  if (value === undefined) return undefined;
  const record = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
  const invalid = () => { throw Error("Invalid local first-flow configuration"); };
  if (!record(value) || !Object.hasOwn(value, "ownerAccountId") || !Object.hasOwn(value, "firebaseUid") ||
      Object.keys(value).some(key => !["ownerAccountId", "firebaseUid", "worker"].includes(key))) return invalid();
  const { ownerAccountId, firebaseUid, worker } = value;
  if (typeof ownerAccountId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ownerAccountId) ||
      typeof firebaseUid !== "string" || !firebaseUid || firebaseUid.length > 128 || !firebaseUid.isWellFormed() ||
      /[\u0000-\u001f\u007f]/u.test(firebaseUid)) return invalid();
  if (worker === undefined && !Object.hasOwn(value, "worker")) return Object.freeze({ ownerAccountId, firebaseUid });
  if (!record(worker) || Object.keys(worker).some(key => !["endsAtMs", "intervalMs"].includes(key))) return invalid();
  const { endsAtMs, intervalMs } = worker;
  if (typeof endsAtMs !== "number" || !Number.isSafeInteger(endsAtMs) || !Number.isSafeInteger(nowMs) ||
      endsAtMs <= nowMs || endsAtMs - nowMs > 30 * 60000 ||
      (Object.hasOwn(worker, "intervalMs") && (typeof intervalMs !== "number" || !Number.isSafeInteger(intervalMs) ||
        intervalMs < 1000 || intervalMs > 2_147_483_647))) return invalid();
  // Copy the fixed selection; do not retain a mutable JSON/configuration object.
  return Object.freeze({ ownerAccountId, firebaseUid, worker: Object.freeze({ endsAtMs,
    ...(typeof intervalMs === "number" ? { intervalMs } : {}) }) });
}

async function createControlledRuntime(
  configuration: ControlledRuntimeConfiguration,
  isolatedEnvironment?: Readonly<Record<string, string | undefined>>,
  eventInput?: { readonly source: BrowseSource; readonly musicInterestTagId: string },
  chatModel?: string,
  firstFlowConfiguration?: FirstFlowConfiguration,
): Promise<ControlledRuntime> {
  if (firstFlowConfiguration && (!isolatedEnvironment || chatModel !== "qwen3.5:9b")) throw Error("First-flow requires the approved local model and feature environment");
  const remote = isolatedEnvironment?.ENMORI_REMOTE_GROUP === 'true';
  const firebaseApp = initializeApp(
    { projectId: configuration.firebaseProjectId },
    "enmori-controlled-backend",
  );
  try {
    const gateway = new FirebaseAdminFirestoreGateway(
      getFirestore(firebaseApp),
    );
    const onboardingRepository = new FirestoreOnboardingRepository(gateway, isolatedEnvironment);
    const weather = new OpenMeteoWeatherProvider(() => running);
    const checkInRepository = new FirestoreCheckInRepository(gateway, weather, new SystemClock());
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
    // One host-owned key per process; restart invalidates positions, never facts.
    const participation = isolatedEnvironment ? (remote ? createRemoteEventParticipation : createIsolatedEventParticipation)({
      environment: isolatedEnvironment, firestore: gateway, clock,
      source: eventBrowseControl.source, cursorKey: randomBytes(32),
    }) : undefined;
    const realEvents = createControlledEventRecommendations({
      gateway: new FirebaseAdminEventReadGateway(getFirestore(firebaseApp)),
      source: eventBrowseControl.source, clock, requireRecommendationConsent: true,
      ...(participation ? { ignoredEventIds: participation.ignoredEventIds } : {}),
      ...(eventInput ? { musicInterestTagId: eventInput.musicInterestTagId } : {}),
    });
    let chat: Awaited<ReturnType<typeof createIsolatedConversationComposition>> | undefined;
    let healthy = true;
    let previewAccepting = true;
    let maintenanceHealthy = true;
    // One physical host lane is also supplied to the explicit first-flow
    // composition. A delivery timeout never releases it for another feature.
    const modelLane = chatModel ? new LocalModelLane(chatModel) : undefined;
    const chatTransport = modelLane ? new LocalChatTransport(modelLane) : undefined;
    if (chatTransport && isolatedEnvironment) {
      try {
        await chatTransport.prepareModel();
        chat = await (remote ? createRemoteConversationComposition : createIsolatedConversationComposition)({
          firestore: getFirestore(firebaseApp), environment: isolatedEnvironment,
          transport: chatTransport, gates: simpleChatGates, simpleChat: true,
          ...(firstFlowConfiguration ? { selectedReplies: true as const } : {}),
          conversationStrategy: 'open_conversation_v1',
          report: (_phase, result) => { if (!result.complete) maintenanceHealthy = false; },
          reportRetirement: confirmed => { if (!confirmed) healthy = false; },
        });
      } catch { healthy = false; }
    }
    const firstFlow = firstFlowConfiguration && chat && healthy && modelLane && isolatedEnvironment
      ? createFirstFlowComposition({ configuration: firstFlowConfiguration, environment: isolatedEnvironment,
        conversation: chat, lane: modelLane, auth: getAuth(firebaseApp), healthy: () => healthy && maintenanceHealthy,
        ...(firstFlowConfiguration.push ? { credential: firebaseApp.options.credential ?? applicationDefault() } : {}) }) : undefined;
    const stopAi = async () => {
      previewAccepting = false;
      await firstFlow?.stop();
      if (!chat) return;
      await chat.stopAdmissionAndMaintenance();
      // Let accepted work settle normally. Unknown generation outcomes retain
      // the process/data rather than exporting a false clean shutdown.
      while (chat.runtime.state.nonTerminal > 0 || modelLane?.state.pending || firstFlow?.application.executionState.running) await wait(250);
      chat.runtime.shutdown();
    };
    const aiStatus = () => ({ configured: !!chatTransport, available: !!chat && healthy,
      maintenanceHealthy, pending: modelLane?.state.pending ?? false, outcomeUnknown: modelLane?.state.outcomeUnknown ?? false });
    const personaPreview = chat && healthy && chatTransport ? new PreviewPersona(
      new FirestorePersonaPreviewAuthority(gateway), chatTransport,
      () => performance.now(), () => modelLane?.state.pending ?? true,
    ) : undefined;
    const initializeOwner = async (uid: string) => {
      await gateway.runTransaction(async tx => {
        const bindingId = createAuthBindingDocumentId(uid);
        if (!bindingId) throw new Error('Account unavailable');
        const binding = await tx.get(`auth_bindings/${bindingId}`);
        const owner = binding && parseAuthBinding(binding);
        if (!owner) throw new Error('Account unavailable');
        const accountPath = `accounts/${owner}`, account = await tx.get(accountPath);
        if (!account || !['accepted', 'rejected'].includes(String(account.optionalProcessingConsent))) throw new Error('Account unavailable');
        const records = {
          [`friend_access/${owner}`]: { eligibilityState: 'eligible' },
          [`friend_lists/${owner}`]: { initialized: true },
          [`friend_inboxes/${owner}`]: { initialized: true },
          [`account_interests/${owner}`]: { interestTagIds: [], revision: 1 },
          [`accounts/${owner}/persona_state/current`]: { livePersonaIds: [], stateRevision: 0 },
        };
        const missing = [];
        for (const [path, data] of Object.entries(records)) if (!await tx.get(path)) missing.push({path, data});
        if (remote && account.purposeRevocationGeneration === undefined) tx.set(accountPath, {...account, purposeRevocationGeneration: 0});
        for (const {path, data} of missing) tx.create(path, data);
      });
    };
    const getOnboarding = new GetOnboarding(onboardingRepository);
    const socialEvents = socialEventSource(eventBrowseControl.peek, eventBrowseControl.projectionReady, async (asOf) => { await eventBrowseControl.source.firstBatch(asOf, new AbortController().signal); });
    const app = await buildApp({
      ...(firstFlow ? { firstFlow } : {}),
      ...(chat?.ownedSources ? { ownedSources: firstFlow
        ? withDeliveryResolution(chat.ownedSources, firstFlow.application, firstFlow.accepting) : chat.ownedSources } : {}),
      ...(remote ? {socialModule: {identity: new FirebaseIdentityVerifier(getAuth(firebaseApp)), store: gateway,
        history: new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp)), cursor: createHistoryCursorCodec(), clock, weather, activityEvents: socialEvents.activity, recommendationEvents: socialEvents.recommendations}} : {}),
      ...(isolatedEnvironment ? { [remote ? 'remoteSlices' : 'isolatedSlices']: {
        environment: isolatedEnvironment,
        ...(chat && healthy ? { conversations: {
          ...chat.operations,
          prepare: (...args: Parameters<typeof chat.operations.prepare>) => healthy
            ? chat!.operations.prepare(...args) : Promise.resolve({ kind: 'failure' as const, code: 'AI_UNAVAILABLE' as const }),
          execute: (...args: Parameters<typeof chat.operations.execute>) => healthy
            ? chat!.operations.execute(...args) : Promise.resolve({ kind: 'failure' as const, code: 'AI_UNAVAILABLE' as const }),
        } } : {}),
        ...(personaPreview ? { personaPreview: {
          execute: (...args: Parameters<PreviewPersona["execute"]>) => personaPreview.execute(
            args[0], args[1], args[2], { ...args[3],
              current: () => previewAccepting && healthy && args[3].current(),
            }),
        } } : {}),
        eventBrowse: { source: eventBrowseControl.source },
        ...(participation ? { eventParticipation: participation } : {}),
        eventDetail: realEvents.eventDetail,
        friends: new FriendRequests(new FirestoreFriendRepository(gateway, clock), clock),
        checkInHistory: new ListOwnCheckInsForDate(new FirestoreCheckInHistoryRepository(new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp))), createHistoryCursorCodec(), clock),
        personas: new OwnPersonas(new FirestorePersonaRepository(gateway, { now: () => ok(new Date()) })),
      } } : {}),
      checkInCalendar:new OwnCheckInCalendar(new FirestoreCheckInCalendar(new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp)))),
      editCheckIn: new EditCheckIn(new FirestoreCheckInMutations(gateway)),
      createInterestTag: new CreateInterestTag(new FirebaseInterestAdmin(getAuth(firebaseApp)), new FirestoreCatalogueWriter(gateway)),
      getInterestAdminCapability: new GetInterestAdminCapability(new FirebaseInterestAdmin(getAuth(firebaseApp))),
      accountPreferences: new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(gateway, isolatedEnvironment), new OwnAvatar(new FirestoreOwnAvatarRepository(gateway))),
      recommendEvents: realEvents.recommendEvents,
      identityVerifier: new FirebaseIdentityVerifier(getAuth(firebaseApp)),
      completeOnboarding: { execute: async input => {
        const result = await complete.execute(input);
        if (result.ok && isolatedEnvironment) {
          await initializeOwner(input.principal.firebaseUid);
        }
        return result;
      } },
      getOnboarding: {execute: async principal => {
        const result = await getOnboarding.execute(principal);
        if (remote && result.ok && result.value.status === 'completed') await initializeOwner(principal.firebaseUid);
        return result;
      }},
      createCheckIn: new CreateCheckIn(checkInRepository, clock, ids),
      getCheckIn: new GetCheckIn(checkInRepository),
      getInterestTags: new GetInterestTags(interestRepository),
      getOwnInterests: new GetOwnInterests(interestRepository),
      replaceOwnInterests: new ReplaceOwnInterests(interestRepository),
    });
    firstFlow?.start();
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
  firstFlow?: FirstFlowConfiguration,
): Promise<ControlledRuntime> {
  const checked = requireControlledEmulatorEnvironment(environment);
  if (JSON.stringify(requireControlledEmulatorEnvironment(process.env)) !== JSON.stringify(checked)) {
    throw new Error('Core SDK environment does not match the verified endpoints');
  }
  return createControlledRuntime({ firebaseProjectId: checked.projectId, host: '127.0.0.1', port: 9380 }, environment, events, chatModel, firstFlow);
}

/** Public group entry uses real Firebase only; it cannot select Emulator bindings. */
export async function createRemoteGroupRuntime(environment: Readonly<Record<string, string | undefined>>,
  events?: { readonly source: BrowseSource; readonly musicInterestTagId: string }, chatModel?: string,
  firstFlow?: FirstFlowConfiguration): Promise<ControlledRuntime> {
  requireRemoteGroupEnvironment(environment);
  return createControlledRuntime({firebaseProjectId: 'enmori-rmvp-controlled', host: '127.0.0.1', port: 9381}, environment, events, chatModel, firstFlow);
}
