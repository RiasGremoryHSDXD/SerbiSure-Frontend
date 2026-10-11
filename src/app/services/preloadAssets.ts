import { preloadImage } from '../../shared/utils/imagePreloader';
import { chatStore } from '../../features/chat/store/chatStore';

const inFlight = new Set<string>();
export async function preloadPostLoginAssets(token?: string | null, userAvatarUrl?: string | null) {
  const key = token || userAvatarUrl || 'anonymous';
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    if (userAvatarUrl) void preloadImage(userAvatarUrl);
    if (token) await chatStore.loadInbox(token);
  } catch (error) { console.log('[preloadAssets] Preload error:', error); }
  finally { inFlight.delete(key); }
}
