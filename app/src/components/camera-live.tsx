// The camera phone once connected: the live camera fills the screen, the director's guidance
// appears on top of it ("Left", "Move closer", "Hold it"), and their shutter runs a countdown
// here and takes a burst. Photos are kept on this phone for now; sending them to the director
// comes with live video in the next build.
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';

import { Glass } from './glass';
import { Icon, IconName } from './icon';
import { PhotoViewer } from './photo-viewer';
import { Button, Press } from './ui';
import { BURST_GAP_MS, Command, COUNTDOWN, CUE_LABEL, Steer } from '@/lib/directing';
import { haptic, spring, useReducedMotion } from '@/lib/motion';
import { favorite } from '@/lib/photos';
import type { Mode, PartnerEvent } from '@/lib/room-client';
import { useSettings } from '@/lib/settings';
import { addPhotos, useShoot } from '@/lib/shoots';

const WHITE = '#F5F5F2';

export type CameraLiveHandle = { command: (command: Command, data?: any) => void; event: (e: PartnerEvent) => void };

type Cue = { cmd: Steer; n: number };

export const CameraLive = forwardRef<CameraLiveHandle, { code: string; mode: Mode; partnerAway: boolean; onEnd: () => void; announceShot: (count: number) => void }>(function CameraLive(
  { code, mode, partnerAway, onEnd, announceShot },
  ref,
) {
  // A propped-up phone must not lock mid-shoot.
  useEffect(() => {
    activateKeepAwakeAsync('picme-camera').catch(() => {});
    return () => {
      Promise.resolve()
        .then(() => deactivateKeepAwake('picme-camera'))
        .catch(() => {});
    };
  }, []);
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const tripod = mode === 'tripod';
  const [torch, setTorch] = useState(false);
  const [cue, setCue] = useState<Cue | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [ghost, setGhost] = useState(false);
  const flash = useSharedValue(0);
  const busy = useRef(false);
  const cueN = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shoot = useShoot(code);
  const photos = shoot?.photos ?? [];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const say = (text: string) => {
    setToast(text);
    later(() => setToast((cur) => (cur === text ? null : cur)), 2600);
  };

  const showCue = (cmd: Steer) => {
    if (tripod || count !== null) return; // a propped phone has no one to read it
    if (cmd === 'hold') haptic.success();
    else haptic.light();
    const n = ++cueN.current;
    setCue({ cmd, n });
    later(() => setCue((c) => (c?.n === n ? null : c)), cmd === 'hold' ? 1800 : 1300);
  };

  const burst = async () => {
    const shots: string[] = [];
    for (let i = 0; i < settings.burst; i++) {
      try {
        const pic = await camera.current?.takePictureAsync({ quality: 0.9, shutterSound: false });
        if (pic?.uri) shots.push(pic.uri);
      } catch {
        // skip a frame that failed; keep the rest
      }
      if (i < settings.burst - 1) await new Promise((r) => setTimeout(r, BURST_GAP_MS));
    }
    return shots;
  };

  const startCountdown = () => {
    if (busy.current) return;
    busy.current = true;
    setCue(null);
    let n = COUNTDOWN;
    setCount(n);
    haptic.light();
    const tick = async () => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        haptic.light();
        later(tick, 1000);
        return;
      }
      setCount(null);
      await capture(false);
    };
    later(tick, 1000);
  };

  // Flash, burst, keep. `mine` = the camera person pressed their own shutter.
  const capture = async (mine: boolean) => {
    flash.value = withSequence(withTiming(0.85, { duration: 60 }), withTiming(0, { duration: 380 }));
    const shots = await burst();
    busy.current = false;
    if (!shots.length) return say('Couldn’t take the photos. Is the camera allowed?');
    addPhotos(code, shots);
    haptic.success();
    say(`${shots.length} photos saved on this phone`);
    if (mine) announceShot(shots.length);
  };

  const shootNow = () => {
    if (busy.current) return;
    busy.current = true;
    setCue(null);
    haptic.light();
    void capture(true);
  };

  useImperativeHandle(ref, () => ({
    command(command, data) {
      switch (command) {
        case 'torch':
          setTorch(!!data?.on);
          break;
        case 'start-capture':
          startCountdown();
          break;
        default:
          if (command in CUE_LABEL) showCue(command as Steer);
      }
    },
    event(e) {
      if (e.kind !== 'reference') return;
      setReference(e.data);
      if (e.data) {
        setGhost(false);
        haptic.light();
        say('They sent a reference. Tap it to match the pose.');
      } else {
        setGhost(false);
      }
    },
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const favs = new Set(photos.filter((p) => p.fav).map((p) => p.key));

  if (!permission) return <View style={styles.root} />;
  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { padding: 32, gap: 14 }]}>
        <Icon name="cam" size={40} color={WHITE} strokeWidth={1.8} />
        <Text style={[styles.title, { textAlign: 'center' }]}>PicMe needs your camera</Text>
        <Text style={[styles.body, { textAlign: 'center' }]}>This phone is the camera for this shoot. Nothing is recorded or uploaded.</Text>
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <Button label="Allow camera" onPress={() => requestPermission().catch(() => null)} />
          <Button kind="ghost" label="End session" onPress={onEnd} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} mode="picture" animateShutter={false} />

      {/* The reference laid over the live picture, to line up the pose */}
      {reference && ghost && <Image source={{ uri: reference }} style={[StyleSheet.absoluteFill, { opacity: 0.4 }]} contentFit="cover" pointerEvents="none" />}

      {cue && <CueOverlay key={cue.n} cmd={cue.cmd} />}

      {/* Top: end, status */}
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Press onPress={onEnd} accessibilityRole="button" accessibilityLabel="End session" style={{ borderRadius: 22 }}>
          <Glass style={styles.round}>
            <Icon name="close" size={20} color={WHITE} />
          </Glass>
        </Press>
        <Glass style={styles.status}>
          <View style={[styles.dot, { backgroundColor: partnerAway ? '#FFB340' : '#30D158' }]} />
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {partnerAway ? 'They dropped out…' : tripod ? 'They’re directing the group' : 'They’re directing'}
          </Text>
        </Glass>
        <View style={{ width: 44 }} />
      </View>

      {reference && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={[styles.refWrap, { top: insets.top + 64 }]}>
          <Press onPress={() => setGhost((g) => !g)} accessibilityRole="switch" accessibilityState={{ checked: ghost }} accessibilityLabel="Reference photo. Tap to lay it over the camera." pressScale={0.94}>
            <Image source={{ uri: reference }} style={[styles.refImg, ghost && { borderColor: '#FFAE85' }]} contentFit="cover" />
            <View style={[styles.refTag, ghost && { backgroundColor: '#FFAE85' }]}>
              <Text style={[styles.refTagText, ghost && { color: '#16131A' }]}>{ghost ? 'On' : 'Match'}</Text>
            </View>
          </Press>
        </Animated.View>
      )}

      {/* Countdown */}
      {count !== null && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none" accessibilityLiveRegion="assertive">
          <Animated.Text key={count} entering={ZoomIn.duration(220)} style={styles.count}>
            {count}
          </Animated.Text>
          <Text style={styles.countLabel}>{tripod ? 'Smile!' : 'Hold still'}</Text>
        </View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} pointerEvents="none" />

      {/* Bottom: the latest photo, and what just happened */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]} pointerEvents="box-none">
        {toast && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={{ alignItems: 'center' }}>
            <Glass style={styles.toast}>
              <Text style={styles.toastText} accessibilityLiveRegion="polite">
                {toast}
              </Text>
            </Glass>
          </Animated.View>
        )}
        {!photos.length && <Text style={styles.waitText}>{tripod ? 'They’ll tap the shutter when everyone’s ready' : 'Follow their guidance, or take the shot yourself'}</Text>}
        <View style={styles.bottomRow}>
          {photos.length > 0 ? (
            <Press onPress={() => setViewer(0)} accessibilityRole="imagebutton" accessibilityLabel={`Photos from this shoot, ${photos.length}`} style={styles.thumbWrap}>
              <Image source={photos[0].src} style={styles.thumb} contentFit="cover" />
              {photos.length > 1 && (
                <View style={styles.thumbCount}>
                  <Text style={styles.thumbCountText}>{photos.length}</Text>
                </View>
              )}
            </Press>
          ) : (
            <View style={styles.thumbSpace} />
          )}
          <Press onPress={shootNow} disabled={count !== null} pressScale={0.92} accessibilityRole="button" accessibilityLabel="Take the photo now" style={[styles.shutter, count !== null && { opacity: 0.45 }]}>
            <View style={styles.shutterInner} />
          </Press>
          <View style={styles.thumbSpace} />
        </View>
      </View>

      <PhotoViewer
        photos={photos}
        start={viewer}
        favs={favs}
        onToggleFav={(key) => {
          const p = photos.find((x) => x.key === key);
          const uri = p && typeof p.src === 'object' && 'uri' in p.src ? (p.src.uri ?? undefined) : undefined;
          favorite(code, key, uri, !favs.has(key), settings.autoSave);
        }}
        onClose={() => setViewer(null)}
      />
    </View>
  );
});

