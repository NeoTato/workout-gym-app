export const appearanceOptions = ['system', 'light', 'dark'] as const;
export type AppearancePreference = typeof appearanceOptions[number];
export function isAppearance(value: unknown): value is AppearancePreference {
  return typeof value === 'string' && appearanceOptions.some(option => option === value);
}
