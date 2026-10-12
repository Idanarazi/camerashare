// The directing phone once connected: you're in the photo, guiding the person holding the camera.
// Swipe the picture to steer them, pinch for closer / step back, double-tap for "Hold it",
// or use the buttons. The shutter starts a 3-second countdown on both phones.
// Live video arrives with the next build; until then the picture area says so, and everything else works.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from './glass';
import { Icon, IconName } from './icon';
import { Press } from './ui';
import { Command, COUNTDOWN, SENT_LABEL, Steer, SWIPE_MIN } from '@/lib/directing';
import { haptic } from '@/lib/motion';
import type { Mode } from '@/lib/room-client';
import { useSettings } from '@/lib/settings';
import { countdownBeep } from '@/lib/sounds';
import { sceneColors, sceneStops } from '@/lib/theme';

const HINT_KEY = 'picme.gestures.learned';
const WHITE = '#F5F5F2';

export function DirectorView({ mode, partnerAway, send, onLeave }: {
  mode: Mode;
  partnerAway: boolean;
  send: (command: Command, data?: object) => boolean;
  onLeave: () => void;
}) {
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const tripod = mode === 'tripod';
  const [sent, setSent] = useState<{ label: string; n: number } | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [hint, setHint] = useState(false);
  const flash = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sentCount = useRef(0);

  useEffect(() => {
    if (tripod) return;
    AsyncStorage.getItem(HINT_KEY)
      .then((v) => setHint(!v))
      .catch(() => setHint(true));
  }, [tripod]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const say = (text: string) => {
    setToast(text);
    later(() => setToast((cur) => (cur === text ? null : cur)), 2600);
  };

  const learned = () => {
    if (!hint) return;
    setHint(false);
    AsyncStorage.setItem(HINT_KEY, '1').catch(() => {});
  };

  const guide = (cmd: Steer) => {
    if (tripod || partnerAway || count !== null) return;
    if (!send(cmd)) return say('Reconnecting, try again in a second');
    haptic.light();
    const n = ++sentCount.current;
    setSent({ label: SENT_LABEL[cmd], n });
    later(() => setSent((s) => (s?.n === n ? null : s)), 1100);
    learned();
  };

  const shoot = () => {
    if (partnerAway || count !== null) return;
    if (!send('start-capture')) return say('Reconnecting, try again in a second');
    learned();
    let n = COUNTDOWN;
    setCount(n);
    haptic.light();
    if (settings.beeps) countdownBeep(false);
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        haptic.light();
        if (settings.beeps) countdownBeep(false);
        later(tick, 1000);
        return;
      }
      setCount(null);
      flash.value = withSequence(withTiming(0.85, { duration: 60 }), withTiming(0, { duration: 380 }));
      haptic.success();
      if (settings.beeps) countdownBeep(true);
      later(() => say('Photos taken! They’re on their phone for now.'), 700);
    };
    later(tick, 1000);
  };

  const toggleTorch = () => {
    if (partnerAway) return;
    const next = !torch;
    if (!send('torch', { on: next })) return say('Reconnecting, try again in a second');
    haptic.light();
    setTorch(next);
  };

  // Gestures on the picture: swipe = direction, pinch = closer / step back, double-tap = Hold it.
  const fired = useRef(false);
  const pan = Gesture.Pan()
    .runOnJS(true)
    .maxPointers(1)
    .onStart(() => {
      fired.current = false;
    })
    .onUpdate((e) => {
      if (fired.current) return;
      const { translationX: dx, translationY: dy } = e;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
      fired.current = true;
      guide(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'move-left' : 'move-right') : dy < 0 ? 'move-up' : 'move-down');
    });
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      fired.current = false;
    })
    .onUpdate((e) => {
      if (fired.current) return;
      if (e.scale > 1.3) {
        fired.current = true;
        guide('move-closer');
      } else if (e.scale < 0.77) {
        fired.current = true;
        guide('step-back');
      }
    });
  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd((_e, ok) => {
      if (ok) guide('hold');
    });
  const gestures = Gesture.Simultaneous(Gesture.Race(pinch, pan), doubleTap);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const live = !partnerAway;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* The picture. Live video takes this spot in the next build. */}
      <GestureDetector gesture={gestures}>
        <View style={StyleSheet.absoluteFill} accessibilityLabel="Their camera. Swipe to guide them.">
          <LinearGradient colors={sceneColors} locations={sceneStops} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} />
          <View style={[styles.placeholder, { opacity: count === null ? 1 : 0 }]} pointerEvents="none">
            <Glass style={styles.placeholderCard}>
              <Icon name="cam" size={30} color={WHITE} strokeWidth={1.8} />
              <Text style={styles.placeholderTitle}>Their camera is ready</Text>
              <Text style={styles.placeholderBody}>
                {tripod
                  ? 'Their phone is propped up. Get everyone in, then tap the shutter.'
                  : 'Live view comes in the next update. You can already guide them: they see every swipe on their screen.'}
              </Text>
            </Glass>
          </View>
        </View>
      </GestureDetector>

      {/* Edge arrows: tap to guide (same as a swipe) */}
      {!tripod && live && (
        <>
          <Edge icon="left" label="Move left" style={{ left: 10, top: '50%', marginTop: -22 }} onPress={() => guide('move-left')} />
          <Edge icon="chev" label="Move right" style={{ right: 10, top: '50%', marginTop: -22 }} onPress={() => guide('move-right')} />
          <Edge icon="up" label="Move up" style={{ top: insets.top + 64, left: '50%', marginLeft: -22 }} onPress={() => guide('move-up')} />
          <Edge icon="down" label="Move down" style={{ bottom: insets.bottom + 196, left: '50%', marginLeft: -22 }} onPress={() => guide('move-down')} />
        </>
      )}

      {/* Top: leave, status, flashlight */}
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Press onPress={onLeave} accessibilityRole="button" accessibilityLabel="Leave session" style={styles.roundWrap}>
          <Glass style={styles.round}>
            <Icon name="close" size={20} color={WHITE} />
          </Glass>
        </Press>
        <Glass style={styles.status}>
          <View style={[styles.dot, { backgroundColor: live ? '#30D158' : '#FFB340' }]} />
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {live ? (tripod ? 'Group shot' : 'Connected') : 'They dropped out…'}
          </Text>
        </Glass>
        <Press onPress={toggleTorch} accessibilityRole="switch" accessibilityState={{ checked: torch }} accessibilityLabel="Their flashlight" style={styles.roundWrap}>
          <Glass style={[styles.round, torch && { backgroundColor: '#FFD23F' }]}>
            <Icon name="bolt" size={19} color={torch ? '#191400' : WHITE} />
          </Glass>
        </Press>
      </View>

      {/* What they were just told */}
      {sent && (
        <Animated.View key={sent.n} entering={FadeIn.duration(120)} exiting={FadeOut.duration(250)} style={[styles.sentWrap, { top: insets.top + 122 }]} pointerEvents="none">
          <SentPill label={sent.label} />
        </Animated.View>
      )}

      {/* First time: how to guide */}
      {hint && live && count === null && (
        <Animated.View entering={FadeIn.delay(400)} style={[styles.hintWrap, { top: insets.top + 122 }]} pointerEvents="none">
          <Glass style={styles.hint}>
            <Text style={styles.hintText}>Swipe to steer · Pinch for closer · Double-tap for “Hold it”</Text>
          </Glass>
        </Animated.View>
      )}

      {/* Countdown */}
      {count !== null && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none" accessibilityLiveRegion="assertive">
          <Animated.Text key={count} entering={ZoomIn.duration(220)} style={styles.count}>
            {count}
          </Animated.Text>
          <Text style={styles.countLabel}>{tripod ? 'Everyone smile!' : 'Hold still'}</Text>
        </View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} pointerEvents="none" />

      {/* Bottom: closer / shutter / step back, and Hold it */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        {toast && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={styles.toastWrap}>
            <Glass style={styles.toast}>
              <Text style={styles.toastText} accessibilityLiveRegion="polite">
                {toast}
              </Text>
            </Glass>
          </Animated.View>
        )}
        {!tripod && (
          <Press onPress={() => guide('hold')} disabled={!live || count !== null} accessibilityRole="button" accessibilityLabel="Tell them to hold it" style={{ opacity: live ? 1 : 0.5 }}>
            <Glass style={styles.holdBtn}>
              <Icon name="hand" size={18} color={WHITE} />
              <Text style={styles.holdText}>Hold it</Text>
            </Glass>
          </Press>
        )}
        <View style={styles.row}>
          {!tripod ? <Side icon="back" label="Step back" onPress={() => guide('step-back')} disabled={!live} /> : <View style={styles.sideSpace} />}
          <Press onPress={shoot} disabled={!live || count !== null} pressScale={0.92} accessibilityRole="button" accessibilityLabel="Take the photo, 3 second countdown" style={[styles.shutter, { opacity: live && count === null ? 1 : 0.45 }]}>
            <View style={styles.shutterInner} />
          </Press>
          {!tripod ? <Side icon="closer" label="Closer" onPress={() => guide('move-closer')} disabled={!live} /> : <View style={styles.sideSpace} />}
        </View>
      </View>
    </View>
  );
}

