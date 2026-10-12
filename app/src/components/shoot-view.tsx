// One shoot: big title, photo and favorite counts, a grid of every photo, and the full-screen viewer.
// Used for real shoots and for the sample shoot.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from './glass';
import { Icon } from './icon';
import { PhotoViewer } from './photo-viewer';
import { TopBar, useScrollEdge, useTopBarHeight } from './top-bar';
import { Button, Press, RoundButton } from './ui';
import type { ShootPhoto } from '@/lib/shoots';
import { useSettings } from '@/lib/settings';
import { type } from '@/lib/theme';

export function ShootView({ title, intro, photos, badge, footer }: {
  title: string;
  intro?: string;
  photos: ShootPhoto[];
  badge?: string;
  footer?: { label: string; onPress: () => void };
}) {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);
  const { y, onScroll } = useScrollEdge();
  const barH = useTopBarHeight();
  const [favs, setFavs] = useState(() => new Set(photos.filter((p) => p.fav).map((p) => p.key)));

  const cell = Math.floor((Math.min(width, 520) - 40 - 6) / 3);
  const toggle = (key: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={[styles.page, { paddingTop: barH + 4, paddingBottom: insets.bottom + (footer ? 110 : 32) }]}>
        <View style={{ gap: 6 }}>
          <Text style={[type.display(28), { color: t.text }]} accessibilityRole="header">
            {title}
          </Text>
          {intro ? <Text style={{ color: t.text2, fontSize: 15.5, lineHeight: 21 }}>{intro}</Text> : null}
        </View>

        <View style={styles.stats}>
          <Stat n={photos.length} label="photos" />
          <Stat n={favs.size} label="favorites" accent />
        </View>

        <View style={[styles.grid, { borderRadius: 18 }]}>
          {photos.map((p, i) => (
            <Press key={p.key} onPress={() => setOpen(i)} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1}${favs.has(p.key) ? ', favorite' : ''}`} style={{ width: cell, height: cell * (4 / 3) }}>
              <Image source={p.src} style={StyleSheet.absoluteFill} contentFit="cover" />
              {favs.has(p.key) && (
                <View style={styles.heart}>
                  <Icon name="heart" size={13} color="#FFD23F" fill="#FFD23F" strokeWidth={1.5} />
                </View>
              )}
            </Press>
          ))}
        </View>
      </Animated.ScrollView>

      <TopBar
        y={y}
        left={<RoundButton icon="left" label="Back" onPress={() => router.back()} />}
        center={
          badge ? (
            <View style={[styles.badge, { backgroundColor: t.accentSoft }]}>
              <Text style={{ color: t.accentText, fontSize: 13, fontWeight: '700' }}>{badge}</Text>
            </View>
          ) : null
        }
      />

      {footer && (
        <Glass tone={t.mode === 'light' ? 'light' : 'dark'} intensity={60} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button label={footer.label} onPress={footer.onPress} />
        </Glass>
      )}

      <PhotoViewer photos={photos} start={open} favs={favs} onToggleFav={toggle} onClose={() => setOpen(null)} note={badge ? `${badge} photo` : undefined} />
    </View>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  const { t } = useSettings();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[type.display(28), { color: accent ? t.accentText : t.text, lineHeight: 32, fontVariant: ['tabular-nums'] }]}>{n}</Text>
      <Text style={{ fontSize: 13, color: t.text3 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  badge: { minHeight: 28, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, overflow: 'hidden' },
  heart: { position: 'absolute', left: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20 },
});
