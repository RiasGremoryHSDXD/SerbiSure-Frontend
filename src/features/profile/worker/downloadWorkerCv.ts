import type * as FileSystem from 'expo-file-system';
import type * as Sharing from 'expo-sharing';

interface Options {
  platform: string;
  url: string;
  token: string;
  format: 'pdf' | 'csv';
  fs: typeof FileSystem;
  getSharing: () => typeof Sharing | null;
  isCurrent: () => boolean;
}

/** Android saves through its folder picker; only iOS needs ExpoSharing. */
export async function downloadWorkerCv({ platform, url, token, format, fs, getSharing, isCurrent }: Options): Promise<'saved' | 'shared' | 'cancelled'> {
  if (!fs.cacheDirectory) throw new Error('File downloads are unavailable. Please install the latest SerbiSure app.');
  const sharing = platform === 'android' ? null : getSharing();
  if (platform !== 'android' && (!sharing || !await sharing.isAvailableAsync())) {
    throw new Error('File sharing is unavailable in this app version. Please install the latest SerbiSure app.');
  }
  const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
  const cacheDirectory = fs.cacheDirectory;
  // Restrict cleanup to our own expired temporary exports.
  const oldFiles = await fs.readDirectoryAsync(cacheDirectory);
  await Promise.all(oldFiles.filter(name => {
    const stamp = /^SerbiSure_CV_(\d+)\.(pdf|csv)$/.exec(name);
    return stamp && Number(stamp[1]) < Date.now() - 86400000;
  }).map(name => fs.deleteAsync(cacheDirectory + name, { idempotent: true }).catch(() => {})));
  if (!isCurrent()) return 'cancelled';
  const path = `${cacheDirectory}SerbiSure_CV_${Date.now()}.${format}`;
  let shared = false;
  let destination: string | null = null;
  try {
    const file = await fs.downloadAsync(url, path, { headers: { Authorization: `Bearer ${token}` } });
    if (file.status !== 200) {
      throw new Error(file.status === 401 ? 'Your session expired. Sign in again to download your CV.' : 'Could not generate your CV. Please try again.');
    }
    if (!isCurrent()) return 'cancelled';
    if (platform === 'android') {
      const permission = await fs.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted || !isCurrent()) return 'cancelled';
      // Base64 preserves PDF bytes and the CSV's UTF-8 BOM across content:// URIs.
      const contents = await fs.readAsStringAsync(path, { encoding: fs.EncodingType.Base64 });
      if (!isCurrent()) return 'cancelled';
      destination = await fs.StorageAccessFramework.createFileAsync(permission.directoryUri, 'SerbiSure_CV', mimeType);
      await fs.StorageAccessFramework.writeAsStringAsync(destination, contents, { encoding: fs.EncodingType.Base64 });
      destination = null; // Keep the user's successfully saved file.
      return 'saved';
    }
    await sharing!.shareAsync(path, {
      mimeType,
      UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
      dialogTitle: 'Save or share your SerbiSure CV',
    });
    shared = true;
    return 'shared';
  } finally {
    // Remove a failed partial save. A receiving iOS app may still be reading a shared file.
    if (destination) await fs.deleteAsync(destination, { idempotent: true }).catch(() => {});
    if (!shared) await fs.deleteAsync(path, { idempotent: true }).catch(() => {});
  }
}
