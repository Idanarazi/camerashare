// The ••• menu during a session: a few switches and actions, out of the way until needed.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Glass } from './glass';
import { Icon, IconName } from './icon';
import { Press } from './ui';
import { haptic } from '@/lib/motion';

const WHITE = '#F5F5F2';

export type MenuItem = { icon: IconName; label: string; note?: string; on?: boolean; onPress: () => void };

export function SessionMenu({ items, top }: { items: MenuItem[]; top: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Press onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel="More options" accessibilityState={{ expanded: open }} style={{ borderRadius: 22 }}>
        <Glass style={[styles.round, open && { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
          <Icon name="more" size={20} color={WHITE} strokeWidth={2.6} />
        </Glass>
      </Press>
      {open && (
        <>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close menu" />
          <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={[styles.panelWrap, { top }]}>
            <Glass style={styles.panel} intensity={60}>
              {items.map((it, i) => (
                <Press
                  key={it.label}
                  pressScale={0.98}
                  onPress={() => {
                    haptic.light();
                    it.onPress();
                    if (it.on === undefined) setOpen(false); // actions close the menu; switches stay so you see the change
                  }}
                  accessibilityRole={it.on === undefined ? 'button' : 'switch'}
                  accessibilityState={it.on === undefined ? undefined : { checked: it.on }}
                  accessibilityLabel={it.note ? `${it.label}. ${it.note}` : it.label}
                  style={[styles.row, i > 0 && styles.rowLine]}>
                  <Icon name={it.icon} size={20} color={WHITE} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{it.label}</Text>
                    {it.note ? <Text style={styles.note}>{it.note}</Text> : null}
                  </View>
                  {it.on !== undefined && (
                    <View style={[styles.state, it.on && styles.stateOn]}>
                      <Text style={[styles.stateText, it.on && { color: '#16131A' }]}>{it.on ? 'On' : 'Off'}</Text>
                    </View>
                  )}
                </Press>
              ))}
            </Glass>
          </Animated.View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', top: -2000, left: -2000, right: -2000, bottom: -2000 },
  panelWrap: { position: 'absolute', right: 0, width: 260 },
  panel: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
  label: { color: WHITE, fontSize: 16, fontWeight: '600' },
  note: { color: 'rgba(245,245,242,0.7)', fontSize: 13, marginTop: 1 },
  state: { minWidth: 40, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  stateOn: { backgroundColor: '#FFAE85' },
  stateText: { color: WHITE, fontSize: 12.5, fontWeight: '800' },
});
