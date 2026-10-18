import { notifyAccountSuspension, requestJson } from '../api/httpClient';

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'unauthorized';
export type RealtimeEvent = { type: 'sync' | 'chat.changed' | 'chat.typing' | 'presence.changed' | 'booking.changed' | 'notifications.changed' | 'moderation.changed'; partner_id?: string; message_id?: string; booking_id?: string; is_typing?: boolean; is_online?: boolean | null; expires_in?: number };
export interface SocketLike {
  onopen: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  send(data: string): void;
  close(): void;
}

/** First-frame JWT auth avoids putting access tokens in URLs or proxy logs. */
export class RealtimeClient {
  status: RealtimeStatus = 'idle';
  private token: string | null = null;
  private active = true;
  private socket: SocketLike | null = null;
  private generation = 0;
  private attempt = 0;
  private retry?: ReturnType<typeof setTimeout>;
  private authTimeout?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private lastSeen = 0;
  private authenticated = false;
  private events = new Set<(event: RealtimeEvent) => void>();
  private statuses = new Set<(status: RealtimeStatus) => void>();
  private presenceWatches = new Map<symbol, string[]>();
  private account: string | null = null;
  private presence = new Map<string, { online: boolean; expires: number }>();
  private presenceRevision = 0;
  constructor(private baseUrl: string, private factory: (url: string) => SocketLike = url => new WebSocket(url)) {}
  subscribe(listener: (event: RealtimeEvent) => void) { this.events.add(listener); return () => { this.events.delete(listener); }; }
  subscribeStatus(listener: (status: RealtimeStatus) => void) { this.statuses.add(listener); return () => { this.statuses.delete(listener); }; }
  getPresence(account: string | null, partnerId: string): boolean | undefined {
    if (!account || account !== this.account || !this.active) return undefined;
    const value = this.presence.get(partnerId);
    return value && value.expires > Date.now() ? value.online : undefined;
  }
  getPresenceRevision(): number { return this.presenceRevision; }
  recordPresence(account: string | null, partnerId: string, online: unknown, expectedRevision = this.presenceRevision): void {
    if (!account || account !== this.account || !this.active || !partnerId || expectedRevision !== this.presenceRevision) return;
    this.presenceRevision++;
    if (typeof online === 'boolean') this.presence.set(partnerId, { online, expires: Date.now() + 65000 });
    else this.presence.delete(partnerId);
    this.events.forEach(listener => listener({ type: 'presence.changed', partner_id: partnerId, is_online: typeof online === 'boolean' ? online : null }));
  }
  watchPresence(partnerIds: string[]) {
    const key = Symbol();
    this.presenceWatches.set(key, partnerIds);
    this.sendPresenceWatch();
    return () => { this.presenceWatches.delete(key); this.sendPresenceWatch(); };
  }
  private sendPresenceWatch() {
    if (this.status !== 'connected' || !this.socket) return;
    const partner_ids = [...new Set([...this.presenceWatches.values()].flat())].slice(-100);
    try { this.socket.send(JSON.stringify({ type: 'presence.watch', partner_ids })); } catch { /* Heartbeat reconnects. */ }
  }
  private setStatus(status: RealtimeStatus) {
    if (status !== 'connected') { this.presence.clear(); this.presenceRevision++; }
    this.status = status; this.statuses.forEach(listener => listener(status));
  }
  start(token: string | null, account: string | null = token) {
    if (token === this.token && account === this.account && this.socket) return;
    this.dispose(); this.token = token; this.account = account; this.attempt = 0;
    if (token && this.active) this.connect(); else this.setStatus('idle');
  }
  stop() { this.dispose(); this.token = null; this.account = null; this.setStatus('idle'); }
  setActive(active: boolean) {
    if (active === this.active) return;
    this.active = active; this.dispose();
    if (active && this.token) this.connect(); else this.setStatus('idle');
  }
  private dispose() {
    this.generation++;
    clearTimeout(this.retry); clearTimeout(this.authTimeout); clearInterval(this.heartbeat);
    this.retry = undefined; this.authTimeout = undefined; this.heartbeat = undefined;
    this.authenticated = false;
    const socket = this.socket; this.socket = null;
    if (socket) { socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null; socket.close(); }
  }
  private connect() {
    if (!this.token || !this.active) return;
    const generation = ++this.generation;
    const valid = () => generation === this.generation && !!this.token && this.active;
    this.setStatus(this.attempt ? 'reconnecting' : 'connecting');
    const url = this.baseUrl.replace(/\/+$/, '').replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/ws/events/';
    let socket: SocketLike;
    const reconnect = () => {
      if (!valid()) return;
      this.dispose(); this.setStatus('reconnecting');
      const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempt++, 5)) + Math.floor(Math.random() * 500);
      this.retry = setTimeout(() => this.connect(), delay);
    };
    try { socket = this.factory(url); this.socket = socket; } catch { reconnect(); return; }
    this.authTimeout = setTimeout(reconnect, 8000);
    socket.onopen = () => { if (valid()) socket.send(JSON.stringify({ type: 'authenticate', token: this.token })); };
    socket.onmessage = event => {
      if (!valid()) return;
      let data: any;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
      this.lastSeen = Date.now();
      if (data.type === 'ready') {
        clearTimeout(this.authTimeout); this.attempt = 0; this.authenticated = true; this.setStatus('connected');
        if (this.presenceWatches.size) this.sendPresenceWatch();
        this.events.forEach(listener => listener({ type: 'sync' }));
        clearInterval(this.heartbeat);
        this.heartbeat = setInterval(() => {
          if (!valid()) return;
          if (Date.now() - this.lastSeen > 65000) { reconnect(); return; }
          try { socket.send(JSON.stringify({ type: 'ping' })); } catch { reconnect(); }
        }, 25000);
      } else if (this.status === 'connected' && ['chat.changed', 'chat.typing', 'presence.changed', 'booking.changed', 'notifications.changed', 'moderation.changed'].includes(data.type)) {
        if (data.type === 'presence.changed' && typeof data.partner_id === 'string') this.recordPresence(this.account, data.partner_id, data.is_online);
        else this.events.forEach(listener => listener(data as RealtimeEvent));
      }
    };
    socket.onclose = event => {
      if (!valid()) return;
      const wasAuthenticated = this.authenticated;
      const suspended = wasAuthenticated && event.code === 4403;
      if ([4401, 4403, 4400].includes(event.code)) {
        this.dispose();
        if (suspended) notifyAccountSuspension(403, { code: 'account_suspended', detail: 'Your account is suspended. Contact SerbiSure Support for assistance.' });
        else if (wasAuthenticated && event.code === 4401 && this.token) {
          // 4401 can also be a token expiry. Ask the authoritative API once so
          // a missed moderation event still reaches the suspension boundary.
          void requestJson('/api/v1/chat/safety/status/', { token: this.token }).catch(() => { });
        }
        this.setStatus('unauthorized');
      }
      else reconnect();
    };
    socket.onerror = reconnect;
  }
}
