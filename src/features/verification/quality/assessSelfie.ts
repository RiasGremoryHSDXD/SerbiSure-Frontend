import { AlphaType, ColorType, Skia, type SkImage } from '@shopify/react-native-skia';
import { assessPortraitPixels, type SelfieQuality } from './selfieQuality';

export async function assessSelfie(path: string): Promise<SelfieQuality> {
  const data = await Skia.Data.fromURI(path);
  let image: ReturnType<typeof Skia.Image.MakeImageFromEncoded> = null;
  let surface: ReturnType<typeof Skia.Surface.Make> = null;
  let snapshot: SkImage | null = null;
  let paint: ReturnType<typeof Skia.Paint> | null = null;
  try {
    image = Skia.Image.MakeImageFromEncoded(data);
    if (!image || Math.min(image.width(), image.height()) < 240) return 'unreadable';
    const size = 160;
    surface = Skia.Surface.Make(size, size);
    if (!surface) return 'unreadable';
    paint = Skia.Paint();
    // A centered square avoids depending on JPEG sensor/EXIF rotation and
    // excludes outer background. Liveness already requires a centered face.
    const side = Math.min(image.width(), image.height()) * 0.64;
    surface.getCanvas().drawImageRect(image,
      { x: (image.width() - side) / 2, y: (image.height() - side) / 2, width: side, height: side },
      { x: 0, y: 0, width: size, height: size }, paint);
    surface.flush();
    snapshot = surface.makeImageSnapshot();
    const pixels = snapshot.readPixels(0, 0, { width: size, height: size, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Opaque });
    return pixels instanceof Uint8Array ? assessPortraitPixels(pixels, size, size) : 'unreadable';
  } finally {
    snapshot?.dispose();
    paint?.dispose();
    surface?.dispose();
    image?.dispose();
    data.dispose();
  }
}
