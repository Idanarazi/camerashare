// Shared building blocks, styled to match the PicMe app design.
import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, IconName } from './icon';
import { spring, useReducedMotion } from '@/lib/motion';
import { useTheme } from '@/lib/settings';
import { type } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Anything tappable. Responds the instant a finger lands (not on release): it springs down to 97%
 * and dims a touch, then springs back. Interruptible, so quick taps never stutter.
 */
export function Press({ style, children, onPressIn, onPressOut, pressScale = 0.97, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode; pressScale?: number }) {
  const down = useSharedValue(0);
  const still = useReducedMotion();
  const anim = useAnimatedStyle(() => ({
    opacity: 1 - down.value * 0.12,
    transform: [{ scale: still ? 1 : 1 - down.value * (1 - pressScale) }],
  }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        down.value = withSpring(1, spring.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        down.value = withSpring(0, spring.ui);
        onPressOut?.(e);
      }}
      style={[style, anim]}>
      {children}
    </AnimatedPressable>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  const t = useTheme();
  const base = { ...type.display(size), lineHeight: size * 1.15, color: t.text };
  if (t.mode === 'light') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="header" accessibilityLabel="PicMe">
        <Text style={base}>Pic</Text>
        <View style={{ backgroundColor: t.accent, borderRadius: size * 0.14, paddingHorizontal: size * 0.06, marginLeft: size * 0.02 }}>
          <Text style={[base, { color: t.accentInk }]}>Me</Text>
        </View>
      </View>
    );
  }
  return (
    <Text style={base} accessibilityRole="header" accessibilityLabel="PicMe">
      Pic<Text style={{ color: t.accentText }}>Me</Text>
    </Text>
  );
}

export function Button({ label, onPress, kind = 'primary', icon }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost'; icon?: IconName }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'secondary' ? t.surface2 : 'transparent';
  const fg = kind === 'primary' ? t.accentInk : kind === 'secondary' ? t.text : t.text2;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.btn, { backgroundColor: bg, minHeight: kind === 'ghost' ? 44 : 54, borderColor: kind === 'secondary' ? t.line : 'transparent' }]}>
      {icon && <Icon name={icon} size={20} color={fg} />}
      <Text style={{ color: fg, fontSize: 17, fontWeight: kind === 'ghost' ? '600' : '700' }}>{label}</Text>
    </Press>
  );
}

export function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.round, { backgroundColor: t.surface2, borderColor: t.line }]}>
      <Icon name={icon} size={21} color={t.text} />
    </Press>
  );
}

export function RoleCard({ icon, name, desc, primary, compact, onPress }: { icon: IconName; name: string; desc: string; primary?: boolean; compact?: boolean; onPress: () => void }) {
  const t = useTheme();
  const fg = primary ? t.accentInk : t.text;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${desc}`}
      style={[
        styles.role,
        compact && styles.roleCompact,
        { backgroundColor: primary ? t.accent : t.surface, borderColor: primary ? t.accent : t.line },
      ]}>
      <View style={[styles.ri, compact && styles.riCompact, { backgroundColor: primary ? 'rgba(0,0,0,0.12)' : t.surface2 }]}>
        <Icon name={icon} size={24} color={compact ? t.accentText : fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: fg, fontSize: compact ? 16.5 : 20, fontWeight: '700', letterSpacing: compact ? 0 : -0.2 }}>{name}</Text>
        <Text style={{ color: fg, opacity: 0.75, fontSize: compact ? 13.5 : 14.5, marginTop: 2, lineHeight: compact ? 18 : 19 }}>{desc}</Text>
      </View>
      <View style={{ opacity: 0.6 }}>
        <Icon name="chev" size={24} color={fg} />
      </View>
    </Press>
  );
}

export function Dots({ count, index }: { count: number; index: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 7, justifyContent: 'center' }} accessibilityLabel={`Step ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? t.accentText : t.surface3 }} />
      ))}
    </View>
  );
}

export function Group({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View>
      <Text style={{ fontSize: 13, color: t.text3, paddingHorizontal: 6, paddingBottom: 6 }}>{label}</Text>
      <View style={{ borderRadius: 18, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line, overflow: 'hidden' }}>
        {items.map((child, i) => (
          <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line } : undefined}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

export function Row({ icon, label, note, right, onPress }: { icon?: IconName; label: string; note?: string; right?: ReactNode; onPress?: () => void }) {
  const t = useTheme();
  const body = (
    <View style={styles.row}>
      {icon && <Icon name={icon} size={22} color={t.text2} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: t.text }}>{label}</Text>
        {note && <Text style={{ fontSize: 13, color: t.text3, marginTop: 1 }}>{note}</Text>}
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} accessibilityRole="button">
      {body}
    </Press>
  ) : (
    body
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface2, borderRadius: 10, padding: 2 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            hitSlop={{ top: 8, bottom: 8 }}
            style={[
              { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
              on && { backgroundColor: t.mode === 'light' ? t.surface : t.surface3 },
              on && t.mode === 'light' && styles.segShadow,
            ]}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: on ? t.text : t.text2 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1, alignSelf: 'stretch' },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  role: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1 },
  roleCompact: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, gap: 14 },
  ri: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  riCompact: { width: 40, height: 40, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingHorizontal: 16, paddingVertical: 10 },
  segShadow: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
