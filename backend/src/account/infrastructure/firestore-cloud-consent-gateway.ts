import type { RuntimeEpoch } from '../../ai-conversation/ports/real-conversation-store.js';
import type { FirestoreGateway, FirestoreTransactionGateway } from '../../shared/infrastructure/firebase/firestore-gateway.js';

/** Reuses the existing durable runtime fence. A new confirmed epoch conflicts
 * with every old consent transaction; SDK retries must never adopt a new epoch.
 * All cloud Settings writers must use this gateway before cloud enablement. */
export class FirestoreCloudConsentGateway implements FirestoreGateway {
  private readonly epoch: RuntimeEpoch;
  constructor(private readonly gateway: FirestoreGateway, epoch: RuntimeEpoch,
    private readonly ownsHost: () => boolean) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(epoch.processEpoch) ||
      !Number.isSafeInteger(epoch.generation) || epoch.generation < 1) throw Error('INVALID_RUNTIME_EPOCH');
    this.epoch = Object.freeze({...epoch});
  }
  runTransaction<T>(work: (transaction: FirestoreTransactionGateway) => Promise<T>): Promise<T> {
    return this.gateway.runTransaction(async tx => {
      if (!this.ownsHost()) throw Error('CLOUD_HOST_UNAVAILABLE');
      const fence = await tx.get('ai_runtime_fence/current');
      if (!fence || Object.keys(fence).length !== 3 || !Number.isSafeInteger(fence.cleanupGeneration) ||
        (fence.cleanupGeneration as number) < 0 || fence.processEpoch !== this.epoch.processEpoch ||
        fence.generation !== this.epoch.generation || !this.ownsHost()) throw Error('CLOUD_EPOCH_UNAVAILABLE');
      const value = await work(tx);
      if (!this.ownsHost()) throw Error('CLOUD_HOST_UNAVAILABLE');
      return value;
    }, {maxAttempts:1});
  }
}
