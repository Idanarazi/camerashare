// The soft colored glow behind each screen (the look's "light"). Pure drawing, never touchable.
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/lib/settings';

export function Backdrop() {
  const t = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]} pointerEvents="none">
      {t.glow.length > 0 && (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            {t.glow.map((g, i) => (
              <RadialGradient key={i} id={`${uid}g${i}`} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fx={g.cx} fy={g.cy} gradientUnits="objectBoundingBox">
                <Stop offset="0" stopColor={g.color} stopOpacity={g.opacity} />
                <Stop offset="0.7" stopColor={g.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {t.glow.map((_, i) => (
            <Rect key={i} x="0" y="0" width="100%" height="100%" fill={`url(#${uid}g${i})`} />
          ))}
        </Svg>
      )}
    </View>
  );
}
