export function databaseAccess(): Promise<void> {
  // Native SQLite manages its own connection locks.
  return Promise.resolve();
}
