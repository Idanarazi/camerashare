// PicMe's four looks. Peach is the default; the others are picked in Settings › Appearance.
// Every screen reads its colors from here, so a look is just a different set of these values.

export type ThemeId = 'golden' | 'peach' | 'dark' | 'sunset';

type RoleColors = { bg: string; fg: string; chip: string; border: string };
type Glow = { color: string; cx: number; cy: number; rx: number; ry: number; opacity: number }; // sizes as fractions of the screen

export type Palette = {
  id: ThemeId;
  name: string;
  mode: 'dark' | 'light';
  bg: string;
  glow: Glow[]; // soft light behind each screen
  surface: string; // cards
  surface2: string;
  surface3: string;
  line: string;
  lineStrong: string;
  text: string;
  text2: string;
  text3: string;
  primary: string; // main buttons
  onPrimary: string;
  accent: string; // highlights: chips, toggles, scan corners
  accentInk: string; // text on accent
  accentText: string; // accent used as text or icon (readable on the background)
  accentSoft: string;
  roles: { me: RoleColors; other: RoleColors; group: RoleColors }; // the three choices on Home
  arrowCircle: boolean; // ↗ in a dark circle on role cards (true) or a plain chevron (false)
  heart: string;
  wordmark: { text: string; brackets: string };
  veil: string;
  ok: string;
  danger: string;
  // over the live picture: always light-on-dark
  ovText: string;
  ovBg: string;
  ovLine: string;
  heartInk: string; // the heart drawn on top of a filled heart button
};

const INK = '#16131A';
const shared = { ok: '#1E9E46', danger: '#C4302B', ovText: '#F5F5F2', ovBg: 'rgba(0,0,0,0.5)', ovLine: 'rgba(255,255,255,0.18)' };
const lightBase = {
  mode: 'light' as const,
  surface: 'rgba(255,255,255,0.72)',
  surface2: 'rgba(22,19,26,0.06)',
  surface3: 'rgba(22,19,26,0.13)',
  line: 'rgba(22,19,26,0.08)',
  lineStrong: 'rgba(22,19,26,0.14)',
  text: INK,
  text2: 'rgba(22,19,26,0.74)',
  text3: 'rgba(22,19,26,0.6)',
  primary: INK,
  onPrimary: '#FFFFFF',
  arrowCircle: true,
  veil: 'rgba(255,246,236,0.93)',
  ...shared,
};

/** Golden hour — warm sunset glow, a candy color for each choice, black buttons. */
export const golden: Palette = {
  ...lightBase,
  id: 'golden',
  name: 'Golden hour',
  bg: '#FFF6EC',
  glow: [
    { color: '#FFD23F', cx: 0, cy: 0, rx: 1.1, ry: 0.32, opacity: 1 },
    { color: '#FF9EC4', cx: 1, cy: 0.02, rx: 0.9, ry: 0.3, opacity: 1 },
    { color: '#FFD9C2', cx: 0.5, cy: 1, rx: 1.2, ry: 0.3, opacity: 1 },
  ],
  accent: '#FFD23F',
  accentInk: INK,
  accentText: '#8A6500',
  accentSoft: 'rgba(255,210,63,0.3)',
  roles: {
    me: { bg: '#FFD23F', fg: INK, chip: 'rgba(255,255,255,0.55)', border: '#FFD23F' },
    other: { bg: '#FFB8D2', fg: INK, chip: 'rgba(255,255,255,0.55)', border: '#FFB8D2' },
    group: { bg: '#C9E6FF', fg: INK, chip: 'rgba(255,255,255,0.6)', border: '#C9E6FF' },
  },
  heart: '#FF4F8B',
  heartInk: '#FFFFFF',
  wordmark: { text: INK, brackets: '#F2A900' },
};

/** Peach — one color family: deep, mid and pale peach. Calm and grown-up. The default. */
export const peach: Palette = {
  ...lightBase,
  id: 'peach',
  name: 'Peach',
  bg: '#FFF6EE',
  glow: [
    { color: '#FFB98A', cx: 0.5, cy: 0.14, rx: 0.9, ry: 0.34, opacity: 0.75 },
    { color: '#CDBDFF', cx: 0, cy: 0, rx: 0.8, ry: 0.28, opacity: 0.6 },
    { color: '#FF9EC4', cx: 1, cy: 0, rx: 0.8, ry: 0.28, opacity: 0.55 },
  ],
  accent: '#FFAE85',
  accentInk: INK,
  accentText: '#A4501F',
  accentSoft: 'rgba(255,174,133,0.3)',
  roles: {
    me: { bg: '#FFAE85', fg: INK, chip: 'rgba(255,255,255,0.5)', border: '#FFAE85' },
    other: { bg: '#FFCDB2', fg: INK, chip: 'rgba(255,255,255,0.5)', border: '#FFCDB2' },
    group: { bg: '#FFE6D8', fg: INK, chip: 'rgba(255,255,255,0.65)', border: 'rgba(214,110,60,0.14)' },
  },
  heart: '#F2665A',
  heartInk: '#FFFFFF',
  wordmark: { text: INK, brackets: '#FF9A6B' },
};

