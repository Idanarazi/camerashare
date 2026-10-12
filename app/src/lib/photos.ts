// Saving a photo you ♥ to the iPhone's Photos app (Settings › "Save favorites to Photos").
// Asks only for "add photos" access, never to read your library.
import { Platform } from 'react-native';

import { setFav } from './shoots';

async function saveToPhotos(uri: string) {
  if (Platform.OS === 'web') return false;
  try {
    const ML = require('expo-media-library/legacy') as typeof import('expo-media-library/legacy');
    const perm = await ML.requestPermissionsAsync(true);
    if (!perm.granted) return false;
    await ML.saveToLibraryAsync(uri);
    return true;
  } catch {
    return false;
  }
}

/** ♥ or un-♥ a photo in one of your shoots; a new ♥ also goes to Photos when that's switched on. */
export function favorite(shootId: string, key: string, uri: string | undefined, fav: boolean, autoSave: boolean) {
  setFav(shootId, key, fav);
  if (fav && autoSave && uri) void saveToPhotos(uri);
}
