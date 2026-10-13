// A top bar that floats over scrolling content. It's invisible at rest and turns into a frosted
// material only once content scrolls underneath it, so there's never a hard divider line.
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from './glass';
import { useTheme } from '@/lib/settings';

export function useScrollEdge() {
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  return { y, onScroll };
}

export function useTopBarHeight() {
  const insets = useSafeAreaInsets();
  return insets.top + 6 + 44 + 10;
}

export function TopBar({ y, left, center, right }: { y: SharedValue<number>; left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const material = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 24], [0, 1], 'clamp') }));
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, material]} pointerEvents="none">
        <Glass tone={t.mode === 'light' ? 'light' : 'dark'} intensity={60} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.row} pointerEvents="box-none">
        <View style={styles.side}>{left}</View>
        <View style={styles.center}>{center}</View>
        <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, top: 0, paddingBottom: 10, paddingHorizontal: 16, zIndex: 10 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  side: { minWidth: 88, maxWidth: 120 },
  center: { flex: 1, alignItems: 'center' },
});
