// First open: welcome, how it works, camera permission. Shown once, then straight to home.
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/icon';
import { Button, Dots, Wordmark } from '@/components/ui';
import { WelcomeDemo } from '@/components/welcome-demo';
import { useSettings } from '@/lib/settings';
import { type } from '@/lib/theme';

export default function Welcome() {
  const { settings, set, t } = useSettings();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const fade = useRef(new Animated.Value(1)).current;
  const replay = settings.onboarded; // opened again from Settings → "How PicMe works"

  // Skip the camera page when the camera is already allowed.
  const steps = permission?.granted ? 2 : 3;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [step, fade]);

  const finish = () => {
    if (replay) {
      router.back();
    } else {
      set('onboarded', true);
      router.replace('/');
    }
  };
  const next = () => (step + 1 < steps ? setStep(step + 1) : finish());

  let page: ReactNode;
  let actions: ReactNode;
  if (step === 0) {
    page = (
      <View style={{ gap: 26, paddingTop: 26 }}>
        <Wordmark size={40} />
        <WelcomeDemo />
        <View style={{ gap: 8 }}>
          <Text style={[type.display(31), { color: t.text }]} accessibilityRole="header">
            Stop retaking.{'\n'}
            <Text style={{ color: t.text3 }}>Start directing.</Text>
          </Text>
          <Text style={{ color: t.text2, fontSize: 16, lineHeight: 22 }}>See their camera on your phone, guide the shot, and get the photo instantly.</Text>
        </View>
      </View>
    );
    actions = <Button label="Continue" onPress={next} />;
  } else if (step === 1) {
    page = (
      <View style={{ gap: 30, paddingTop: 40 }}>
        <Text style={[type.display(31), { color: t.text }]} accessibilityRole="header">
          Two phones.{'\n'}One perfect shot.
        </Text>
        <View style={{ gap: 24 }}>
          <HowRow icon="cam" title="Someone holds the phone" body="They tap “Someone else” and show you a code." />
          <HowRow icon="scan" title="You see what they see" body="Swipe to steer them, pinch for closer, tap Hold it when it's perfect." />
          <HowRow icon="bolt" title="The photos land on your phone" body="Instantly. Keep the best, delete the rest." />
        </View>
      </View>
    );
    actions = <Button label={step + 1 < steps ? 'Continue' : replay ? 'Done' : 'Get started'} onPress={next} />;
  } else {
    page = (
      <View style={{ gap: 22, paddingTop: 120, alignItems: 'center' }}>
        <View style={[styles.bigIcon, { backgroundColor: t.accentSoft }]}>
          <Icon name="cam" size={44} strokeWidth={1.8} color={t.accentText} />
        </View>
        <Text style={[type.display(28), { color: t.text, textAlign: 'center', lineHeight: 31 }]} accessibilityRole="header">
          Let PicMe use{'\n'}your camera
        </Text>
        <Text style={{ color: t.text2, fontSize: 16, lineHeight: 22, textAlign: 'center', maxWidth: 300 }}>
          For scanning codes and for when you're the one taking the photo. Nothing is recorded or uploaded.
        </Text>
      </View>
    );
    actions = (
      <View style={{ gap: 10 }}>
        <Button
          label="Allow camera"
          onPress={async () => {
            await requestPermission().catch(() => null);
            finish();
          }}
        />
        <Button kind="ghost" label="Not now" onPress={finish} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}>
      <Animated.View style={{ flex: 1, paddingHorizontal: 20, opacity: fade }}>{page}</Animated.View>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Dots count={steps} index={step} />
        {actions}
      </View>
    </View>
  );
}

function HowRow({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const { t } = useSettings();
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
      <View style={[styles.howIcon, { backgroundColor: t.accentSoft }]}>
        <Icon name={icon} size={24} color={t.accentText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>{title}</Text>
        <Text style={{ fontSize: 15, color: t.text2, marginTop: 3, lineHeight: 20 }}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bigIcon: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  howIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
