// The OPFS SQLite pool is exclusive to one browsing context. Keep a browser
// lock for that context's lifetime so reloads/tabs cannot open overlapping pools.
let access: Promise<void> | null = null;
export function databaseAccess(): Promise<void> {
  if (!globalThis.navigator?.locks) return Promise.reject(new Error('This browser needs secure Web Locks support to open the journal.'));
  if (!access) access = new Promise<void>((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    navigator.locks.request('workout-journal-sqlite', { signal: controller.signal }, async () => {
      clearTimeout(timeout); resolve();
      // Browser teardown releases this lock together with this context's worker.
      await new Promise<void>(() => undefined);
    }).catch(() => {
      clearTimeout(timeout); access = null;
      reject(new Error('This journal is open in another browser tab. Close that tab and retry.'));
    });
  });
  return access;
}