function SentPill({ label }: { label: string }) {
  return (
    <Glass style={styles.sent}>
      <Icon name="check" size={15} color={WHITE} strokeWidth={2.6} />
      <Text style={styles.sentText} accessibilityLiveRegion="polite">
        Sent: {label}
      </Text>
    </Glass>
  );
}

function Edge({ icon, label, style, onPress }: { icon: IconName; label: string; style: object; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} pressScale={0.88} style={[styles.edge, style]} hitSlop={10}>
      <Glass style={styles.edgeInner}>
        <Icon name={icon} size={22} color={WHITE} strokeWidth={2.4} />
      </Glass>
    </Press>
  );
}

function Side({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label === 'Closer' ? 'Move closer' : label} style={[styles.side, { opacity: disabled ? 0.5 : 1 }]}>
      <Glass style={styles.sideBtn}>
        <Icon name={icon} size={20} color={WHITE} />
      </Glass>
      <Text style={styles.sideText}>{label}</Text>
    </Press>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0B12' },
  center: { alignItems: 'center', justifyContent: 'center' },
  placeholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 72 },
  placeholderCard: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 8, alignItems: 'center', maxWidth: 320 },
  placeholderTitle: { color: WHITE, fontSize: 17, fontWeight: '700' },
  placeholderBody: { color: 'rgba(245,245,242,0.8)', fontSize: 14.5, lineHeight: 20, textAlign: 'center' },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundWrap: { borderRadius: 22 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: WHITE, fontSize: 14, fontWeight: '600' },
  sentWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  sentText: { color: WHITE, fontSize: 15, fontWeight: '700' },
  hintWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  hint: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  hintText: { color: WHITE, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  edge: { position: 'absolute', borderRadius: 22 },
  edgeInner: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  count: { color: WHITE, fontSize: 132, fontWeight: '800', fontVariant: ['tabular-nums'], ...shadow },
  countLabel: { color: WHITE, fontSize: 20, fontWeight: '700', marginTop: -6, ...shadow },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 18 },
  toastWrap: { alignItems: 'center', paddingHorizontal: 16 },
  toast: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  toastText: { color: WHITE, fontSize: 14.5, fontWeight: '600', textAlign: 'center' },
  holdBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  holdText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 34 },
  side: { alignItems: 'center', gap: 6, width: 72 },
  sideSpace: { width: 72 },
  sideBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  sideText: { color: WHITE, fontSize: 12.5, fontWeight: '600', ...shadow },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: WHITE },
});
