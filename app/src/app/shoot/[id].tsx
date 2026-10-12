// One of your shoots, opened from Home.
import { Redirect, useLocalSearchParams } from 'expo-router';

import { ShootView } from '@/components/shoot-view';
import { favorite } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { findShoot, shootLabel, useShoots } from '@/lib/shoots';

export default function ShootScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const shoot = findShoot(useShoots(), id);
  if (!shoot) return <Redirect href="/" />;
  const uriOf = (key: string) => {
    const src = shoot.photos.find((p) => p.key === key)?.src;
    return src && typeof src === 'object' && 'uri' in src ? (src.uri ?? undefined) : undefined;
  };
  return (
    <ShootView
      title={shootLabel(shoot.at)}
      photos={shoot.photos}
      badge={shoot.demo ? 'Demo' : undefined}
      onFav={shoot.demo ? undefined : (key, fav) => favorite(shoot.id, key, uriOf(key), fav, settings.autoSave)}
    />
  );
}
