import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readFile } from "node:fs/promises";

import type {
  FirestoreGateway,
  StoredDocument,
} from "../../shared/infrastructure/firebase/firestore-gateway.js";
import {
  parseMatchingInterest,
  parseRecommendationEvent,
} from "./event-records.js";

export const S2_DEMO_PROJECT_ID = "enmori-rmvp-controlled";
export const S2_DEMO_MANIFEST_VERSION = "s2-event-demo-v1";
export const S2_DEMO_MANIFEST_DIGEST =
  "d9b5191bccedcdc12544bc66559ffeaf4eae0987c29e121a4f9de9755c6c642b";
export const S2_DEMO_MANIFEST_PATH =
  "backend/fixtures/s2-event-demo-manifest.v1.json";
export const S2_DEMO_DOCUMENT_PATHS = [
  "interest_tags/interest_community",
  "interest_tags/interest_music",
  "events/s2_demo_community_early",
  "events/s2_demo_music_early",
  "events/s2_demo_community_music",
  "events/s2_demo_community_late",
] as const;

type Environment = Readonly<Record<string, string | undefined>>;

export interface S2DemoInitializerConfiguration {
  readonly environmentClass: "controlled-demo";
  readonly projectId: typeof S2_DEMO_PROJECT_ID;
}

export interface S2DemoManifestDocument {
  readonly path: (typeof S2_DEMO_DOCUMENT_PATHS)[number];
  readonly data: StoredDocument;
}

export interface S2DemoManifest {
  readonly manifestVersion: typeof S2_DEMO_MANIFEST_VERSION;
  readonly digest: typeof S2_DEMO_MANIFEST_DIGEST;
  readonly documents: readonly S2DemoManifestDocument[];
}

export type S2DemoInitializationOutcome = "created" | "unchanged" | "conflict";

export function requireS2DemoInitializerConfiguration(
  environment: Environment,
): S2DemoInitializerConfiguration {
  if (environment.ENMORI_ENVIRONMENT !== "controlled-demo") {
    throw new Error("S2 Demo initialization requires controlled-demo mode");
  }
  if (environment.ENMORI_FIREBASE_PROJECT_ID !== S2_DEMO_PROJECT_ID) {
    throw new Error("S2 Demo initialization requires the exact approved project");
  }
  for (const name of [
    "FIREBASE_AUTH_EMULATOR_HOST",
    "FIRESTORE_EMULATOR_HOST",
  ] as const) {
    if (environment[name] !== undefined) {
      throw new Error("Firebase Emulator configuration is forbidden for S2 Demo initialization");
    }
  }
  for (const name of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT"] as const) {
    const ambientProject = environment[name];
    if (ambientProject !== undefined && ambientProject !== S2_DEMO_PROJECT_ID) {
      throw new Error("Ambient Firebase project identifiers must match the approved project");
    }
  }
  if (environment.FIREBASE_CONFIG !== undefined) {
    throw new Error("Firebase project overrides are forbidden for S2 Demo initialization");
  }
  return {
    environmentClass: "controlled-demo",
    projectId: S2_DEMO_PROJECT_ID,
  };
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  throw new Error("S2 Demo manifest contains a non-JSON value");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function parseApprovedManifest(value: unknown): S2DemoManifest {
  if (!isRecord(value) || !hasOnlyKeys(value, ["manifestVersion", "documents"])) {
    throw new Error("S2 Demo manifest has an invalid envelope");
  }
  if (value.manifestVersion !== S2_DEMO_MANIFEST_VERSION || !Array.isArray(value.documents)) {
    throw new Error("S2 Demo manifest version is not approved");
  }

  const digest = createHash("sha256").update(canonicalJson(value)).digest("hex");
  if (digest !== S2_DEMO_MANIFEST_DIGEST) {
    throw new Error("S2 Demo manifest digest is not approved");
  }
  if (value.documents.length !== S2_DEMO_DOCUMENT_PATHS.length) {
    throw new Error("S2 Demo manifest document inventory is not approved");
  }

  const documents = value.documents.map((entry, index): S2DemoManifestDocument => {
    if (!isRecord(entry) || !hasOnlyKeys(entry, ["path", "data"]) ||
        entry.path !== S2_DEMO_DOCUMENT_PATHS[index] || !isRecord(entry.data)) {
      throw new Error("S2 Demo manifest document inventory is not approved");
    }
    const path = S2_DEMO_DOCUMENT_PATHS[index]!;
    const [, id] = path.split("/");
    const valid = path.startsWith("interest_tags/")
      ? parseMatchingInterest(id!, entry.data)
      : parseRecommendationEvent(id!, entry.data);
    if (valid === undefined) {
      throw new Error("S2 Demo manifest contains an invalid approved record");
    }
    return { path, data: { ...entry.data } };
  });

  return {
    manifestVersion: S2_DEMO_MANIFEST_VERSION,
    digest: S2_DEMO_MANIFEST_DIGEST,
    documents,
  };
}

export async function loadApprovedS2DemoManifest(): Promise<S2DemoManifest> {
  const text = await readFile(S2_DEMO_MANIFEST_PATH, "utf8");
  return parseApprovedManifest(JSON.parse(text) as unknown);
}

export async function initializeApprovedS2Demo(
  firestore: FirestoreGateway,
  manifest: S2DemoManifest,
): Promise<S2DemoInitializationOutcome> {
  return firestore.runTransaction(async (transaction) => {
    const existing = await Promise.all(
      manifest.documents.map(({ path }) => transaction.get(path)),
    );

    for (let index = 0; index < manifest.documents.length; index += 1) {
      const stored = existing[index];
      if (stored !== undefined &&
          !isDeepStrictEqual(stored, manifest.documents[index]!.data)) {
        return "conflict";
      }
    }

    let created = false;
    manifest.documents.forEach(({ path, data }, index) => {
      if (existing[index] === undefined) {
        transaction.create(path, data);
        created = true;
      }
    });
    return created ? "created" : "unchanged";
  });
}
