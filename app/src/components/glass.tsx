// Translucent material for controls floating over photos or scrolling content.
// Falls back to a solid surface when "Reduce Transparency" is on.
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useReducedTransparency } from '@/lib/motion';

export function Glass({ children, style, tone = 'dark', intensity = 40 }: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'dark' | 'light';
  intensity?: number;
}) {
  const solid = useReducedTransparency();
  const edge = tone === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.55)';
  if (solid) {
    return <View style={[{ backgroundColor: tone === 'dark' ? '#1D1D20' : '#FFFFFF', borderColor: edge }, style]}>{children}</View>;
  }
  return (
    <View style={[{ overflow: 'hidden', borderColor: edge }, style]}>
      {/* zIndex -1 keeps the material behind the content on every platform */}
      <BlurView tint={tone === 'dark' ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} intensity={intensity} style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />
      <View style={[StyleSheet.absoluteFill, { zIndex: -1, backgroundColor: tone === 'dark' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.35)' }]} />
      {children}
    </View>
  );
}
