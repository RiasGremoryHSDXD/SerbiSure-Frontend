import type * as FileSystem from 'expo-file-system';

interface Options {
  fs: typeof FileSystem;
  url: string;
  token: string;
  isCurrent: () => boolean;
  openPdf: ((path: string) => Promise<unknown>) | null;
}

/** Download only into private app cache, then grant a viewer access to that file. */
export async function viewWorkerCvPdf({ fs, url, token, isCurrent, openPdf }: Options): Promise<void> {
  if (!openPdf) throw new Error('Please install the updated SerbiSure app to view PDFs.');
  if (!fs.cacheDirectory) throw new Error('PDF viewing is unavailable in this app version.');
  const cache = fs.cacheDirectory;
  const oldFiles = await fs.readDirectoryAsync(cache);
  await Promise.all(oldFiles.filter(name => {
    const match = /^SerbiSure_CV_(\d+)\.pdf$/.exec(name);
    return match && Number(match[1]) < Date.now() - 86400000;
  }).map(name => fs.deleteAsync(cache + name, { idempotent: true }).catch(() => {})));
  if (!isCurrent()) return;
  const path = `${cache}SerbiSure_CV_${Date.now()}.pdf`;
  let opened = false;
  try {
    const file = await fs.downloadAsync(url, path, { headers: { Authorization: `Bearer ${token}` } });
    if (file.status !== 200) throw new Error(file.status === 401 ? 'Your session expired. Sign in again to view your CV.' : 'Could not generate your PDF. Please try again.');
    if (!isCurrent()) return;
    await openPdf(path);
    opened = true;
  } finally {
    // Keep successfully opened files for viewers that continue reading after returning.
    if (!opened) await fs.deleteAsync(path, { idempotent: true }).catch(() => {});
  }
}
