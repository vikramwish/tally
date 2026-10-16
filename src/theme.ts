import { Platform } from 'react-native';

/** Paradion dark theme tokens. */
export const c = {
  bg: '#0B0D10',
  surface: '#121519',
  sunken: '#07080A',
  inverse: '#F7F8F9',
  ink: '#F7F8F9',
  ink2: '#C9CED6',
  muted: '#8D95A1',
  inkInverse: '#0B0D10',
  border: '#262A31',
  borderStrong: '#F7F8F9',
  ember: '#FF5A1F',
  onEmber: '#0B0D10',
  emberText: '#FF7A45',
  dawn: '#3B1F14',
  ok: '#4ADE80',
  info: '#7AA2FF',
  warn: '#FACC15',
  critical: '#F87171',
  // light-surface text for the inverse card
  inkOnLight: '#0B0D10',
  mutedOnLight: '#5B626D',
  borderOnLight: '#DDE0E4',
  emberOnLight: '#C2410C',
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;
export const radius = { sm: 2, md: 4, lg: 8 } as const;

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const type = {
  h1: { fontSize: 34, fontWeight: '600' as const, letterSpacing: -0.8, color: c.ink },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3, color: c.ink },
  h3: { fontSize: 17, fontWeight: '600' as const, color: c.ink },
  body: { fontSize: 16, color: c.ink },
  bodySm: { fontSize: 14, color: c.ink2 },
  label: { fontFamily: mono, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' as const, color: c.muted, fontWeight: '500' as const },
  button: { fontFamily: mono, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' as const, fontWeight: '600' as const },
  data: { fontFamily: mono, fontSize: 14, color: c.ink, fontVariant: ['tabular-nums' as const] },
  figure: { fontSize: 32, fontWeight: '500' as const, letterSpacing: -1, color: c.ink, fontVariant: ['tabular-nums' as const] },
};

export const SET_TYPE_STYLE = {
  normal: { short: '', color: c.ink },
  warmup: { short: 'W', color: c.info },
  drop: { short: 'D', color: c.warn },
  failure: { short: 'F', color: c.critical },
} as const;
