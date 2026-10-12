// Shared pieces for the pairing screens: a centered message with an icon, and a top bar.
import { ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from './backdrop';
import { Icon, IconName } from './icon';
import { RoundButton } from './ui';
import { useReducedMotion } from '@/lib/motion';
import { useTheme } from '@/lib/settings';
import { type } from '@/lib/theme';

export function Screen({ children, onHome, homeLabel = 'Home', homeIcon = 'home' }: { children: ReactNode; onHome: () => void; homeLabel?: string; homeIcon?: IconName }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 24 }}>
      <Backdrop />
      <View style={{ paddingHorizontal: 16, flexDirection: 'row' }}>
        <RoundButton icon={homeIcon} label={homeLabel} onPress={onHome} />
      </View>
      {children}
    </View>
  );
}

export function Message({ icon, title, body, busy, tone = 'normal', children }: {
  icon?: IconName;
  title: string;
  body?: string;
  busy?: boolean;
  tone?: 'normal' | 'good' | 'bad';
  children?: ReactNode;
}) {
  const t = useTheme();
  const bg = tone === 'good' ? 'rgba(48,209,88,0.16)' : tone === 'bad' ? 'rgba(255,105,97,0.16)' : t.accentSoft;
  const fg = tone === 'good' ? t.ok : tone === 'bad' ? t.danger : t.accentText;
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={[styles.badge, { backgroundColor: bg }]}>
        {busy ? <ActivityIndicator color={fg} size="large" /> : icon ? <Icon name={icon} size={38} strokeWidth={1.9} color={fg} /> : null}
      </View>
      <Text style={[type.display(26), { color: t.text, textAlign: 'center', lineHeight: 30 }]} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={{ color: t.text2, fontSize: 16, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}>{body}</Text> : null}
      {children}
    </View>
  );
}

/** A small pulsing dot, for "waiting" moments. */
export function Pulse({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const still = useReducedMotion();
  useEffect(() => {
    if (still) return;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v, still]);
  return (
    <View style={{ width: 10, height: 10 }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 5, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 5, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  badge: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
