// "They want to switch roles": a sheet from the bottom, answered with one tap.
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { Glass } from './glass';
import { Icon } from './icon';
import { Press } from './ui';

const WHITE = '#F5F5F2';

export function SwapSheet({ youWould, onAnswer, bottom }: { youWould: string; onAnswer: (accept: boolean) => void; bottom: number }) {
  return (
    <>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { zIndex: 30, backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      <Animated.View entering={SlideInDown.springify().stiffness(260).damping(32)} exiting={SlideOutDown.duration(200)} style={[styles.wrap, { bottom }]} accessibilityViewIsModal accessibilityLiveRegion="assertive">
        <Glass style={styles.sheet} intensity={70}>
          <View style={styles.badge}>
            <Icon name="people" size={26} color="#16131A" />
          </View>
          <Text style={styles.title}>They want to switch roles</Text>
          <Text style={styles.body}>{youWould}</Text>
          <View style={styles.row}>
            <Press onPress={() => onAnswer(false)} accessibilityRole="button" style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Not now</Text>
            </Press>
            <Press onPress={() => onAnswer(true)} accessibilityRole="button" style={[styles.btn, styles.btnMain]}>
              <Text style={styles.btnMainText}>Switch</Text>
            </Press>
          </View>
        </Glass>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 31, left: 12, right: 12 },
  sheet: { borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 8, alignItems: 'center' },
  badge: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFAE85', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { color: WHITE, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  body: { color: 'rgba(245,245,242,0.8)', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch' },
  btn: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.14)' },
  btnGhostText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  btnMain: { backgroundColor: WHITE },
  btnMainText: { color: '#16131A', fontSize: 16, fontWeight: '800' },
});
