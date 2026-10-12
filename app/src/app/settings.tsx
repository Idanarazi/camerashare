// Settings: a short list. Look, shooting, photos, help.
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Share, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/backdrop';
import { Icon } from '@/components/icon';
import { TopBar, useScrollEdge, useTopBarHeight } from '@/components/top-bar';
import { Group, Press, Row, RoundButton, Segmented } from '@/components/ui';
import { Appearance, useSettings } from '@/lib/settings';
import { THEME_ORDER, THEMES, type, WEBSITE } from '@/lib/theme';

export default function SettingsScreen() {
  const { settings, set, t } = useSettings();
  const insets = useSafeAreaInsets();
  const { y, onScroll } = useScrollEdge();
  const barH = useTopBarHeight();
  // The big title scrolls away; a small one fades into the bar as it goes, like iOS Settings.
  const smallTitle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [24, 48], [0, 1], 'clamp') }));

  const toggle = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ true: t.accent, false: t.surface3 }}
      ios_backgroundColor={t.surface3}
      thumbColor="#FFFFFF"
    />
  );

  return (
    <View style={{ flex: 1 }}>
    <Backdrop />
    <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={[styles.page, { paddingTop: barH, paddingBottom: insets.bottom + 32 }]}>
      <Text style={[type.display(31), { color: t.text, marginBottom: -4 }]} accessibilityRole="header">
        Settings
      </Text>

      <Group label="Look">
        <LookPicker value={settings.appearance} onChange={(v) => set('appearance', v)} />
      </Group>

      <Group label="Shooting">
        <Row icon="sound" label="Sounds" note="When your phones connect, and before each photo" right={toggle(settings.beeps, (v) => set('beeps', v), 'Sounds')} />
        <Row icon="level" label="Grid & level" note="Helps keep photos straight" right={toggle(settings.grid, (v) => set('grid', v), 'Grid and level')} />
        <Row
          icon="cam"
          label="Photos per shot"
          note="Taken in a quick burst"
          right={
            <Segmented<3 | 5 | 10>
              label="Photos per shot"
              value={settings.burst}
              onChange={(v) => set('burst', v)}
              options={[
                { value: 3, label: '3' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
            />
          }
        />
      </Group>

      <Group label="Photos">
        <Row icon="heart" label="Save favorites to Photos" note="Photos you ♥ go to your iPhone's Photos app" right={toggle(settings.autoSave, (v) => set('autoSave', v), 'Save favorites to Photos')} />
      </Group>

      <Group label="Help">
        <Row label="How PicMe works" right={<Icon name="chev" size={22} color={t.text3} />} onPress={() => router.push('/welcome')} />
        <Row label="See a sample shoot" right={<Icon name="chev" size={22} color={t.text3} />} onPress={() => router.push('/sample')} />
        <Row
          label="Tell a friend"
          right={<Icon name="share" size={22} color={t.text3} />}
          onPress={() => Share.share({ message: `PicMe: see their camera on your phone and direct the shot. ${WEBSITE}` }).catch(() => {})}
        />
      </Group>

      <Group label="Preview build">
        <Row label="Show demo shoots on Home" note="See how Home looks after a few shoots" right={toggle(settings.demoShoots, (v) => set('demoShoots', v), 'Show demo shoots on Home')} />
      </Group>

      <Text style={{ textAlign: 'center', fontSize: 12.5, color: t.text3 }}>PicMe {Constants.expoConfig?.version ?? ''} · preview build</Text>
    </Animated.ScrollView>
    <TopBar
      y={y}
      left={<RoundButton icon="left" label="Back" onPress={() => router.back()} />}
      center={
        <Animated.Text style={[{ fontSize: 17, fontWeight: '600', color: t.text }, smallTitle]} importantForAccessibility="no" accessibilityElementsHidden>
          Settings
        </Animated.Text>
      }
    />
    </View>
  );
}

/** The four looks as little previews: the screen's background with its three choice colors. */
function LookPicker({ value, onChange }: { value: Appearance; onChange: (v: Appearance) => void }) {
  const { t } = useSettings();
  return (
    <View style={styles.looks} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
      {THEME_ORDER.map((id) => {
        const p = THEMES[id];
        const on = id === value;
        return (
          <Press key={id} onPress={() => onChange(id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={p.name} style={styles.look}>
            <View style={[styles.preview, { backgroundColor: p.bg, borderColor: on ? t.text : t.line, borderWidth: on ? 2 : StyleSheet.hairlineWidth }]}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: p.glow[0]?.color ?? p.surface2, opacity: 0.8 }} />
              <View style={{ height: 12, borderRadius: 4, backgroundColor: p.roles.me.bg }} />
              <View style={{ height: 12, borderRadius: 4, backgroundColor: p.roles.other.bg, borderWidth: p.roles.other.bg === p.bg || p.mode === 'dark' ? StyleSheet.hairlineWidth : 0, borderColor: p.line }} />
              <View style={{ height: 8, borderRadius: 4, backgroundColor: p.roles.group.bg, borderWidth: p.mode === 'dark' ? StyleSheet.hairlineWidth : 0, borderColor: p.line }} />
            </View>
            <Text style={{ fontSize: 12.5, lineHeight: 15, fontWeight: on ? '700' : '500', color: on ? t.text : t.text2, textAlign: 'center' }} numberOfLines={2}>
              {p.name}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  looks: { flexDirection: 'row', gap: 10, padding: 14 },
  look: { flex: 1, gap: 6, alignItems: 'stretch' },
  preview: { height: 92, borderRadius: 14, padding: 8, gap: 5, justifyContent: 'center' },
  page: { paddingHorizontal: 20, gap: 20 },
});
