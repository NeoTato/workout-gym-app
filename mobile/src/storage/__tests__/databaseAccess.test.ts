const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
afterEach(() => {
  jest.useRealTimers();
  if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks);
  else Reflect.deleteProperty(navigator, 'locks');
});

test('waits for exclusive browser ownership and shares one request between callers', async () => {
  jest.resetModules(); let grant!: () => Promise<void>;
  const request = jest.fn((_name, _options, callback) => { grant = callback; return new Promise<void>(() => undefined); });
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
  const { databaseAccess } = jest.requireActual<typeof import('../databaseAccess.web')>('../databaseAccess.web');
  const first = databaseAccess(), second = databaseAccess(); let acquired = false; void first.then(() => { acquired = true; });
  await Promise.resolve(); expect(acquired).toBe(false); expect(first).toBe(second); expect(request).toHaveBeenCalledTimes(1);
  void grant(); await first; expect(acquired).toBe(true);
});

test('a busy browser owner times out without opening a second pool and can be retried', async () => {
  jest.resetModules(); jest.useFakeTimers();
  const request = jest.fn((_name, options, _callback) => new Promise<void>((_, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
  const { databaseAccess } = jest.requireActual<typeof import('../databaseAccess.web')>('../databaseAccess.web');
  const first = databaseAccess(), rejection = expect(first).rejects.toThrow(/another browser tab/);
  await jest.advanceTimersByTimeAsync(10_000); await rejection;
  void databaseAccess().catch(() => undefined); expect(request).toHaveBeenCalledTimes(2);
});

test('unsupported browsers fail clearly rather than opening an unprotected pool', async () => {
  jest.resetModules(); Reflect.deleteProperty(navigator, 'locks');
  const { databaseAccess } = jest.requireActual<typeof import('../databaseAccess.web')>('../databaseAccess.web');
  await expect(databaseAccess()).rejects.toThrow(/Web Locks support/);
});
