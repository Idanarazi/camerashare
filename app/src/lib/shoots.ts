// Your shoots: each one is a set of photos from one session, newest first.
// Real shoots get saved here once photos arrive in the app (phase 3). Until then, the
// "Show demo shoots" switch in Settings fills Home with sample ones so the layout can be tried.
import type { ImageSource } from 'expo-image';

import { useSettings } from './settings';
import { SAMPLE_PHOTOS } from './samples';

export type ShootPhoto = { key: string; src: ImageSource; fav: boolean };
export type Shoot = { id: string; at: number; photos: ShootPhoto[]; demo?: boolean };

const DAY = 24 * 60 * 60 * 1000;
const pick = (prefixes: string[]) => SAMPLE_PHOTOS.filter((p) => prefixes.some((x) => p.key.startsWith(x)));

function demoShoots(): Shoot[] {
  const today = new Date();
  today.setHours(18, 42, 0, 0);
  return [
    { id: 'demo-1', at: today.getTime(), photos: pick(['lake', 'city']), demo: true },
    { id: 'demo-2', at: today.getTime() - 2 * DAY - 3 * 60 * 60 * 1000, photos: pick(['beach']), demo: true },
    { id: 'demo-3', at: today.getTime() - 9 * DAY + 2 * 60 * 60 * 1000, photos: pick(['mountain']), demo: true },
  ];
}

export function useShoots(): Shoot[] {
  const { settings } = useSettings();
  const real: Shoot[] = [];
  return settings.demoShoots ? [...real, ...demoShoots()] : real;
}

export function findShoot(shoots: Shoot[], id: string | undefined) {
  return shoots.find((s) => s.id === id);
}

/** The photo that represents a shoot: the first favorite, or the first photo. */
export function cover(shoot: Shoot) {
  return shoot.photos.find((p) => p.fav) ?? shoot.photos[0];
}

export const favCount = (shoot: Shoot) => shoot.photos.filter((p) => p.fav).length;

/** "Today, 18:42", "Yesterday", "Saturday", or "Oct 3". */
export function shootLabel(at: number, withTime = true) {
  const d = new Date(at);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (at >= startOfToday) return withTime ? `Today, ${time}` : 'Today';
  if (at >= startOfToday - DAY) return withTime ? `Yesterday, ${time}` : 'Yesterday';
  if (at >= startOfToday - 6 * DAY) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
