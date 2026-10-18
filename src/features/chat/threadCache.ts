import type { ChatMessage } from './components/ChatDetailScreen';

// Session-only history, bounded so long app sessions cannot retain every thread.
const histories = new Map<string, ChatMessage[]>();
const MAX_THREADS = 20;
let generation = 0;

export function threadCacheGeneration(): number { return generation; }

export function getCachedThread(key: string): ChatMessage[] | null {
  const messages = histories.get(key);
  if (!messages) return null;
  histories.delete(key);
  histories.set(key, messages);
  return messages;
}

export function cacheThread(key: string, messages: ChatMessage[], expectedGeneration: number): void {
  if (generation !== expectedGeneration) return;
  const saved = messages.filter(message => !message.id.startsWith('temp-') && !message.isUploading && !message.isTyping);
  histories.delete(key);
  histories.set(key, saved);
  if (histories.size > MAX_THREADS) histories.delete(histories.keys().next().value!);
}

export function forgetCachedThread(key: string): void { histories.delete(key); }

export function clearThreadCache(): void {
  generation++;
  histories.clear();
}
