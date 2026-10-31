export type SelfieQuality = 'pass' | 'too-dark' | 'too-blurry' | 'unreadable';

// Deliberately conservative capture heuristics, not biometric quality scores.
// Analyze a small central portrait sample only after taking the final photo.
export function assessPortraitPixels(rgba: Uint8Array, width: number, height: number): SelfieQuality {
  if (width < 3 || height < 3 || rgba.length !== width * height * 4) return 'unreadable';
  const luminance = new Float32Array(width * height);
  const histogram = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < luminance.length; i++) {
    const p = i * 4;
    const value = 0.299 * rgba[p]! + 0.587 * rgba[p + 1]! + 0.114 * rgba[p + 2]!;
    luminance[i] = value;
    histogram[Math.min(255, Math.round(value))]!++;
    total += value;
  }
  let cumulative = 0;
  let percentile90 = 255;
  for (let value = 0; value < histogram.length; value++) {
    cumulative += histogram[value]!;
    if (cumulative >= luminance.length * 0.9) { percentile90 = value; break; }
  }
  // Normal dim indoor photos and darker skin tones are not rejected merely
  // for being below average brightness. Both conditions must be extreme.
  if (total / luminance.length < 18 && percentile90 < 35) return 'too-dark';

  let sum = 0, sumSquares = 0, gradient = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const center = luminance[i]!;
      const laplacian = luminance[i - 1]! + luminance[i + 1]! + luminance[i - width]! + luminance[i + width]! - 4 * center;
      sum += laplacian;
      sumSquares += laplacian * laplacian;
      gradient += Math.abs(luminance[i + 1]! - center) + Math.abs(luminance[i + width]! - center);
      count++;
    }
  }
  const variance = sumSquares / count - (sum / count) ** 2;
  // Block near-featureless, severely smeared samples; mild softness is allowed.
  return variance < 2 && gradient / (2 * count) < 1 ? 'too-blurry' : 'pass';
}

export function selfieQualityMessage(quality: SelfieQuality): string {
  if (quality === 'too-dark') return 'Your photo is very dark. Face a light or window and take another photo.';
  if (quality === 'too-blurry') return 'Your photo is very blurry. Wipe the camera and take another photo.';
  if (quality === 'unreadable') return 'We could not check this photo. Please take another one.';
  return 'Can you clearly see your face? If yes, use this photo.';
}
