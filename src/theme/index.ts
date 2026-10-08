import { useColorScheme } from 'react-native';

import type { Bucket } from '@/lib/stats.ts';

export interface Theme {
  scheme: 'dark' | 'light';
  background: string;
  card: string;
  cardRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  /** Bar colour for Saturday/Sunday, distinct from the weekday `accent`. */
  weekend: string;
  onAccent: string;
  danger: string;
  bucket: Record<Bucket, string>;
}

const dark: Theme = {
  scheme: 'dark',
  background: '#0B1215',
  card: '#121C20',
  cardRaised: '#1A262B',
  border: '#22323A',
  text: '#E8F1F2',
  textMuted: '#8FA3AB',
  textFaint: '#5E727A',
  accent: '#2DD4BF',
  accentSoft: 'rgba(45, 212, 191, 0.14)',
  weekend: '#A78BFA',
  onAccent: '#04201C',
  danger: '#FB7185',
  bucket: {
    unlogged: '#1B282E',
    // Validated for colour-vision deficiency separation against `card` (dataviz validator).
    sober: '#12A57A',
    low: '#3B8BEB',
    moderate: '#E8820C',
    heavy: '#E23A6A',
  },
};

const light: Theme = {
  scheme: 'light',
  background: '#F3F7F7',
  card: '#FFFFFF',
  cardRaised: '#EEF3F4',
  border: '#DDE6E8',
  text: '#0B1A1F',
  textMuted: '#56686F',
  textFaint: '#8A9AA0',
  accent: '#0D9488',
  accentSoft: 'rgba(13, 148, 136, 0.12)',
  weekend: '#7C3AED',
  onAccent: '#FFFFFF',
  danger: '#E11D48',
  bucket: {
    unlogged: '#E4ECEE',
    sober: '#0E9F6E',
    low: '#2563EB',
    moderate: '#EA6A0A',
    heavy: '#E11D48',
  },
};
export function useTheme(): Theme {
  return useColorScheme() === 'light' ? light : dark;
}

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
