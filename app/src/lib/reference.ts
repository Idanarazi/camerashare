// Reference photo ("make it like this"): the director picks a photo, it's shrunk to a small JPEG,
// and the camera phone can lay it over the live picture to copy the pose.
// It travels through the PicMe server only to be handed over; the server never keeps it.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_CHARS = 1_400_000; // the server refuses anything bigger

/** Opens the photo library. Returns a JPEG data URL, or null if nothing was picked. */
export async function pickReference(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const a = res.canceled ? null : res.assets?.[0];
  if (!a) return null;
  const long = Math.max(a.width || 0, a.height || 0);
  for (const [side, quality] of [[1080, 0.72], [720, 0.6]] as const) {
    let ctx = ImageManipulator.manipulate(a.uri);
    if (!long || long > side) ctx = (a.width || 0) >= (a.height || 0) ? ctx.resize({ width: side }) : ctx.resize({ height: side });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });
    if (out.base64) {
      const data = `data:image/jpeg;base64,${out.base64}`;
      if (data.length <= MAX_CHARS) return data;
    }
  }
  return null;
}
