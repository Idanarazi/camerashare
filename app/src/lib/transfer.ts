// Photos going from the camera phone to the directing phone during a session.
// Until live video arrives (it needs the developer account), they travel through the PicMe
// server: each photo is shrunk to a sharp-on-a-phone size, handed over, and never kept there.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const LONG_SIDE = 2048;
const MAX_CHARS = 3_800_000; // the server refuses anything bigger

/** A camera photo → a JPEG data URL small enough to send, or null. */
export async function shrinkForSending(uri: string, width?: number, height?: number): Promise<string | null> {
  for (const [side, quality] of [[LONG_SIDE, 0.82], [1600, 0.75]] as const) {
    try {
      let ctx = ImageManipulator.manipulate(uri);
      const long = Math.max(width || 0, height || 0);
      if (!long || long > side) ctx = (width || 0) >= (height || 0) ? ctx.resize({ width: side }) : ctx.resize({ height: side });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });
      if (out.base64) {
        const data = `data:image/jpeg;base64,${out.base64}`;
        if (data.length <= MAX_CHARS) return data;
      }
    } catch {
      return null;
    }
  }
  return null;
}
