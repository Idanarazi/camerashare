// PicMe's line icons (same drawings as the website and the app design).
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'home' | 'scan' | 'cam' | 'tripod' | 'gear' | 'chev' | 'left' | 'heart'
  | 'share' | 'close' | 'bolt' | 'level' | 'sound' | 'images' | 'sun' | 'globe' | 'key' | 'arrow' | 'check'
  | 'up' | 'down' | 'closer' | 'back' | 'hand' | 'more' | 'grid' | 'people';

function shapes(name: IconName) {
  switch (name) {
    case 'home':
      return <><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>;
    case 'scan':
      return <><Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><Circle cx="12" cy="10" r="3" /><Path d="M7 18c1-2.5 3-3.5 5-3.5s4 1 5 3.5" /></>;
    case 'cam':
      return <><Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><Circle cx="12" cy="13" r="3.2" /></>;
    case 'tripod':
      return <><Rect x="7" y="2" width="10" height="7" rx="1.5" /><Circle cx="12" cy="5.5" r="1.6" /><Path d="M12 9v4M12 13l-6 9M12 13l6 9M12 13v9" /></>;
    case 'gear':
      return <><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>;
    case 'chev':
      return <Polyline points="9 5 16 12 9 19" />;
    case 'left':
      return <Polyline points="15 5 8 12 15 19" />;
    case 'heart':
      return <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />;
    case 'share':
      return <><Path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><Polyline points="16 6 12 2 8 6" /><Line x1="12" y1="2" x2="12" y2="15" /></>;
    case 'close':
      return <><Line x1="6" y1="6" x2="18" y2="18" /><Line x1="18" y1="6" x2="6" y2="18" /></>;
    case 'bolt':
      return <Path d="M13 2 4 14h7l-1 8 9-12h-7z" />;
    case 'level':
      return <><Line x1="3" y1="12" x2="21" y2="12" /><Line x1="3" y1="9" x2="3" y2="15" /><Line x1="21" y1="9" x2="21" y2="15" /></>;
    case 'sound':
      return <><Path d="M11 5 6 9H2v6h4l5 4V5z" /><Path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>;
    case 'images':
      return <><Rect x="3" y="3" width="18" height="18" rx="2" /><Circle cx="8.5" cy="8.5" r="1.5" /><Polyline points="21 15 16 10 5 21" /></>;
    case 'sun':
      return <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>;
    case 'key':
      return <><Rect x="3" y="6" width="18" height="12" rx="2" /><Path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></>;
    case 'arrow':
      return <Path d="M7 17 17 7M8 7h9v9" />;
    case 'check':
      return <Polyline points="5 12.5 10 17 19 7" />;
    case 'up':
      return <Polyline points="5 15 12 8 19 15" />;
    case 'down':
      return <Polyline points="5 9 12 16 19 9" />;
    case 'closer':
      return <><Path d="M15 3h6v6M9 21H3v-6" /><Path d="M21 3l-7 7M3 21l7-7" /></>;
    case 'back':
      return <><Path d="M4 14h6v6M20 10h-6V4" /><Path d="M14 10l7-7M3 21l7-7" /></>;
    case 'hand':
      return <><Path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" /><Path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></>;
    case 'more':
      return <><Circle cx="5" cy="12" r="1.2" /><Circle cx="12" cy="12" r="1.2" /><Circle cx="19" cy="12" r="1.2" /></>;
    case 'grid':
      return <><Rect x="3" y="3" width="18" height="18" rx="2.5" /><Path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>;
    case 'people':
      return <><Circle cx="9" cy="8" r="3.2" /><Path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><Path d="M16 4.6a3.2 3.2 0 0 1 0 6.2M21 20c0-2.9-1.8-5.3-4.4-6" /></>;
    case 'globe':
      return <><Circle cx="12" cy="12" r="9" /><Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>;
  }
}

export function Icon({ name, size = 24, color, strokeWidth = 2, fill = 'none' }: { name: IconName; size?: number; color: string; strokeWidth?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {shapes(name)}
    </Svg>
  );
}
