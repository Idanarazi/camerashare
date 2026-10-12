// "Your shoots" on Home. Before the first shoot: the living photo stack that invites a sample.
// After: the latest shoot as a big cover card, older ones as a 2-column grid of covers.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from './icon';
import { ShootInvite } from './shoot-invite';
import { Press } from './ui';
import { useTheme } from '@/lib/settings';
import { cover, favCount, Shoot, shootLabel, useShoots } from '@/lib/shoots';

export function ShootsSection() {
  const t = useTheme();
  const shoots = useShoots();
  const [latest, ...older] = shoots;

  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }} accessibilityRole="header">
        Your shoots
      </Text>
      {!latest ? (
        <ShootInvite />
      ) : (
        <View style={{ gap: 10 }}>
          <LatestCard shoot={latest} />
          {older.length > 0 && (
            <View style={styles.grid}>
              {older.map((s) => (
                <SmallCard key={s.id} shoot={s} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const open = (s: Shoot) => router.push({ pathname: '/shoot/[id]', params: { id: s.id } });

function Counts({ shoot }: { shoot: Shoot }) {
  const heart = useTheme().heart;
  const favs = favCount(shoot);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={styles.countText}>
        {shoot.photos.length} photos{favs ? ' · ' : ''}
      </Text>
      {favs > 0 && (
        <>
          <Icon name="heart" size={13} color={heart} fill={heart} strokeWidth={1.5} />
          <Text style={styles.countText}>{favs}</Text>
        </>
      )}
    </View>
  );
}

function LatestCard({ shoot }: { shoot: Shoot }) {
  const t = useTheme();
  const c = cover(shoot);
  return (
    <Press
      onPress={() => open(shoot)}
      accessibilityRole="button"
      accessibilityLabel={`Latest shoot, ${shootLabel(shoot.at)}, ${shoot.photos.length} photos, ${favCount(shoot)} favorites`}
      style={[styles.latest, { backgroundColor: t.surface2 }]}>
      {c && <Image source={c.src} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" />}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']} style={styles.shade} />
      <View style={[styles.chip, { backgroundColor: t.accent }]}>
        <Text style={{ color: t.accentInk, fontSize: 12.5, fontWeight: '800' }}>Latest</Text>
      </View>
      <View style={styles.latestText}>
        <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '800', letterSpacing: -0.2 }}>{shootLabel(shoot.at)}</Text>
        <Counts shoot={shoot} />
      </View>
      <View style={styles.arrow}>
        <Icon name="chev" size={20} color="#141416" strokeWidth={2.6} />
      </View>
    </Press>
  );
}

function SmallCard({ shoot }: { shoot: Shoot }) {
  const t = useTheme();
  const c = cover(shoot);
  return (
    <Press
      onPress={() => open(shoot)}
      accessibilityRole="button"
      accessibilityLabel={`Shoot from ${shootLabel(shoot.at, false)}, ${shoot.photos.length} photos`}
      style={[styles.small, { backgroundColor: t.surface2 }]}>
      {c && <Image source={c.src} style={StyleSheet.absoluteFill} contentFit="cover" />}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} style={styles.shadeSmall} />
      <View style={styles.smallText}>
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{shootLabel(shoot.at, false)}</Text>
        <Counts shoot={shoot} />
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  latest: { height: 220, borderRadius: 26, overflow: 'hidden' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 },
  chip: { position: 'absolute', left: 14, top: 14, minHeight: 28, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, justifyContent: 'center' },
  latestText: { position: 'absolute', left: 16, bottom: 14, gap: 2 },
  arrow: { position: 'absolute', right: 14, bottom: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  small: { flexBasis: '48%', flexGrow: 1, height: 170, borderRadius: 22, overflow: 'hidden' },
  shadeSmall: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  smallText: { position: 'absolute', left: 12, bottom: 10, gap: 1 },
  countText: { color: 'rgba(255,255,255,0.92)', fontSize: 13.5, fontWeight: '600' },
});
