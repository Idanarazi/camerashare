// One shoot: big title, photo and favorite counts, a grid of every photo, and the full-screen viewer.
// Your own shoots can be saved to Photos or deleted: one photo, a selection ("Select"), or the whole shoot.
// Also used for the sample shoot (read-only).
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from './backdrop';
import { Glass } from './glass';
import { Icon, IconName } from './icon';
import { PhotoViewer } from './photo-viewer';
import { TopBar, useScrollEdge, useTopBarHeight } from './top-bar';
import { Button, Press, RoundButton } from './ui';
import { haptic } from '@/lib/motion';
import type { ShootPhoto } from '@/lib/shoots';
import { useSettings } from '@/lib/settings';
import { type } from '@/lib/theme';

/** What a real shoot can do (the sample shoot has none of these). */
export type ShootActions = {
  save: (keys: string[]) => Promise<number>; // how many reached Photos
  remove: (keys: string[]) => void;
  removeShoot: () => void;
};

function confirm(title: string, body: string, action: string, go: () => void) {
  if (Platform.OS === 'web') return go();
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: go },
  ]);
}

export function ShootView({ title, intro, photos, badge, footer, onFav, actions }: {
  title: string;
  onFav?: (key: string, fav: boolean) => void; // real shoots remember favorites
  intro?: string;
  photos: ShootPhoto[];
  badge?: string;
  footer?: { label: string; onPress: () => void };
  actions?: ShootActions;
}) {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);
  const { y, onScroll } = useScrollEdge();
  const barH = useTopBarHeight();
  const [favs, setFavs] = useState(() => new Set(photos.filter((p) => p.fav).map((p) => p.key)));
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  const cell = Math.floor((Math.min(width, 520) - 40 - 6) / 3);
  const toggleFav = (key: string) => {
    const on = !favs.has(key);
    const next = new Set(favs);
    if (on) next.add(key);
    else next.delete(key);
    setFavs(next);
    onFav?.(key, on);
  };

  const say = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg((m) => (m === text ? null : m)), 2400);
  };
  const saved = (n: number, of: number) => {
    if (n) haptic.success();
    say(n ? `Saved ${n === 1 ? '1 photo' : `${n} photos`} to Photos` : of ? 'Allow PicMe to add photos in Settings to save them' : '');
  };

  // ── Select ──
  const startSelecting = () => {
    setPicked(new Set());
    setSelecting(true);
  };
  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
  };
  const togglePick = (key: string) => {
    haptic.select();
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setPicked(next);
  };
  const allPicked = photos.length > 0 && picked.size === photos.length;
  const pickAll = () => setPicked(allPicked ? new Set() : new Set(photos.map((p) => p.key)));

  const savePicked = async () => {
    if (!actions || !picked.size) return;
    const keys = [...picked];
    saved(await actions.save(keys), keys.length);
    stopSelecting();
  };
  const deletePicked = () => {
    if (!actions || !picked.size) return;
    const keys = [...picked];
    const n = keys.length;
    const all = n === photos.length;
    confirm(n === 1 ? 'Delete this photo?' : `Delete ${n} photos?`, 'They’re removed from this phone. The other phone keeps its copies.', 'Delete', () => {
      haptic.warning();
      stopSelecting();
      if (all) {
        router.back();
        actions.removeShoot();
      } else actions.remove(keys);
    });
  };

  // ── The whole shoot ──
  const saveAll = async () => {
    if (!actions) return;
    saved(await actions.save(photos.map((p) => p.key)), photos.length);
  };
  const deleteShoot = () => {
    if (!actions) return;
    confirm('Delete this shoot?', `All ${photos.length} photos are removed from this phone. The other phone keeps its copies.`, 'Delete shoot', () => {
      haptic.warning();
      router.back();
      actions.removeShoot();
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.page, { paddingTop: barH + 4, paddingBottom: insets.bottom + (footer || selecting ? 110 : 32) }]}>
        <View style={{ gap: 6 }}>
          <Text style={[type.display(28), { color: t.text }]} accessibilityRole="header">
            {title}
          </Text>
          {intro ? <Text style={{ color: t.text2, fontSize: 15.5, lineHeight: 21 }}>{intro}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stats}>
            <Stat n={photos.length} label="photos" />
            <Stat n={favs.size} label="favorites" accent />
          </View>
          {actions && !selecting && (
            <View style={styles.shootActions}>
              <Pill icon="download" label="Save all" onPress={saveAll} />
              <Pill icon="trash" label="Delete" onPress={deleteShoot} danger />
            </View>
          )}
        </View>

        <View style={[styles.grid, { borderRadius: 18 }]}>
          {photos.map((p, i) => {
            const on = picked.has(p.key);
            return (
              <Press
                key={p.key}
                onPress={() => (selecting ? togglePick(p.key) : setOpen(i))}
                pressScale={selecting ? 0.96 : 0.97}
                accessibilityRole={selecting ? 'checkbox' : 'imagebutton'}
                accessibilityState={selecting ? { checked: on } : undefined}
                accessibilityLabel={`Photo ${i + 1}${favs.has(p.key) ? ', favorite' : ''}`}
                style={{ width: cell, height: cell * (4 / 3) }}>
                <Image source={p.thumb ?? p.src} style={[StyleSheet.absoluteFill, selecting && on && { opacity: 0.75 }]} contentFit="cover" recyclingKey={p.key} />
                {favs.has(p.key) && (
                  <View style={styles.heart}>
                    <Icon name="heart" size={13} color={t.heart} fill={t.heart} strokeWidth={1.5} />
                  </View>
                )}
                {selecting && (
                  <View style={[styles.check, on ? { backgroundColor: t.accent, borderColor: '#FFFFFF' } : null]}>
                    {on && <Icon name="check" size={14} color={t.accentInk} strokeWidth={3} />}
                  </View>
                )}
              </Press>
            );
          })}
        </View>
      </Animated.ScrollView>

      <TopBar
        y={y}
        left={
          selecting ? (
            <TextButton label={allPicked ? 'Deselect all' : 'Select all'} onPress={pickAll} />
          ) : (
            <RoundButton icon="left" label="Back" onPress={() => router.back()} />
          )
        }
        center={
          selecting ? (
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }} accessibilityLiveRegion="polite">
              {picked.size ? `${picked.size} selected` : 'Select photos'}
            </Text>
          ) : badge ? (
            <View style={[styles.badge, { backgroundColor: t.accentSoft }]}>
              <Text style={{ color: t.accentText, fontSize: 13, fontWeight: '700' }}>{badge}</Text>
            </View>
          ) : null
        }
        right={actions ? <TextButton label={selecting ? 'Cancel' : 'Select'} onPress={selecting ? stopSelecting : startSelecting} strong={selecting} /> : undefined}
      />

      {msg ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={[styles.msgWrap, { bottom: insets.bottom + (selecting ? 96 : 24) }]} pointerEvents="none">
          <View style={[styles.msg, { backgroundColor: t.primary }]}>
            <Text style={{ color: t.onPrimary, fontSize: 14.5, fontWeight: '600', textAlign: 'center' }} accessibilityLiveRegion="polite">
              {msg}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {selecting && (
        <Glass tone={t.mode === 'light' ? 'light' : 'dark'} intensity={60} style={[styles.footer, styles.toolbar, { paddingBottom: insets.bottom + 14 }]}>
          <ToolbarButton icon="download" label="Save" disabled={!picked.size} onPress={savePicked} />
          <ToolbarButton icon="trash" label="Delete" disabled={!picked.size} onPress={deletePicked} danger />
        </Glass>
      )}

      {footer && !selecting && (
        <Glass tone={t.mode === 'light' ? 'light' : 'dark'} intensity={60} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button label={footer.label} onPress={footer.onPress} />
        </Glass>
      )}

      <PhotoViewer
        photos={photos}
        start={open}
        favs={favs}
        onToggleFav={toggleFav}
        onClose={() => setOpen(null)}
        note={badge ? `${badge} photo` : undefined}
        onSave={actions ? async (key) => (await actions.save([key])) > 0 : undefined}
        onDelete={
          actions
            ? (key) => {
                if (photos.length === 1) {
                  setOpen(null);
                  router.back();
                  actions.removeShoot();
                } else actions.remove([key]);
              }
            : undefined
        }
      />
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

function Pill({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const { t } = useSettings();
  const color = danger ? t.danger : t.text;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={danger ? 'Delete this shoot' : 'Save all photos to Photos'} style={[styles.pill, { backgroundColor: t.surface, borderColor: t.line }]}>
      <Icon name={icon} size={16} color={color} strokeWidth={2.2} />
      <Text style={{ color, fontSize: 14, fontWeight: '700' }}>{label}</Text>
    </Press>
  );
}

function TextButton({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  const { t } = useSettings();
  return (
    <Press onPress={onPress} accessibilityRole="button" hitSlop={8} style={[styles.textBtn, { backgroundColor: strong ? t.primary : t.mode === 'light' ? 'rgba(255,255,255,0.62)' : t.surface2 }]}>
      <Text numberOfLines={1} style={{ color: strong ? t.onPrimary : t.text, fontSize: 15, fontWeight: '700' }}>
        {label}
      </Text>
    </Press>
  );
}

function ToolbarButton({ icon, label, onPress, disabled, danger }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const { t } = useSettings();
  const color = danger ? t.danger : t.text;
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label} selected photos`} accessibilityState={{ disabled }} style={[styles.toolBtn, { opacity: disabled ? 0.4 : 1 }]}>
      <Icon name={icon} size={22} color={color} />
      <Text style={{ color, fontSize: 12.5, fontWeight: '700' }}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  badge: { minHeight: 28, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, justifyContent: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  stats: { flexDirection: 'row', gap: 28 },
  shootActions: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, overflow: 'hidden' },
  heart: { position: 'absolute', left: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', right: 6, bottom: 6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  textBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around' },
  toolBtn: { alignItems: 'center', gap: 3, minWidth: 80, paddingVertical: 4 },
  msgWrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  msg: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
});
