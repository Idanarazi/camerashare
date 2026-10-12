// PicMe's colors, in dark and bright. Same tokens as the website's theme.css and the app design.

export type Palette = {
  mode: 'dark' | 'light';
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  lineStrong: string;
  text: string;
  text2: string;
  text3: string;
  accent: string; // fills: buttons, highlights
  accentInk: string; // text on yellow
  accentText: string; // yellow used as text or icon
  accentSoft: string;
  veil: string;
  ok: string;
  danger: string;
  // over the live picture: always light-on-dark, in both modes
  ovText: string;
  ovBg: string;
  ovLine: string;
};

export const dark: Palette = {
  mode: 'dark',
  bg: '#0A0A0B',
  surface: '#141416',
  surface2: '#1D1D20',
  surface3: '#28282C',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.18)',
  text: '#F5F5F2',
  text2: 'rgba(245,245,242,0.74)',
  text3: 'rgba(245,245,242,0.56)',
  accent: '#FFD23F',
  accentInk: '#191400',
  accentText: '#FFD23F',
  accentSoft: 'rgba(255,210,63,0.14)',
  veil: 'rgba(10,10,11,0.84)',
  ok: '#30D158',
  danger: '#FF6961',
  ovText: '#F5F5F2',
  ovBg: 'rgba(0,0,0,0.5)',
  ovLine: 'rgba(255,255,255,0.18)',
};

export const light: Palette = {
  ...dark,
  mode: 'light',
  bg: '#F7F6F1',
  surface: '#FFFFFF',
  surface2: '#EFEEE8',
  surface3: '#E2E1DA',
  line: 'rgba(20,20,22,0.10)',
  lineStrong: 'rgba(20,20,22,0.16)',
  text: '#141416',
  text2: 'rgba(20,20,22,0.72)',
  text3: 'rgba(20,20,22,0.60)',
  accentText: '#8A6500',
  accentSoft: 'rgba(255,210,63,0.24)',
  veil: 'rgba(247,246,241,0.93)',
  ok: '#1E9E46',
  danger: '#C4302B',
};

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
