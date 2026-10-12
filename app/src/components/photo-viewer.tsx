// Full-screen photo viewer, behaving like the iPhone's Photos app:
// swipe sideways between photos, swipe down (or up) to close — the photo follows your finger 1:1,
// keeps your flick's speed when you let go, and springs back if you didn't mean it.
// Tap the photo to hide or show the buttons. Tap ♥ to keep it.
import { Image, ImageSource } from 'expo-image';
import { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from './glass';
import { Icon } from './icon';
import { Press } from './ui';
import { haptic, project, spring, useReducedMotion } from '@/lib/motion';

export type ViewerPhoto = { key: string; src: ImageSource };

export function PhotoViewer({ photos, start, favs, onToggleFav, onClose, note }: {
  photos: ViewerPhoto[];
  start: number | null;
  favs: Set<string>;
  onToggleFav: (key: string) => void;
  onClose: () => void;
  note?: string;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const [index, setIndex] = useState(start ?? 0);
  const [chromeOn, setChromeOn] = useState(true);
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
    ty.value = 0;
    chrome.value = 1;
    appear.value = 0;
    appear.value = withSpring(1, spring.ui);
  }, [open, start, appear, ty, chrome]);

  useEffect(() => {
    chrome.value = withTiming(chromeOn ? 1 : 0, { duration: 180 });
  }, [chromeOn, chrome]);

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

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, bgStyle]} />
        <Animated.View style={[{ flex: 1 }, photoStyle]}>
            {open && (
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={start ?? 0}
                getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
                onScroll={(e) => {
                  const i = Math.round(e.nativeEvent.contentOffset.x / width);
                  if (i !== index && i >= 0 && i < photos.length) setIndex(i);
                }}
                scrollEventThrottle={32}
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
                <Icon name="close" size={22} color="#F5F5F2" />
              </Glass>
            </Press>
            <Glass style={styles.counter}>
              <Text style={styles.counterText}>
                {index + 1} of {photos.length}
              </Text>
            </Glass>
            <View style={{ width: 44 }} />
          </View>

          <View style={[styles.bottom, { bottom: insets.bottom + 18 }]}>
            {note ? <Text style={styles.note}>{note}</Text> : <View />}
            <Press onPress={toggleFav} accessibilityRole="button" accessibilityLabel={fav ? 'Remove from favorites' : 'Add to favorites'} accessibilityState={{ selected: fav }}>
              <Animated.View style={heartStyle}>
                {fav ? (
                  <View style={[styles.round, styles.big, { backgroundColor: '#FFD23F', borderColor: '#FFD23F' }]}>
                    <Icon name="heart" size={26} color="#191400" fill="#191400" />
                  </View>
                ) : (
                  <Glass style={[styles.round, styles.big]}>
                    <Icon name="heart" size={26} color="#F5F5F2" />
                  </Glass>
                )}
              </Animated.View>
            </Press>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * One photo. Its own vertical drag closes the viewer; sideways drags are left to the list,
 * so swiping between photos and swiping down never fight each other.
 */
function Page({ src, label, width, height, ty, onDismiss, onTap }: {
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
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  big: { width: 58, height: 58, borderRadius: 29 },
  counter: { minHeight: 32, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, justifyContent: 'center' },
  counterText: { color: '#F5F5F2', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: 0.2 },
  note: { color: 'rgba(245,245,242,0.8)', fontSize: 13.5, flex: 1, marginRight: 12 },
});
