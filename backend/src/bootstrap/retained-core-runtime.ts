import { FirestoreCloudConsentGateway } from '../account/infrastructure/firestore-cloud-consent-gateway.js';
import { createAdminComposition } from './admin-composition.js';
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
import { FirestorePersonalizedEvents } from "../event-recommendations/infrastructure/firestore-personalized-events.js";
import { firestoreSocialAuthority } from "../friends/infrastructure/social-authority.js";
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
import { ManageInterestTags } from '../interests/application/manage-interest-tags.js';
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
import { createOpenAiTestAppComposition, type OpenAiTestAppConfiguration } from './openai-test-app-composition.js';
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
  readonly firstFlowStatus: () => { configured: boolean; workerConfigured: boolean; workerRunning: boolean; workerMode: string; pushConfigured: boolean };
}

/** Private fixed-owner configuration. Selecting a worker does not grant user
 * consent, enable appointments or register a device. */
export function parseLocalFirstFlowConfiguration(value: unknown, nowMs = Date.now()): FirstFlowConfiguration | undefined {
  if (value === undefined) return undefined;
  const record = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
  const invalid = (): never => { throw Error("Invalid local first-flow configuration"); };
  const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
  if(record(value)&&value.audience==="registered_accounts"){
    if(Object.keys(value).length!==3||Object.keys(value).some(k=>!["audience","worker","push"].includes(k))||!record(value.worker)||!record(value.push)||
      value.worker.mode!=="service"||Object.keys(value.worker).some(k=>!["mode","intervalMs"].includes(k))||
      (value.worker.intervalMs!==undefined&&(typeof value.worker.intervalMs!=="number"||!Number.isSafeInteger(value.worker.intervalMs)||value.worker.intervalMs<1000||value.worker.intervalMs>2147483647))||
      Object.keys(value.push).length!==1||typeof value.push.leaseDurationMs!=="number"||!Number.isSafeInteger(value.push.leaseDurationMs)||value.push.leaseDurationMs<60000||value.push.leaseDurationMs>30*86400000)return invalid();
    return Object.freeze({audience:"registered_accounts",worker:Object.freeze({mode:"service",...(typeof value.worker.intervalMs==="number"?{intervalMs:value.worker.intervalMs}:{})}),push:Object.freeze({leaseDurationMs:value.push.leaseDurationMs})});
  }
  if (!record(value) || !Object.hasOwn(value, "ownerAccountId") || !Object.hasOwn(value, "firebaseUid") ||
      Object.keys(value).some(key => !["ownerAccountId", "firebaseUid", "worker", "push"].includes(key))) return invalid();
  const { ownerAccountId, firebaseUid, worker, push } = value;
  if (!uuid(ownerAccountId) || typeof firebaseUid !== "string" || !firebaseUid || firebaseUid.length > 128 || !firebaseUid.isWellFormed() ||
      /[\u0000-\u001f\u007f]/u.test(firebaseUid) || !Number.isSafeInteger(nowMs)) return invalid();
  if (!Object.hasOwn(value, "worker")) {
    if (Object.hasOwn(value, "push")) return invalid();
    return Object.freeze({ownerAccountId, firebaseUid});
  }
  if (!record(worker)) return invalid();
  const service = worker.mode === "service";
  const keys = service ? ["mode", "intervalMs"] : ["endsAtMs", "intervalMs"];
  if (Object.keys(worker).some(key => !keys.includes(key))) return invalid();
  const {endsAtMs, intervalMs} = worker;
  if (!service && (typeof endsAtMs !== "number" || !Number.isSafeInteger(endsAtMs) || endsAtMs <= nowMs || endsAtMs - nowMs > 30 * 60000)) return invalid();
  if (Object.hasOwn(worker, "intervalMs") && (typeof intervalMs !== "number" || !Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 2_147_483_647)) return invalid();
  const selectedWorker = Object.freeze({...(service ? {mode: "service" as const} : {endsAtMs: endsAtMs as number}),
    ...(typeof intervalMs === "number" ? {intervalMs} : {})});
  let selectedPush: import("./first-flow-composition.js").FixedFirstFlowConfiguration["push"];
  if (Object.hasOwn(value, "push")) {
    const keys = service ? ["installationRef", "leaseDurationMs"] : ["installationRef", "leaseExpiresAt"];
    if (!record(push) || Object.keys(push).length !== keys.length || Object.keys(push).some(key => !keys.includes(key)) || !uuid(push.installationRef)) return invalid();
    if (service) {
      if (typeof push.leaseDurationMs !== "number" || !Number.isSafeInteger(push.leaseDurationMs) || push.leaseDurationMs < 60000 || push.leaseDurationMs > 30 * 86400000) return invalid();
      selectedPush = Object.freeze({installationRef: push.installationRef, leaseDurationMs: push.leaseDurationMs});
    } else {
      const lease = push.leaseExpiresAt;
      if (typeof lease !== "string" || !Number.isFinite(Date.parse(lease)) || new Date(lease).toISOString() !== lease || Date.parse(lease) <= nowMs || Date.parse(lease) > (endsAtMs as number) + 15 * 60000) return invalid();
      selectedPush = Object.freeze({installationRef: push.installationRef, leaseExpiresAt: lease});
    }
  }
  return Object.freeze({ownerAccountId, firebaseUid, worker: selectedWorker, ...(selectedPush ? {push: selectedPush} : {})});
}

