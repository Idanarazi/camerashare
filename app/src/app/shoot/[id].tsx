// One of your shoots, opened from Home.
import { Redirect, useLocalSearchParams } from 'expo-router';

import { ShootView } from '@/components/shoot-view';
import { favorite, saveToPhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { findShoot, removePhotos, removeShoot, shootLabel, useShoots } from '@/lib/shoots';

export default function ShootScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const shoot = findShoot(useShoots(), id);
  if (!shoot) return <Redirect href="/" />;
  const uriOf = (key: string) => shoot.photos.find((p) => p.key === key)?.uri;
  return (
    <ShootView
      title={shootLabel(shoot.at)}
      photos={shoot.photos}
      badge={shoot.demo ? 'Demo' : undefined}
      onFav={shoot.demo ? undefined : (key, fav) => favorite(shoot.id, key, uriOf(key), fav, settings.autoSave)}
      actions={
        shoot.demo
          ? undefined
          : {
              save: (keys) => saveToPhotos(keys.map(uriOf)),
              remove: (keys) => removePhotos(shoot.id, keys),
              removeShoot: () => removeShoot(shoot.id),
            }
      }
    />
  );
}