// ── The guidance, drawn over the live picture ─────────────────

const EDGE: Record<'move-left' | 'move-right' | 'move-up' | 'move-down', { icon: IconName; side: 'left' | 'right' | 'top' | 'bottom' }> = {
  'move-left': { icon: 'left', side: 'left' },
  'move-right': { icon: 'chev', side: 'right' },
  'move-up': { icon: 'up', side: 'top' },
  'move-down': { icon: 'down', side: 'bottom' },
};

function CueOverlay({ cmd }: { cmd: Steer }) {
  const still = useReducedMotion();
  if (cmd in EDGE) return <EdgeCue cmd={cmd as keyof typeof EDGE} still={still} />;
  return <DepthCue cmd={cmd as 'move-closer' | 'step-back' | 'hold'} still={still} />;
}

/** Direction: a warm glow along that edge with a big chevron, so the middle of the frame stays clear. */
function EdgeCue({ cmd, still }: { cmd: keyof typeof EDGE; still: boolean }) {
  const { icon, side } = EDGE[cmd];
  const horizontal = side === 'left' || side === 'right';
  const nudge = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const d = side === 'left' || side === 'top' ? -10 : 10;
    nudge.value = withSequence(withTiming(d, { duration: 160 }), withSpring(0, spring.ui));
  }, [nudge, side, still]);
  const move = useAnimatedStyle(() => ({ transform: horizontal ? [{ translateX: nudge.value }] : [{ translateY: nudge.value }] }));
  const pos =
    side === 'left' ? { left: 0, top: 0, bottom: 0, width: 140 } : side === 'right' ? { right: 0, top: 0, bottom: 0, width: 140 } : side === 'top' ? { top: 0, left: 0, right: 0, height: 180 } : { bottom: 0, left: 0, right: 0, height: 180 };
  const grad = side === 'left' ? { x1: '0', y1: '0', x2: '1', y2: '0' } : side === 'right' ? { x1: '1', y1: '0', x2: '0', y2: '0' } : side === 'top' ? { x1: '0', y1: '0', x2: '0', y2: '1' } : { x1: '0', y1: '1', x2: '0', y2: '0' };
  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(300)} style={[styles.edgeCue, pos]} pointerEvents="none" accessibilityLiveRegion="assertive" accessibilityLabel={CUE_LABEL[cmd]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={`g-${side}`} {...grad}>
            <Stop offset="0" stopColor="#FFAE85" stopOpacity={0.75} />
            <Stop offset="1" stopColor="#FFAE85" stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#g-${side})`} />
      </Svg>
      <Animated.View style={[styles.edgeContent, horizontal ? { flexDirection: 'column' } : { flexDirection: 'row' }, move]}>
        <Icon name={icon} size={64} color={WHITE} strokeWidth={3} />
        <Text style={styles.cueText}>{CUE_LABEL[cmd]}</Text>
      </Animated.View>
    </Animated.View>
  );
}