async function createControlledRuntime(
  configuration: ControlledRuntimeConfiguration,
  isolatedEnvironment?: Readonly<Record<string, string | undefined>>,
  eventInput?: { readonly source: BrowseSource; readonly musicInterestTagId: string },
  chatModel?: string,
  firstFlowConfiguration?: FirstFlowConfiguration,
  cloudTestApp?: OpenAiTestAppConfiguration | null,
): Promise<ControlledRuntime> {
  if (firstFlowConfiguration && (!isolatedEnvironment || chatModel !== "qwen3.5:9b")) throw Error("First-flow requires the approved local model and feature environment");
  const remote = isolatedEnvironment?.ENMORI_REMOTE_GROUP === 'true';
  if (cloudTestApp !== undefined && (!remote || chatModel !== undefined || firstFlowConfiguration !== undefined)) {
    throw Error("OpenAI test app requires the exclusive remote Conversation composition");
  }
  const firebaseApp = initializeApp(
    { projectId: configuration.firebaseProjectId },
    "enmori-controlled-backend",
  );
  try {
    const gateway = new FirebaseAdminFirestoreGateway(
      getFirestore(firebaseApp),
    );
    const identity = new FirebaseIdentityVerifier(getAuth(firebaseApp));
    const avatar = new OwnAvatar(new FirestoreOwnAvatarRepository(gateway));
    const cloud = cloudTestApp !== undefined && isolatedEnvironment
      ? createOpenAiTestAppComposition(cloudTestApp, gateway, isolatedEnvironment, avatar, identity) : undefined;
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
    const socialEvents = socialEventSource(eventBrowseControl.peek, eventBrowseControl.projectionReady, async (asOf) => {
      if(eventBrowseControl.source.recommendationSnapshot)return eventBrowseControl.source.recommendationSnapshot(asOf,new AbortController().signal);
      else await eventBrowseControl.source.firstBatch(asOf,new AbortController().signal);
    });
    const realEvents = createControlledEventRecommendations({
      personalized: new FirestorePersonalizedEvents(gateway,firestoreSocialAuthority,socialEvents.recommendations,eventInput?.musicInterestTagId??"interest_music"),
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
    if ((chatTransport || cloud?.selection) && isolatedEnvironment) {
      try {
        const options = {
          firestore: getFirestore(firebaseApp), environment: isolatedEnvironment,
          gates: simpleChatGates, simpleChat: true as const,
          conversationStrategy: 'open_conversation_v1' as const,
          report: (_phase: 'expiry' | 'source', result: {readonly complete: boolean}) => { if (!result.complete) maintenanceHealthy = false; },
          // A closed target's failed control retirement degrades maintenance.
          // Its own durable claim guards remain; other chats keep their checks.
          reportRetirement: (confirmed: boolean) => {
            if (!confirmed) {
              maintenanceHealthy = false;
              console.warn(JSON.stringify({ diagnostic: 'ai-control-retirement', status: 'unconfirmed' }));
            }
          },
        };
        if (cloud?.selection) {
          chat = await createRemoteConversationComposition({ ...options, openAiTestApp: cloud.selection, selectedReplies: true });
        } else if (chatTransport) {
          await chatTransport.prepareModel();
          chat = await (remote ? createRemoteConversationComposition : createIsolatedConversationComposition)({
            ...options, transport: chatTransport, prepareHost: () => chatTransport.prepareForChat(),
            ...(firstFlowConfiguration ? { selectedReplies: true as const } : {}),
          });
        }
      } catch { healthy = false; }
    }
    const selectedFirstFlow=firstFlowConfiguration??cloudTestApp?.firstFlow;
    const firstFlow = selectedFirstFlow && chat && healthy && (modelLane||cloud?.proactive) && isolatedEnvironment
      ? createFirstFlowComposition({ configuration: selectedFirstFlow, environment: isolatedEnvironment,
        conversation: cloud?.proactive?{store:chat.store,gateway:new FirestoreCloudConsentGateway(chat.gateway,chat.epoch,cloud.proactive.current)}:chat,
        ...(cloud?.proactive?{cloudExecution:cloud.proactive.execution}:{lane:modelLane!}),
        auth: getAuth(firebaseApp), healthy: () => healthy && maintenanceHealthy && (cloud?.proactive?.current()??true),
        ...(selectedFirstFlow.push ? { credential: firebaseApp.options.credential ?? applicationDefault() } : {}) }) : undefined;
    const stopAi = async () => {
      cloud?.closeAdmission();
      previewAccepting = false;
      try {
        await firstFlow?.stop();
        if (!chat) return;
        await chat.stopAdmissionAndMaintenance();
        // Drain active work and observed rate-limit writes. Unknown remote
        // outcomes retain their durable reservations.
        while (chat.runtime.state.nonTerminal > 0 || modelLane?.state.pending ||
          (cloud?.state()?.remotePending ?? 0) > 0 || cloud?.rateLimitPending() || firstFlow?.application.executionState.running) await wait(250);
        chat.runtime.shutdown();
      } finally { cloud?.release(); }
    };
    const aiStatus = () => {
      const state = cloud?.state();
      return { configured: !!chatTransport || cloud !== undefined, available: !!chat && healthy && (!cloud || state?.ready === true),
        maintenanceHealthy, pending: modelLane?.state.pending ?? ((state?.remotePending ?? 0) > 0 || cloud?.rateLimitPending() === true),
        outcomeUnknown: modelLane?.state.outcomeUnknown ?? (state?.remoteUnknown ?? 0) > 0 };
    };
    const personaPreview = cloud?.personaPreview ?? (chat && healthy && chatTransport ? new PreviewPersona(
      new FirestorePersonaPreviewAuthority(gateway), chatTransport,
      () => performance.now(), () => modelLane?.state.pending ?? true,
    ) : undefined);
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

    const interestAdmin = new FirebaseInterestAdmin(getAuth(firebaseApp));
    const admin = createAdminComposition(gateway, interestAdmin, { ...(eventInput ? {source:eventInput.source} : {}), ai:aiStatus, eventExists:async(p,id)=>{const r=await realEvents.eventDetail.execute(p,id);return r.ok ? ok(undefined) : r;} });
    const catalogueWriter = new FirestoreCatalogueWriter(gateway, undefined, admin.audit);
    const app = await buildApp({
      adminOperations: admin.operations, adminMaintenance: admin.maintenance, managedCategories: admin.repository,
      ...(firstFlow ? { firstFlow } : {}),
      ...(chat?.ownedSources ? { ownedSources: firstFlow
        ? withDeliveryResolution(chat.ownedSources, firstFlow.application, firstFlow.accepting) : chat.ownedSources } : {}),
      ...(remote ? {socialModule: {identity, store: gateway,
        history: new FirebaseAdminCheckInHistoryGateway(getFirestore(firebaseApp)), cursor: createHistoryCursorCodec(), clock, weather, activityEvents: socialEvents.activity, recommendationEvents: socialEvents.recommendations}} : {}),
      ...(isolatedEnvironment ? { [remote ? 'remoteSlices' : 'isolatedSlices']: {
        environment: isolatedEnvironment,
        ...(cloud ? { cloudConversationIdentity: cloud.identity } : {}),
        ...(chat && healthy ? { conversations: {
          ...chat.operations,
          prepare: (...args: Parameters<typeof chat.operations.prepare>) => healthy
            ? chat!.operations.prepare(...args) : Promise.resolve({ kind: 'failure' as const, code: 'AI_UNAVAILABLE' as const }),
          execute: (...args: Parameters<typeof chat.operations.execute>) => healthy
            ? chat!.operations.execute(...args) : Promise.resolve({ kind: 'failure' as const, code: 'AI_UNAVAILABLE' as const }),
        } } : {}),
        ...(personaPreview ? { personaPreview: {
          ...(cloud?.personaPreview ? { processing: cloud.personaPreview.processing } : {}),
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
      createInterestTag: new CreateInterestTag(interestAdmin, catalogueWriter),
      getInterestAdminCapability: new GetInterestAdminCapability(interestAdmin),
      manageInterestTags: new ManageInterestTags(interestAdmin, catalogueWriter),
      accountPreferences: cloud?.preferences ?? new OwnAccountPreferences(new FirestoreAccountPreferencesRepository(gateway, isolatedEnvironment), avatar),
      recommendEvents: realEvents.recommendEvents,
      identityVerifier: identity,
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
    return { app, firebaseApp, eventBrowseControl, stopEvents, stopAi, aiStatus,
      firstFlowStatus: () => firstFlow?.status() ?? {configured:false,workerConfigured:false,workerRunning:false,workerMode:"off",pushConfigured:false} };
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
  firstFlow?: FirstFlowConfiguration, cloudTestApp?: OpenAiTestAppConfiguration | null): Promise<ControlledRuntime> {
  requireRemoteGroupEnvironment(environment);
  return createControlledRuntime({firebaseProjectId: 'enmori-rmvp-controlled', host: '127.0.0.1', port: 9381}, environment, events, chatModel, firstFlow, cloudTestApp);
}
