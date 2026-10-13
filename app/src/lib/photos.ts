// Saving photos to the iPhone's Photos app: one at a time, a selection, a whole shoot, or every ♥
// automatically (Settings › "Save favorites to Photos"). Asks only for "add photos" access.
import { Platform } from 'react-native';

import { setFav } from './shoots';

async function allowed() {
  const ML = require('expo-media-library/legacy') as typeof import('expo-media-library/legacy');
  const perm = await ML.requestPermissionsAsync(true);
  return perm.granted ? ML : null;
}

/** Save photos to Photos. Returns how many were saved (0 when not allowed or not possible here). */
export async function saveToPhotos(uris: (string | undefined)[]) {
  const list = uris.filter((u): u is string => !!u);
  if (!list.length) return 0;
  if (Platform.OS === 'web') return list.length; // the web preview has no Photos app; pretend it worked
  try {
    const ML = await allowed();
    if (!ML) return 0;
    let saved = 0;
    for (const uri of list) {
      try {
        await ML.saveToLibraryAsync(uri);
        saved++;
      } catch {}
    }
    return saved;
  } catch {
    return 0;
  }
}

/** ♥ or un-♥ a photo in one of your shoots; a new ♥ also goes to Photos when that's switched on. */
export function favorite(shootId: string, key: string, uri: string | undefined, fav: boolean, autoSave: boolean) {
  setFav(shootId, key, fav);
  if (fav && autoSave && uri) void saveToPhotos([uri]);
}
