import type { ColorSchemeName } from 'react-native';

const light = {
  scheme: 'light' as 'light' | 'dark',
  background: '#F6F6F8',
  surface: '#FFFFFF',
  text: '#2C2C2E',
  muted: '#69696F',
  primary: '#FF6B50',
  accent: '#B43F2A',
  accentSoft: '#FFEBE8',
  soft: '#F2F2F5',
  border: '#E7E7EB',
  info: '#315F9C',
  infoSoft: '#EAF0FA',
  infoBorder: '#BDCEE5',
  success: '#28734E',
  successSoft: '#EAF5ED',
  successBorder: '#BDD8C6',
  danger: '#B13D43',
  dangerSoft: '#FCF0F0',
};

export type AppTheme = typeof light;

const dark: AppTheme = {
  scheme: 'dark',
  background: '#19191C',
  surface: '#252528',
  text: '#F7F5F3',
  muted: '#B7B3B5',
  primary: '#FF6B50',
  accent: '#FFAB98',
  accentSoft: '#452C28',
  soft: '#2D3037',
  border: '#373B43',
  info: '#A5C9FA',
  infoSoft: '#25334A',
  infoBorder: '#456181',
  success: '#96D3AC',
  successSoft: '#22372D',
  successBorder: '#456D54',
  danger: '#F2A1A6',
  dangerSoft: '#402B32',
};

export function getTheme(scheme: ColorSchemeName | null): AppTheme {
  return scheme === 'dark' ? dark : light;
}

export const fonts = {
  medium: 'Recursive-Medium',
  bold: 'Recursive-Bold',
} as const;
