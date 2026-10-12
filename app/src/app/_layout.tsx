import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SettingsProvider, useSettings } from '@/lib/settings';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { loaded, t } = useSettings();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  const base = t.mode === 'light' ? DefaultTheme : DarkTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: t.bg, card: t.bg, text: t.text, primary: t.accentText, border: t.line } }}>
      <StatusBar style={t.mode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="sample" />
        <Stack.Screen name="scan" options={{ animation: 'fade' }} />
        <Stack.Screen name="join" options={{ gestureEnabled: false }} />
        <Stack.Screen name="camera" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
