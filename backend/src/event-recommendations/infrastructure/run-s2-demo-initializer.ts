import { pathToFileURL } from "node:url";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { FirebaseAdminFirestoreGateway } from
  "../../shared/infrastructure/firebase/firestore-gateway.js";
import {
  initializeApprovedS2Demo,
  loadApprovedS2DemoManifest,
  requireS2DemoInitializerConfiguration,
} from "./s2-demo-initializer.js";

export async function runS2DemoInitializer(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const startedAt = new Date().toISOString();
  const configuration = requireS2DemoInitializerConfiguration(environment);
  const manifest = await loadApprovedS2DemoManifest();
  const app = initializeApp(
    { projectId: configuration.projectId },
    `enmori-s2-demo-initializer-${process.pid}`,
  );
  try {
    const result = await initializeApprovedS2Demo(
      new FirebaseAdminFirestoreGateway(getFirestore(app)),
      manifest,
    );
    console.log(JSON.stringify({
      result,
      projectId: configuration.projectId,
      environmentClass: configuration.environmentClass,
      manifestVersion: manifest.manifestVersion,
      manifestSha256: manifest.digest,
      documentCount: manifest.documents.length,
      startedAt,
      finishedAt: new Date().toISOString(),
    }));
    if (result === "conflict") process.exitCode = 2;
  } finally {
    await deleteApp(app);
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void runS2DemoInitializer().catch(() => {
    console.error("S2 Demo initialization failed");
    process.exitCode = 1;
  });
}
