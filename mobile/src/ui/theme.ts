import type { ColorSchemeName } from 'react-native';

const light = {
  background: '#F8F8FB',
  surface: '#FFFFFF',
  text: '#2C2C2E',
  muted: '#69696F',
  primary: '#FF6B50',
  accent: '#B43F2A',
  accentSoft: '#FFEBE8',
};

export type AppTheme = typeof light;

const dark: AppTheme = {
  background: '#19191C',
  surface: '#252528',
  text: '#F7F5F3',
  muted: '#B7B3B5',
  primary: '#FF6B50',
  accent: '#FFAB98',
  accentSoft: '#452C28',
};

export function getTheme(scheme: ColorSchemeName): AppTheme {
  return scheme === 'dark' ? dark : light;
}

export const fonts = {
  medium: 'Recursive-Medium',
  bold: 'Recursive-Bold',
} as const;
