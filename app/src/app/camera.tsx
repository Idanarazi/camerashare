// "Someone else" and "Group shot": this phone is the camera. It shows a code for the other phone to scan.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { CameraLive, type CameraLiveHandle } from '@/components/camera-live';
import { Pulse, Message, Screen } from '@/components/status';
import { Button } from '@/components/ui';
import { haptic } from '@/lib/motion';
import type { Mode } from '@/lib/room-client';
import { useSettings } from '@/lib/settings';
import { connectedFeedback, prepareSounds } from '@/lib/sounds';
import { type } from '@/lib/theme';
import { useRoom } from '@/lib/use-room';

export default function CameraPhone() {
  const { t, settings } = useSettings();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = params.mode === 'tripod' ? 'tripod' : 'photo';
  const live$ = useRef<CameraLiveHandle>(null);
  const { state, answerKnock, leave, retry } = useRoom({ role: 'photographer', mode, onCommand: (c, d) => live$.current?.command(c, d) });
  const live = state.kind === 'connected' && !state.partnerAway;

  // Feel the moments that matter: someone asking to join, and the two phones connecting.
  useEffect(() => {
    if (state.kind === 'knock') haptic.warning();
  }, [state.kind]);
  // The connected moment: their phone builds up, this one lands it. Sound only the first time.
  const greeted = useRef(false);
  useEffect(() => prepareSounds(), []);
  useEffect(() => {
    if (!live) return;
    const first = !greeted.current;
    greeted.current = true;
    return connectedFeedback('photographer', first && settings.beeps);
  }, [live]);

  const goHome = () => {
    const end = () => {
      leave();
      router.back();
    };
    if (state.kind === 'connected' && Platform.OS !== 'web') {
      Alert.alert('End this session?', 'Your partner will be disconnected.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: end },
      ]);
    } else end();
  };

  // Connected: the live camera takes the whole screen.
  if (state.kind === 'connected') {
    return <CameraLive ref={live$} code={state.code} mode={state.mode} partnerAway={state.partnerAway} onEnd={goHome} />;
  }

  let body;
  switch (state.kind) {
    case 'connecting':
      body = state.slow ? (
        <Message busy title="Waking up PicMe…" body="The first start of the day can take up to a minute. Keep this screen open." />
      ) : (
        <Message busy title="Getting your code…" />
      );
      break;

    case 'reconnecting':
      body = <Message busy title="Reconnecting…" body="Hang on, your connection dropped for a moment." />;
      break;

    case 'waiting':
    case 'knock':
      body = (
        <View style={styles.center}>
          <Text style={[type.display(28), { color: t.text, textAlign: 'center' }]} accessibilityRole="header">
            Have them scan this
          </Text>
          <Text style={{ color: t.text2, fontSize: 15.5, lineHeight: 21, textAlign: 'center', maxWidth: 320, marginTop: -6 }}>
            {mode === 'tripod' ? 'Prop this phone up first. Whoever directs opens PicMe and taps “Me”.' : 'They open PicMe and tap “Me”, or scan it with their camera.'}
          </Text>
          <View style={styles.qrCard} accessible accessibilityLabel={`QR code. Or type the code: ${state.code.replace(/-/g, ' ')}`}>
            <QRCode value={state.joinUrl} size={208} color="#0A0A0B" backgroundColor="#FFFFFF" ecl="M" />
          </View>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 13.5, color: t.text3 }}>or type the code</Text>
            <Text style={{ fontSize: 21, fontWeight: '800', color: t.text, letterSpacing: 0.2 }} selectable>
              {state.code}
            </Text>
          </View>
          <View style={[styles.waitRow, { backgroundColor: t.surface }]}>
            <Pulse color={t.accent} />
            <Text style={{ color: t.text2, fontSize: 14.5, fontWeight: '600' }}>Waiting for them to scan…</Text>
          </View>
        </View>
      );
      break;

    case 'error':
    case 'ended':
      body = (
        <Message tone={state.kind === 'error' ? 'bad' : 'normal'} icon={state.kind === 'error' ? 'close' : 'cam'} title={state.kind === 'error' ? 'That didn’t work' : 'Session ended'} body={state.message}>
          <View style={{ height: 8, alignSelf: 'stretch' }} />
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Button label="Start a new session" onPress={retry} />
            <Button kind="ghost" label="Back to home" onPress={() => router.back()} />
          </View>
        </Message>
      );
      break;
  }

  return (
    <Screen onHome={goHome}>
      {body}
      {state.kind === 'waiting' && (
        <View style={{ paddingHorizontal: 20 }}>
          <Button kind="secondary" icon="share" label="Send them a link instead" onPress={() => Share.share({ message: `Join my PicMe shoot: ${state.joinUrl}` }).catch(() => {})} />
        </View>
      )}
      {state.kind === 'knock' && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      )}
      {state.kind === 'knock' && (
        <Animated.View
          entering={SlideInDown.springify().stiffness(260).damping(32)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.line }]}
          accessibilityViewIsModal
          accessibilityLiveRegion="assertive">
          <Text style={{ fontSize: 19, fontWeight: '800', color: t.text }}>Someone typed your code</Text>
          <Text style={{ fontSize: 15, color: t.text2, lineHeight: 21 }}>Let them see your camera and guide the shot?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" label="Not now" onPress={() => answerKnock(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Let them in" onPress={() => answerKnock(true)} />
            </View>
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 20 },
  qrCard: { padding: 16, borderRadius: 24, backgroundColor: '#FFFFFF', marginTop: 4 },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, minHeight: 40, paddingVertical: 8, borderRadius: 20 },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 24, padding: 20, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, gap: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});
