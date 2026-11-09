import { newRestState, startRest, restRemaining, pauseRest, resumeRest, extendRest, validateRestState, customRestSeconds } from '../restTimer';

test('rest tracks deadlines across background time, pauses exactly, resumes and extends without negative countdowns', () => {
  const state = startRest(newRestState('workout'), 'Press / set 1', 1000, 'timer');
  expect(restRemaining(state.timer, 31000)).toBe(60000);
  const paused = pauseRest(state, 31500); expect(restRemaining(paused.timer, 999999)).toBe(59500);
  const resumed = resumeRest(paused, 100000); expect(restRemaining(resumed.timer, 110000)).toBe(49500);
  expect(restRemaining(extendRest(resumed, 110000).timer, 110000)).toBe(79500);
  expect(restRemaining(state.timer, 999999)).toBe(0);
});
test('custom rest input uses minutes and seconds and rejects ambiguous/invalid values', () => {
  expect(customRestSeconds('1', '30')).toBe(90);
  for (const values of [['', ''], ['0', '0'], ['1.5', '0'], ['1', '60'], ['-1', '0'], ['61', '0']]) expect(() => customRestSeconds(...values as [string, string])).toThrow();
});
test('persisted rest validates identity and numeric bounds without accepting arbitrary checkpoint fields', () => {
  const state = startRest(newRestState('workout'), 'Plank', 1000, 'timer');
  expect(validateRestState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  expect(() => validateRestState({ ...state, seconds: 0 })).toThrow();
  expect(() => validateRestState({ ...state, extra: 'ignored' })).toThrow();
  expect(() => validateRestState({ ...state, timer: { ...state.timer, endsAt: Infinity } })).toThrow();
});
