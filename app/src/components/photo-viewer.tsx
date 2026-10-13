// Full-screen photo viewer, behaving like the iPhone's Photos app:
// swipe sideways between photos, swipe down (or up) to close — the photo follows your finger 1:1,
// keeps your flick's speed when you let go, and springs back if you didn't mean it.
// Tap the photo to hide or show the buttons. Drag the thumbnail strip to scrub through the shoot.
// Buttons: save to Photos, ♥, delete.
import { Image, ImageSource } from 'expo-image';
import { memo, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, runOnJS, SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from './glass';
import { Icon } from './icon';
import { Press } from './ui';
import { haptic, project, spring, useReducedMotion } from '@/lib/motion';
import { useTheme } from '@/lib/settings';

export type ViewerPhoto = { key: string; src: ImageSource; thumb?: ImageSource };

const WHITE = '#F5F5F2';
const THUMB_W = 40;
const THUMB_GAP = 4;
const STEP = THUMB_W + THUMB_GAP;

export function PhotoViewer({ photos, start, favs, onToggleFav, onClose, note, onSave, onDelete }: {
  photos: ViewerPhoto[];
  start: number | null;
  favs: Set<string>;
  onToggleFav: (key: string) => void;
  onClose: () => void;
  note?: string;
  onSave?: (key: string) => Promise<boolean>; // save this photo to Photos
  onDelete?: (key: string) => void; // delete it from this phone
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const t = useTheme();
  const [index, setIndex] = useState(start ?? 0);
  const [chromeOn, setChromeOn] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const list = useRef<FlatList<ViewerPhoto>>(null);
  const strip = useRef<FlatList<ViewerPhoto>>(null);
  const scrubbing = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;
  const open = start !== null;
  const current = photos[index];
  const fav = current ? favs.has(current.key) : false;

  const appear = useSharedValue(0); // 0 = closed, 1 = fully open
  const ty = useSharedValue(0); // vertical drag
  const chrome = useSharedValue(1);
  const heart = useSharedValue(1);

  useEffect(() => {
    if (!open) return;
    setIndex(start ?? 0);
    setChromeOn(true);
    setMsg(null);
    ty.value = 0;
    chrome.value = 1;
    appear.value = 0;
    appear.value = withSpring(1, spring.ui);
  }, [open, start, appear, ty, chrome]);

  useEffect(() => {
    chrome.value = withTiming(chromeOn ? 1 : 0, { duration: 180 });
  }, [chromeOn, chrome]);

  // A photo was deleted: stay in place (or close when none are left)
  useEffect(() => {
    if (!open) return;
    if (!photos.length) onClose();
    else if (index > photos.length - 1) setIndex(photos.length - 1);
  }, [photos.length, open, index, onClose]);

  const close = () => {
    appear.value = withTiming(0, { duration: 200 }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };
  const dismiss = () => {
    appear.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) runOnJS(onClose)();
    });
  };
  const toggleChrome = () => setChromeOn((v) => !v);

  const say = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg((m) => (m === text ? null : m)), 1800);
  };

  // The strip follows the photo you're on (unless you're the one dragging it).
  useEffect(() => {
    if (!open || scrubbing.current) return;
    strip.current?.scrollToOffset({ offset: index * STEP, animated: !still });
  }, [index, open, still]);

  const goTo = (i: number) => {
    if (i === indexRef.current || i < 0 || i >= photos.length) return;
    setIndex(i);
    list.current?.scrollToIndex({ index: i, animated: false });
  };

  const bgStyle = useAnimatedStyle(() => ({
    opacity: appear.value * (1 - Math.min(Math.abs(ty.value) / (height * 0.5), 1) * 0.85),
  }));
  const photoStyle = useAnimatedStyle(() => {
    const drag = Math.min(Math.abs(ty.value) / height, 1);
    const scale = still ? 1 : (0.94 + 0.06 * appear.value) * (1 - drag * 0.25);
    return { opacity: still ? appear.value : 1, transform: [{ translateY: ty.value }, { scale }] };
  });
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: appear.value * chrome.value * (1 - Math.min(Math.abs(ty.value) / 120, 1)),
  }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));

  const toggleFav = () => {
    if (!current) return;
    if (!fav) {
      haptic.light();
      if (!still) {
        heart.value = 1.25;
        heart.value = withSpring(1, spring.flick);
      }
    }
    onToggleFav(current.key);
  };

  const save = async () => {
    if (!current || !onSave) return;
    const ok = await onSave(current.key);
    if (ok) haptic.success();
    say(ok ? 'Saved to Photos' : 'Allow PicMe to add photos in Settings to save them');
  };

  const remove = () => {
    if (!current || !onDelete) return;
    const key = current.key;
    const go = () => {
      haptic.warning();
      onDelete(key);
    };
    if (Platform.OS === 'web') return go();
    Alert.alert('Delete this photo?', 'It’s removed from this phone. The other phone keeps its copy.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, bgStyle]} />
        <Animated.View style={[{ flex: 1 }, photoStyle]}>
          {open && (
            <FlatList
              ref={list}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(start ?? 0, Math.max(photos.length - 1, 0))}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              // Only the photo on screen and its neighbours are kept: smooth even in a long shoot
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews
              onScroll={(e) => {
                if (scrubbing.current) return;
                const i = Math.round(e.nativeEvent.contentOffset.x / width);
                if (i !== indexRef.current && i >= 0 && i < photos.length) setIndex(i);
              }}
              scrollEventThrottle={48}
              keyExtractor={(p) => p.key}
              renderItem={({ item, index: i }) => (
                <Page src={item.src} label={`Photo ${i + 1} of ${photos.length}`} width={width} height={height} ty={ty} onDismiss={dismiss} onTap={toggleChrome} />
              )}
            />
          )}
        </Animated.View>

        <Animated.View pointerEvents={chromeOn ? 'box-none' : 'none'} style={[StyleSheet.absoluteFill, chromeStyle]}>
          <View style={[styles.top, { top: insets.top + 8 }]}>
            <Press onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Glass style={styles.round}>
                <Icon name="close" size={22} color={WHITE} />
              </Glass>
            </Press>
            <Glass style={styles.counter}>
              <Text style={styles.counterText}>
                {Math.min(index + 1, photos.length)} of {photos.length}
              </Text>
            </Glass>
            <View style={{ width: 44 }} />
          </View>

          {msg && (
            <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(180)} style={[styles.msgWrap, { top: insets.top + 64 }]} pointerEvents="none">
              <Glass style={styles.msg}>
                <Text style={styles.msgText} accessibilityLiveRegion="polite">
                  {msg}
                </Text>
              </Glass>
            </Animated.View>
          )}

          {/* Thumbnail strip: tap one to jump, or drag to scrub through the shoot */}
          {photos.length > 1 && (
            <View style={[styles.stripWrap, { bottom: insets.bottom + 92 }]}>
              <FlatList
                ref={strip}
                data={photos}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(p) => `t-${p.key}`}
                getItemLayout={(_, i) => ({ length: STEP, offset: STEP * i, index: i })}
                contentContainerStyle={{ paddingHorizontal: width / 2 - THUMB_W / 2 }}
                snapToInterval={STEP}
                decelerationRate="fast"
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  scrubbing.current = true;
                }}
                onScroll={(e) => {
                  if (!scrubbing.current) return;
                  const i = Math.max(0, Math.min(photos.length - 1, Math.round(e.nativeEvent.contentOffset.x / STEP)));
                  if (i !== indexRef.current) {
                    haptic.select();
                    goTo(i);
                  }
                }}
                onMomentumScrollEnd={() => {
                  scrubbing.current = false;
                }}
                onScrollEndDrag={(e) => {
                  // no flick → no momentum phase to wait for
                  if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) scrubbing.current = false;
                }}
                initialNumToRender={12}
                windowSize={5}
                renderItem={({ item, index: i }) => <Thumb src={item.thumb ?? item.src} on={i === index} n={i + 1} onPress={() => goTo(i)} />}
              />
            </View>
          )}

          {note ? <Text style={[styles.note, { bottom: insets.bottom + 158 }]}>{note}</Text> : null}

          <View style={[styles.bottom, { bottom: insets.bottom + 18 }]}>
            {onSave ? (
              <Press onPress={save} accessibilityRole="button" accessibilityLabel="Save to Photos">
                <Glass style={styles.round}>
                  <Icon name="download" size={21} color={WHITE} />
                </Glass>
              </Press>
            ) : (
              <View style={{ width: 44 }} />
            )}
            <Press onPress={toggleFav} accessibilityRole="button" accessibilityLabel={fav ? 'Remove from favorites' : 'Add to favorites'} accessibilityState={{ selected: fav }}>
              <Animated.View style={heartStyle}>
                {fav ? (
                  <View style={[styles.round, styles.big, { backgroundColor: t.heart, borderColor: t.heart }]}>
                    <Icon name="heart" size={26} color={t.heartInk} fill={t.heartInk} />
                  </View>
                ) : (
                  <Glass style={[styles.round, styles.big]}>
                    <Icon name="heart" size={26} color={WHITE} />
                  </Glass>
                )}
              </Animated.View>
            </Press>
            {onDelete ? (
              <Press onPress={remove} accessibilityRole="button" accessibilityLabel="Delete photo">
                <Glass style={styles.round}>
                  <Icon name="trash" size={21} color={WHITE} />
                </Glass>
              </Press>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const Thumb = memo(function Thumb({ src, on, n, onPress }: { src: ImageSource; on: boolean; n: number; onPress: () => void }) {
  return (
    <Press onPress={onPress} pressScale={0.92} accessibilityRole="imagebutton" accessibilityLabel={`Go to photo ${n}`} accessibilityState={{ selected: on }} style={{ marginRight: THUMB_GAP }}>
      <Image source={src} style={[styles.thumb, on && styles.thumbOn]} contentFit="cover" recyclingKey={String(n)} />
    </Press>
  );
});

/**
 * One photo. Its own vertical drag closes the viewer; sideways drags are left to the list,
 * so swiping between photos and swiping down never fight each other.
 */
const Page = memo(function Page({ src, label, width, height, ty, onDismiss, onTap }: {
  src: ImageSource;
  label: string;
  width: number;
  height: number;
  ty: SharedValue<number>;
  onDismiss: () => void;
  onTap: () => void;
}) {
  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-12, 12])
    .onUpdate((e) => {
      ty.value = e.translationY; // 1:1 with the finger
    })
    .onEnd((e) => {
      // Decide from where the flick is heading, not where the finger let go.
      const resting = ty.value + project(e.velocityY);
      if (Math.abs(resting) > height * 0.22) {
        const dir = Math.sign(resting) || 1;
        ty.value = withSpring(dir * height, { ...spring.ui, velocity: e.velocityY }); // keeps the flick's speed
        runOnJS(onDismiss)();
      } else {
        ty.value = withSpring(0, { ...spring.ui, velocity: e.velocityY });
      }
    });
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onTap)();
    });
  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View style={{ width, height }}>
        <Image source={src} style={{ width, height }} contentFit="contain" accessibilityLabel={label} />
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  stripWrap: { position: 'absolute', left: 0, right: 0, height: 56 },
  thumb: { width: THUMB_W, height: 54, borderRadius: 6, opacity: 0.6 },
  thumbOn: { opacity: 1, borderWidth: 2, borderColor: WHITE },
  top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottom: { position: 'absolute', left: 24, right: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  big: { width: 58, height: 58, borderRadius: 29 },
  counter: { minHeight: 32, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, justifyContent: 'center' },
  counterText: { color: WHITE, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: 0.2 },
  msgWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  msg: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  msgText: { color: WHITE, fontSize: 14.5, fontWeight: '600', textAlign: 'center' },
  note: { position: 'absolute', left: 20, right: 20, color: 'rgba(245,245,242,0.8)', fontSize: 13.5, textAlign: 'center' },
});
