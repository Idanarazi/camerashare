// The two-phone story from the website: you swipe, they move, the photo lands on your phone instantly.
// Left phone = you (directing). Right phone = the person holding the camera.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Icon } from './icon';
import { useTheme } from '@/lib/settings';
import { sceneColors, sceneStops } from '@/lib/theme';

const PW = 132, PH = 238, GAP = 46, LOOP = 6000;
const SW = PW - 12, SH = PH - 12; // inner screen

// Keyframes copied from the design's CSS (fractions of the 6-second loop).
const range = (t: Animated.Value, input: number[], output: number[]) =>
  t.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });

function World({ t, still }: { t: Animated.Value; still: boolean }) {
  const pan = still ? -30 : range(t, [0, 0.36, 0.54, 0.94, 1], [0, 0, -30, -30, 0]);
  return (
    <Animated.View style={[styles.world, { transform: [{ translateX: pan }] }]}>
      <LinearGradient colors={sceneColors} locations={sceneStops} style={StyleSheet.absoluteFill} />
      <View style={styles.sun} />
      <View style={styles.person}>
        <View style={styles.head} />
        <View style={styles.body} />
      </View>
    </Animated.View>
  );
}

export function WelcomeDemo() {
  const t = useTheme();
  const tv = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        setStill(true);
        return;
      }
      loop = Animated.loop(Animated.timing(tv, { toValue: 1, duration: LOOP, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    });
    return () => loop?.stop();
  }, [tv]);

  const op = (input: number[], output: number[]) => (still ? 1 : range(tv, input, output));
  const fingerX = range(tv, [0, 0.14, 0.27, 1], [0, 0, 56, 56]);
  const flash = still ? 0 : range(tv, [0, 0.69, 0.7, 0.76, 1], [0, 0, 0.75, 0, 0]);
  const thumbScale = range(tv, [0, 0.8, 0.83, 0.86, 1], [0.6, 0.6, 1.2, 1, 1]);
  const flyX = range(tv, [0, 0.74, 0.81, 1], [89, 89, -125, -125]);
  const flyY = range(tv, [0, 0.74, 0.81, 1], [119, 119, 208, 208]);
  const flyS = range(tv, [0, 0.7, 0.72, 0.74, 0.81, 1], [0.6, 0.6, 1.15, 1, 0.6, 0.6]);
  const instantY = range(tv, [0, 0.71, 0.74, 1], [6, 6, 0, 0]);

  return (
    <View style={styles.demo} accessible accessibilityLabel="You swipe on your phone, they move the camera, and the photo lands on your phone instantly.">
      {/* You: directing */}
      <View style={styles.mini}>
        <View style={styles.screen}>
          <World t={tv} still={still} />
          {!still && <Animated.View style={[styles.finger, { opacity: op([0, 0.11, 0.14, 0.27, 0.32, 1], [0, 0, 1, 1, 0, 0]), transform: [{ translateX: fingerX }] }]} />}
          <Animated.View style={[styles.sent, { backgroundColor: t.accent, opacity: op([0, 0.26, 0.28, 0.48, 0.52, 1], [0, 0, 1, 1, 0, 0]) }]}>
            <Text style={[styles.sentText, { color: t.accentInk }]}>Sent: Move right</Text>
          </Animated.View>
          <Animated.View style={[styles.thumb, { opacity: op([0, 0.8, 0.83, 0.92, 0.96, 1], [0, 0, 1, 1, 0, 0]), transform: [{ scale: still ? 1 : thumbScale }] }]}>
            <LinearGradient colors={['#3a3b62', '#c9805a', '#1c3342']} locations={[0, 0.55, 0.56]} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flash }]} />
        </View>
      </View>

      {/* Them: holding the camera */}
      <View style={styles.mini}>
        <View style={styles.screen}>
          <World t={tv} still={still} />
          <Animated.View style={[styles.cue, { opacity: op([0, 0.33, 0.36, 0.52, 0.57, 1], [0, 0, 1, 1, 0, 0]) }]}>
            <LinearGradient colors={['rgba(255,210,63,0.42)', 'rgba(255,210,63,0)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
            <Icon name="chev" size={24} strokeWidth={3} color="#FFD23F" />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flash }]} />
        </View>
      </View>

      {/* The photo flying back to you */}
      {!still && (
        <Animated.View
          pointerEvents="none"
          style={[styles.fly, { borderColor: t.text, opacity: range(tv, [0, 0.7, 0.72, 0.81, 0.83, 1], [0, 0, 1, 1, 0, 0]), transform: [{ translateX: flyX }, { translateY: flyY }, { scale: flyS }] }]}>
          <LinearGradient colors={['#3a3b62', '#c9805a', '#1c3342']} locations={[0, 0.55, 0.56]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
      <Animated.View
        pointerEvents="none"
        style={[styles.instant, { backgroundColor: t.text, opacity: op([0, 0.71, 0.74, 0.92, 0.96, 1], [0, 0, 1, 1, 0, 0]), transform: [{ translateY: still ? 0 : instantY }] }]}>
        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#C99A00" /></Svg>
        <Text style={[styles.instantText, { color: t.bg }]}>Instantly on your phone</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  demo: { flexDirection: 'row', justifyContent: 'center', gap: GAP, height: PH },
  mini: { width: PW, height: PH, borderRadius: 26, backgroundColor: '#1c1c20', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', padding: 5, shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 20, shadowOffset: { width: 0, height: 18 } },
  screen: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  world: { position: 'absolute', top: 0, bottom: 0, left: -0.4 * SW, width: 1.8 * SW },
  sun: { position: 'absolute', left: '41%', top: SH * 0.53 - 12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#f2b36f', opacity: 0.85 },
  person: { position: 'absolute', left: 0.9 * SW + 30 - 17, bottom: SH * 0.14, width: 34, alignItems: 'center' },
  head: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#0a0c11', marginBottom: 2 },
  body: { width: 34, height: 50, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: '#0a0c11' },
  finger: { position: 'absolute', top: SH * 0.46 - 11, left: SW * 0.2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(245,245,242,0.9)', borderWidth: 4, borderColor: 'rgba(245,245,242,0.25)' },
  sent: { position: 'absolute', top: 14, alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sentText: { fontSize: 9.5, fontWeight: '800' },
  thumb: { position: 'absolute', bottom: 12, left: 12, width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: '#F5F5F2', overflow: 'hidden' },
  cue: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '55%', alignItems: 'flex-end', justifyContent: 'center', paddingRight: 6 },
  fly: { position: 'absolute', left: '50%', top: 0, width: 34, height: 27, marginLeft: -17, marginTop: -13, borderRadius: 4, borderWidth: 2, overflow: 'hidden', shadowColor: '#FFD23F', shadowOpacity: 0.75, shadowRadius: 7 },
  instant: { position: 'absolute', top: 58, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingLeft: 8, paddingRight: 10, borderRadius: 999 },
  instantText: { fontSize: 11.5, fontWeight: '800' },
});