/** Distance: autofocus-style brackets grow (move closer), shrink (step back), or settle (hold it). */
function DepthCue({ cmd, still }: { cmd: 'move-closer' | 'step-back' | 'hold'; still: boolean }) {
  const scale = useSharedValue(cmd === 'move-closer' ? 0.72 : cmd === 'step-back' ? 1.18 : 1.08);
  useEffect(() => {
    const to = cmd === 'move-closer' ? 1.08 : cmd === 'step-back' ? 0.8 : 1;
    scale.value = still ? to : withSpring(to, { duration: 600, dampingRatio: cmd === 'hold' ? 0.6 : 1 });
  }, [cmd, scale, still]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = cmd === 'hold' ? '#30D158' : '#FFAE85';
  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none" accessibilityLiveRegion="assertive" accessibilityLabel={CUE_LABEL[cmd]}>
      <Animated.View style={[styles.brackets, grow]}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <View
            key={c}
            style={[
              styles.corner,
              { borderColor: color },
              c === 'tl' && { left: 0, top: 0, borderLeftWidth: 5, borderTopWidth: 5, borderTopLeftRadius: 14 },
              c === 'tr' && { right: 0, top: 0, borderRightWidth: 5, borderTopWidth: 5, borderTopRightRadius: 14 },
              c === 'bl' && { left: 0, bottom: 0, borderLeftWidth: 5, borderBottomWidth: 5, borderBottomLeftRadius: 14 },
              c === 'br' && { right: 0, bottom: 0, borderRightWidth: 5, borderBottomWidth: 5, borderBottomRightRadius: 14 },
            ]}
          />
        ))}
      </Animated.View>
      <Glass style={styles.depthLabel}>
        {cmd === 'hold' && <Icon name="check" size={18} color={WHITE} strokeWidth={2.8} />}
        <Text style={styles.depthText}>{CUE_LABEL[cmd]}</Text>
      </Glass>
    </Animated.View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { color: WHITE, fontSize: 22, fontWeight: '800' },
  body: { color: 'rgba(245,245,242,0.78)', fontSize: 15.5, lineHeight: 21 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: WHITE, fontSize: 14, fontWeight: '600' },
  edgeCue: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  edgeContent: { alignItems: 'center', gap: 4 },
  cueText: { color: WHITE, fontSize: 22, fontWeight: '800', ...shadow },
  brackets: { width: 230, height: 300 },
  corner: { position: 'absolute', width: 46, height: 46 },
  depthLabel: { position: 'absolute', bottom: '22%', flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  depthText: { color: WHITE, fontSize: 18, fontWeight: '800' },
  count: { color: WHITE, fontSize: 132, fontWeight: '800', fontVariant: ['tabular-nums'], ...shadow },
  countLabel: { color: WHITE, fontSize: 20, fontWeight: '700', marginTop: -6, ...shadow },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingHorizontal: 20 },
  toast: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  toastText: { color: WHITE, fontSize: 14.5, fontWeight: '600', textAlign: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 80 },
  thumbSpace: { width: 56, height: 56 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: WHITE },
  refWrap: { position: 'absolute', right: 16 },
  refImg: { width: 64, height: 86, borderRadius: 12, borderWidth: 2, borderColor: WHITE },
  refTag: { position: 'absolute', bottom: -9, alignSelf: 'center', paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center' },
  refTagText: { color: WHITE, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  thumbWrap: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: WHITE },
  thumb: { width: '100%', height: '100%' },
  thumbCount: { position: 'absolute', right: 3, top: 3, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  thumbCountText: { color: WHITE, fontSize: 11.5, fontWeight: '800' },
  waitText: { color: WHITE, fontSize: 15, fontWeight: '600', textAlign: 'center', ...shadow },
});
