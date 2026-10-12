// Home: one question, two big answers, group shot, and your shoots underneath.
import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/backdrop';
import { ShootsSection } from '@/components/shoots-section';
import { RoleCard, RoundButton, Wordmark } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { type } from '@/lib/theme';

export default function Home() {
  const { settings, t } = useSettings();
  const insets = useSafeAreaInsets();

  if (!settings.onboarded) return <Redirect href="/welcome" />;

  const open = (role: 'director' | 'photographer' | 'group') => {
    if (role === 'director') router.push('/scan');
    else router.push({ pathname: '/camera', params: { mode: role === 'group' ? 'tripod' : 'photo' } });
  };

  return (
    <View style={{ flex: 1 }}>
    <Backdrop />
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.head}>
        <Wordmark size={26} />
        <RoundButton icon="gear" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <Text style={[type.display(31), { color: t.text }]} accessibilityRole="header">
        Who's in the photo?
      </Text>

      <View style={{ gap: 12 }}>
        <RoleCard role="me" icon="scan" name="Me" desc="Scan their code, then direct the shot" onPress={() => open('director')} />
        <RoleCard role="other" icon="cam" name="Someone else" desc="You take the photo, they guide you" onPress={() => open('photographer')} />
      </View>

      <RoleCard role="group" compact icon="tripod" name="Group shot" desc="Prop this phone up as the camera. Everyone's in the photo." onPress={() => open('group')} />

      <ShootsSection />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 22 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
