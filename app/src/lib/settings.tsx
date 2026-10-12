// App-wide settings, saved on the phone. Also decides which of the four looks is used.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Palette, THEMES, ThemeId } from './theme';

export type Appearance = ThemeId;

export type Settings = {
  onboarded: boolean;
  appearance: Appearance;
  beeps: boolean;
  grid: boolean;
  burst: 3 | 5 | 10;
  autoSave: boolean;
  demoShoots: boolean; // preview build only: fill Home with sample shoots
};

const DEFAULTS: Settings = {
  onboarded: false,
  appearance: 'peach',
  beeps: true,
  grid: false,
  burst: 5,
  autoSave: false,
  demoShoots: false,
};

const KEY = 'picme.settings.v1';

type Ctx = {
  loaded: boolean;
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  t: Palette;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        // Older builds saved 'auto' | 'light' | 'dark'. Keep Dark, move everyone else to Peach.
        if (!(saved.appearance in THEMES)) saved.appearance = saved.appearance === 'dark' ? 'dark' : 'peach';
        setSettings({ ...DEFAULTS, ...saved });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const t = THEMES[settings.appearance] ?? THEMES.peach;

  const value = useMemo(() => ({ loaded, settings, set, t }), [loaded, settings, set, t]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}

export const useTheme = () => useSettings().t;