/** Dark — the original PicMe look: near-black with sunshine yellow. */
export const dark: Palette = {
  id: 'dark',
  name: 'Dark',
  mode: 'dark',
  bg: '#0A0A0B',
  glow: [],
  surface: '#141416',
  surface2: '#1D1D20',
  surface3: '#28282C',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.18)',
  text: '#F5F5F2',
  text2: 'rgba(245,245,242,0.74)',
  text3: 'rgba(245,245,242,0.56)',
  primary: '#FFD23F',
  onPrimary: '#191400',
  accent: '#FFD23F',
  accentInk: '#191400',
  accentText: '#FFD23F',
  accentSoft: 'rgba(255,210,63,0.14)',
  roles: {
    me: { bg: '#FFD23F', fg: '#191400', chip: 'rgba(0,0,0,0.12)', border: '#FFD23F' },
    other: { bg: '#141416', fg: '#F5F5F2', chip: '#1D1D20', border: 'rgba(255,255,255,0.10)' },
    group: { bg: '#141416', fg: '#F5F5F2', chip: '#1D1D20', border: 'rgba(255,255,255,0.10)' },
  },
  arrowCircle: false,
  heart: '#FFD23F',
  heartInk: '#191400',
  wordmark: { text: '#F5F5F2', brackets: '#FFD23F' },
  veil: 'rgba(10,10,11,0.84)',
  ...shared,
  ok: '#30D158',
  danger: '#FF6961',
};

/** After sunset — Golden hour's night version: deep plum with a magenta and amber glow. */
export const sunset: Palette = {
  id: 'sunset',
  name: 'After sunset',
  mode: 'dark',
  bg: '#140F1C',
  glow: [
    { color: '#E89A3C', cx: 0, cy: 0, rx: 1.1, ry: 0.34, opacity: 0.45 },
    { color: '#D9467F', cx: 1, cy: 0.02, rx: 1, ry: 0.34, opacity: 0.5 },
    { color: '#6B2F8F', cx: 0.5, cy: 1, rx: 1.2, ry: 0.4, opacity: 0.55 },
  ],
  surface: 'rgba(255,255,255,0.08)',
  surface2: 'rgba(255,255,255,0.10)',
  surface3: 'rgba(255,255,255,0.18)',
  line: 'rgba(255,255,255,0.12)',
  lineStrong: 'rgba(255,255,255,0.2)',
  text: '#FBF6F0',
  text2: 'rgba(251,246,240,0.76)',
  text3: 'rgba(251,246,240,0.6)',
  primary: '#FBF6F0',
  onPrimary: INK,
  accent: '#FFD23F',
  accentInk: INK,
  accentText: '#FFD23F',
  accentSoft: 'rgba(255,210,63,0.16)',
  roles: {
    me: { bg: '#FFD23F', fg: INK, chip: 'rgba(255,255,255,0.55)', border: '#FFD23F' },
    other: { bg: '#FFB8D2', fg: INK, chip: 'rgba(255,255,255,0.55)', border: '#FFB8D2' },
    group: { bg: '#C9E6FF', fg: INK, chip: 'rgba(255,255,255,0.6)', border: '#C9E6FF' },
  },
  arrowCircle: true,
  heart: '#FF4F8B',
  heartInk: '#FFFFFF',
  wordmark: { text: '#FBF6F0', brackets: '#FFD23F' },
  veil: 'rgba(20,15,28,0.9)',
  ...shared,
  ok: '#30D158',
  danger: '#FF6961',
};

export const THEMES: Record<ThemeId, Palette> = { golden, peach, dark, sunset };
export const THEME_ORDER: ThemeId[] = ['peach', 'golden', 'dark', 'sunset'];

// Type: SF Pro on iPhone (the system font), heavy and tight for headlines.
// SF Pro already adjusts its own letter spacing for each size, so headlines get only a light extra squeeze.
export const type = {
  display: (size: number) => ({ fontSize: size, fontWeight: '800' as const, letterSpacing: -0.012 * size, lineHeight: Math.round(size * 1.1) }),
};

// The "sunset by the lake" placeholder photo used across the app.
export const sceneColors = ['#1b2542', '#3a3b62', '#c9805a', '#1c3342', '#12212b'] as const;
export const sceneStops = [0, 0.4, 0.6, 0.61, 1] as const;

// The PicMe server both phones meet on (the same one the website uses).
export const SERVER = process.env.EXPO_PUBLIC_SERVER || 'https://picme-hq53.onrender.com';
export const WEBSITE = SERVER;
