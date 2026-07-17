import { SyncEngine } from './syncEngine';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInProgress = false;
let isOnline = false;

const DEBOUNCE_MS = 1500; // wait for a short pause after writes before syncing

export const AutoSyncTrigger = {
  setOnlineStatus(online: boolean) {
    isOnline = online;
  },

  /** Call this after any local write (create/update/delete). Debounced so
   * rapid successive writes don't each trigger their own sync run. */
  requestSync() {
    if (!isOnline) return; // don't even schedule if we know we're offline

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (syncInProgress) return;
      syncInProgress = true;
      try {
        const result = await SyncEngine.runFullSync();
        console.log('[AutoSync] Triggered by local change:', result);
      } catch (err: any) {
        console.warn('[AutoSync] Failed:', err.message ?? err);
      } finally {
        syncInProgress = false;
      }
    }, DEBOUNCE_MS);
  },

  /** For reconnect/periodic triggers that should run immediately, no debounce */
  async runNow(): Promise<void> {
    if (syncInProgress) return;
    syncInProgress = true;
    try {
      const result = await SyncEngine.runFullSync();
      console.log('[AutoSync] Immediate run:', result);
    } catch (err: any) {
      console.warn('[AutoSync] Immediate run failed:', err.message ?? err);
    } finally {
      syncInProgress = false;
    }
  },

  isSyncing() {
    return syncInProgress;
  },
};