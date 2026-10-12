// Home before your first shoot: a living stack of photos that invites a tap to see a sample shoot.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Icon } from './icon';
import { Press } from './ui';
import { useReducedMotion } from '@/lib/motion';
import { useTheme } from '@/lib/settings';
import { SAMPLE_COVERS } from '@/lib/samples';

const CW = 104, CH = 138; // one photo card, 3:4
const TILT = [-9, 8, 0]; // back-left, back-right, front

export function ShootInvite() {
  const t = useTheme();
  const [i, setI] = useState(0);
  const pop = useRef(new Animated.Value(1)).current;
  const n = SAMPLE_COVERS.length;
  const still = useReducedMotion();

  useEffect(() => {
    if (still) return; // Reduce Motion: a calm, still stack
    const id = setInterval(() => {
      // Front photo lifts away, the next one settles into its place.
      Animated.timing(pop, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        setI((v) => (v + 1) % n);
        pop.setValue(0.6);
        // Critically damped: settles without wobbling (no flick caused this, so no bounce).
        Animated.spring(pop, { toValue: 1, stiffness: 220, damping: 30, mass: 1, useNativeDriver: true }).start();
      });
    }, 2600);
    return () => clearInterval(id);
  }, [pop, n, still]);

  const card = (slot: number) => {
    const photo = SAMPLE_COVERS[(i + 2 - slot + n) % n];
    const front = slot === 2;
    const style = front
      ? {
          opacity: pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.9, 1] }),
          transform: [
            { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
            { rotate: `${TILT[slot]}deg` },
            { scale: pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1.04, 0.94, 1] }) },
          ],
        }
      : { transform: [{ translateX: slot === 0 ? -34 : 34 }, { translateY: 6 }, { rotate: `${TILT[slot]}deg` }, { scale: 0.92 }] };
    return (
      <Animated.View key={slot} style={[styles.card, style]}>
        <View style={[styles.cardInner, { borderColor: t.mode === 'light' ? '#FFFFFF' : t.surface3 }]}>
          <Image source={photo.src} style={StyleSheet.absoluteFill} contentFit="cover" transition={front ? 0 : 200} />
          {front && (
            <View style={styles.heart}>
              <Icon name="heart" size={14} color="#FFD23F" fill="#FFD23F" strokeWidth={1.5} />
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <Press
      onPress={() => router.push('/sample')}
      accessibilityRole="button"
      accessibilityLabel="Your first shoot lands here. Tap to see a sample shoot."
      style={[styles.wrap, { backgroundColor: t.surface, borderColor: t.line }]}>
      <View style={styles.stack}>{[0, 1, 2].map(card)}</View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: t.text }}>Your first shoot lands here</Text>
        <Text style={{ fontSize: 14.5, color: t.text2, textAlign: 'center', lineHeight: 20, maxWidth: 290 }}>
          Every photo they take shows up on your phone instantly, and stays here.
        </Text>
      </View>
      <View style={[styles.cta, { backgroundColor: t.accentSoft }]}>
        <Text style={{ color: t.accentText, fontWeight: '700', fontSize: 15 }}>See a sample shoot</Text>
        <Icon name="chev" size={18} color={t.accentText} strokeWidth={2.5} />
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 16, paddingTop: 26, paddingBottom: 20, paddingHorizontal: 18, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  stack: { width: CW + 80, height: CH + 16, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', width: CW, height: CH, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  cardInner: { flex: 1, borderRadius: 14, borderWidth: 3, overflow: 'hidden', backgroundColor: '#222' },
  heart: { position: 'absolute', left: 7, bottom: 7, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 16, paddingRight: 12, minHeight: 40, paddingVertical: 8, borderRadius: 20 },
});
