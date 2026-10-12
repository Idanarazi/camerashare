// App-wide settings, saved on the phone. Also decides dark or bright.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, Palette } from './theme';

export type Appearance = 'auto' | 'dark' | 'light';

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
  appearance: 'auto',
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
  const system = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
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

  const mode = settings.appearance === 'auto' ? (system === 'light' ? 'light' : 'dark') : settings.appearance;
  const t = mode === 'light' ? light : dark;

  const value = useMemo(() => ({ loaded, settings, set, t }), [loaded, settings, set, t]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}

export const useTheme = () => useSettings().t;
