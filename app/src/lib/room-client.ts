// Pairing two phones through the PicMe server. Speaks the exact same messages as the website,
// so an app phone can pair with a website phone and the other way round.
// Plain TypeScript with no React, so it can be tested on its own.
import type { Command } from './directing';

export type Role = 'photographer' | 'director';

/** Things the other phone did, besides guiding. */
export type PartnerEvent =
  | { kind: 'reference'; data: string | null } // camera phone: the director sent (or removed) a reference photo
  | { kind: 'shot'; count: number } // directing phone: the camera person took photos themselves
  | { kind: 'photo'; burst: string; index: number; count: number; data: string } // directing phone: a photo arrived
  | { kind: 'swap-request' } // the other phone wants to switch roles
  | { kind: 'swap-declined' };
export type Mode = 'photo' | 'tripod';

export type RoomState =
  | { kind: 'connecting'; slow: boolean } // slow = the free server is waking up
  | { kind: 'waiting'; code: string; joinUrl: string; mode: Mode } // camera phone, showing its code
  | { kind: 'knock'; code: string; joinUrl: string; mode: Mode } // camera phone: someone typed the code
  | { kind: 'knocking'; code: string } // directing phone: waiting to be let in
  | { kind: 'connected'; code: string; mode: Mode; partnerAway: boolean }
  | { kind: 'reconnecting' }
  | { kind: 'switching' } // roles were just switched; waiting for the other phone to come back in its new role
  | { kind: 'swap'; role: Role; code: string; token: string } // open the other screen with this session
  | { kind: 'error'; message: string } // something to fix and try again
  | { kind: 'ended'; message: string }; // session over

type Session = { code: string; token: string; mode: Mode };

const SLOW_AFTER_MS = 4000;
const GIVE_UP_AFTER_TRIES = 6;

export function joinUrl(server: string, code: string, key?: string) {
  return `${server}/director.html?code=${encodeURIComponent(code)}${key ? `&k=${encodeURIComponent(key)}` : ''}`;
}

/** Turns what was typed into a code the server accepts: "Lake wren 7698 cove" → "lake-wren-7698-cove". */
export function normalizeCode(text: string) {
  return text.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

/** Reads a scanned QR: a PicMe join link, or a bare code. Returns null for anything else. */
export function parseJoin(text: string): { code: string; key?: string } | null {
  const raw = (text || '').trim();
  try {
    const u = new URL(raw);
    if (!/director(\.html)?$/.test(u.pathname)) return null;
    const code = u.searchParams.get('code');
    if (!code) return null;
    return { code: normalizeCode(code), key: u.searchParams.get('k') || undefined };
  } catch {
    const code = normalizeCode(raw);
    return /^[a-z]+-[a-z]+-\d{4}-[a-z]+$/.test(code) ? { code } : null;
  }
}

export class RoomClient {
  private ws: WebSocket | null = null;
  private session: Session | null = null;
  private key: string | undefined;
  private state: RoomState = { kind: 'connecting', slow: false };
  private closedByUs = false;
  private tries = 0;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private opts: {
      server: string; // https://picme-hq53.onrender.com
      role: Role;
      mode?: Mode; // camera phone only
      code?: string; // directing phone only
      key?: string; // directing phone only: the one-time key from the QR, skips the knock
      session?: { code: string; token: string; mode: Mode }; // continue a session in a new role (after switching roles)
      onState: (s: RoomState) => void;
      onCommand?: (command: Command, data?: any) => void; // camera phone: the director guided or pressed the shutter
      onEvent?: (e: PartnerEvent) => void;
      WebSocketImpl?: typeof WebSocket;
    },
  ) {
    this.key = opts.key;
    if (opts.session) {
      this.session = opts.session;
      this.switching = true;
    }
  }
  private switching = false;

  get current() {
    return this.state;
  }

  start() {
    this.closedByUs = false;
    this.connect();
  }

  /** Camera phone: let the person who typed the code in, or not. */
  answerKnock(allowed: boolean) {
    this.send({ type: 'knock-response', allowed });
    if (!allowed && this.state.kind === 'knock') this.set({ ...this.state, kind: 'waiting' });
  }

  /** Directing phone: guide the camera phone or start the countdown. False if not connected right now. */
  sendCommand(command: Command, data?: object) {
    if (this.opts.role !== 'director' || this.state.kind !== 'connected' || this.state.partnerAway) return false;
    return this.send({ type: 'command', command, data });
  }

  /** Directing phone: show the camera phone a photo to copy (a shrunk data URL), or null to take it away. */
  sendReference(data: string | null) {
    if (this.opts.role !== 'director' || this.state.kind !== 'connected') return false;
    return data ? this.send({ type: 'ref', data }) : this.send({ type: 'ref-clear' });
  }

  /** Camera phone: let the director know photos were taken here. */
  announceShot(count: number) {
    if (this.opts.role !== 'photographer' || this.state.kind !== 'connected') return false;
    return this.send({ type: 'camera-event', event: 'shot', count });
  }

  /** Camera phone: hand one photo to the directing phone (a shrunk JPEG data URL). */
  sendPhoto(burst: string, index: number, count: number, data: string) {
    if (this.opts.role !== 'photographer' || this.state.kind !== 'connected') return false;
    return this.send({ type: 'photo', burst, index, count, data });
  }

  /** Ask to switch roles; the other phone decides. */
  requestSwap() {
    if (this.state.kind !== 'connected' || this.state.mode !== 'photo') return false;
    return this.send({ type: 'swap-request' });
  }

  answerSwap(accept: boolean) {
    this.send({ type: 'swap-response', accept });
  }

  /** End things cleanly: the server tells the other phone. */
  leave() {
    if (this.state.kind === 'knocking') this.send({ type: 'cancel-knock' });
    else this.send({ type: 'leave' });
    this.stop();
  }

  /** Close without telling anyone (screen closed): the server keeps the session for a few minutes. */
  stop() {
    this.closedByUs = true;
    this.clearTimers();
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
  }

  /** App came back to the foreground: reconnect right away if the connection dropped. */
  wake() {
    if (this.closedByUs) return;
    if (!this.ws || this.ws.readyState > 1) {
      this.tries = 0;
      this.connect();
    }
  }

  // ── internals ──────────────────────────────────────────────

  private set(s: RoomState) {
    this.state = s;
    this.opts.onState(s);
  }

  private send(msg: object) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  /** Camera phone: tell the directing phone there's no live picture yet, so a website director still unlocks its controls. */
  private announceCamera() {
    this.send({ type: 'camera-info', video: false });
  }

  private clearTimers() {
    if (this.slowTimer) clearTimeout(this.slowTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.slowTimer = this.retryTimer = null;
  }

  private joinLink(code: string) {
    return joinUrl(this.opts.server, code, this.key);
  }

  private connect() {
    this.clearTimers();
    const WS = this.opts.WebSocketImpl ?? WebSocket;
    const url = this.opts.server.replace(/^http/, 'ws');
    if (this.switching) {
      this.set({ kind: 'switching' });
    } else if (!this.session) {
      this.set({ kind: 'connecting', slow: false });
      this.slowTimer = setTimeout(() => {
        if (this.state.kind === 'connecting') this.set({ kind: 'connecting', slow: true });
      }, SLOW_AFTER_MS);
    } else if (this.state.kind === 'connected' || this.state.kind === 'waiting') {
      // keep showing the screen; the UI can show a small "reconnecting" note
    } else {
      this.set({ kind: 'reconnecting' });
    }

    let ws: WebSocket;
    try {
      ws = new WS(url);
    } catch {
      this.retry();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.tries = 0;
      const s = this.session;
      if (s && this.opts.role === 'photographer') this.send({ type: 'resume-room', code: s.code, token: s.token });
      else if (s && this.opts.role === 'director') this.send({ type: 'rejoin-room', code: s.code, token: s.token });
      else if (this.opts.role === 'photographer') this.send({ type: 'create-room', mode: this.opts.mode ?? 'photo' });
      else this.send({ type: 'join-room', code: normalizeCode(this.opts.code ?? ''), key: this.key });
    };
    ws.onmessage = (e: MessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(String(e.data));
      } catch {
        return;
      }
      this.handle(msg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.closedByUs) return;
      if (this.state.kind === 'ended' || this.state.kind === 'error') return;
      this.retry();
    };
    ws.onerror = () => {
      /* onclose follows */
    };
  }

  private retry() {
    this.tries++;
    if (this.tries > GIVE_UP_AFTER_TRIES) {
      this.clearTimers();
      this.set({ kind: 'error', message: 'Can’t reach PicMe. Check your internet connection and try again.' });
      return;
    }
    const delay = Math.min(1000 * 2 ** (this.tries - 1), 8000);
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private handle(msg: any) {
    const mode: Mode = msg.mode === 'tripod' ? 'tripod' : this.session?.mode ?? this.opts.mode ?? 'photo';
    switch (msg.type) {
      case 'hb':
        this.send({ type: 'hb' });
        break;

      // ── camera phone ──
      case 'room-created':
        this.clearTimers();
        this.session = { code: msg.code, token: msg.token, mode };
        this.key = msg.key;
        this.set({ kind: 'waiting', code: msg.code, joinUrl: this.joinLink(msg.code), mode });
        break;
      case 'room-resumed':
        this.key = msg.key;
        if (msg.directorPresent) {
          this.switching = false;
          this.set({ kind: 'connected', code: msg.code, mode, partnerAway: false });
          this.announceCamera();
        } else if (this.switching) {
          this.set({ kind: 'switching' }); // the other phone is on its way in its new role
        } else this.set({ kind: 'waiting', code: msg.code, joinUrl: this.joinLink(msg.code), mode });
        break;
      case 'room-key':
        this.key = msg.key; // each QR works once; the next scan needs the new key
        if (this.state.kind === 'waiting' && this.session) this.set({ ...this.state, joinUrl: this.joinLink(this.session.code) });
        break;
      case 'knock':
        if (this.session) this.set({ kind: 'knock', code: this.session.code, joinUrl: this.joinLink(this.session.code), mode: this.session.mode });
        break;
      case 'knock-cancelled':
        if (this.state.kind === 'knock' && this.session) this.set({ kind: 'waiting', code: this.session.code, joinUrl: this.joinLink(this.session.code), mode: this.session.mode });
        break;
      case 'director-joined':
        this.switching = false;
        if (this.session) this.set({ kind: 'connected', code: this.session.code, mode: this.session.mode, partnerAway: false });
        this.announceCamera();
        break;
      case 'command':
        if (this.state.kind === 'connected') this.opts.onCommand?.(msg.command, msg.data);
        break;
      case 'ref':
        if (this.state.kind === 'connected' && typeof msg.data === 'string' && msg.data.startsWith('data:image/')) this.opts.onEvent?.({ kind: 'reference', data: msg.data });
        break;
      case 'ref-clear':
        this.opts.onEvent?.({ kind: 'reference', data: null });
        break;
      case 'photo':
        if (this.state.kind === 'connected' && typeof msg.data === 'string' && msg.data.startsWith('data:image/'))
          this.opts.onEvent?.({ kind: 'photo', burst: String(msg.burst), index: Number(msg.index) || 0, count: Number(msg.count) || 1, data: msg.data });
        break;
      case 'swap-request':
        this.opts.onEvent?.({ kind: 'swap-request' });
        break;
      case 'swap-declined':
        this.opts.onEvent?.({ kind: 'swap-declined' });
        break;
      case 'swap-go':
        // Both phones reopen in their new role with the session's new key
        this.session = null;
        this.stop();
        this.set({ kind: 'swap', role: msg.role === 'director' ? 'director' : 'photographer', code: String(msg.code), token: String(msg.token) });
        break;
      case 'camera-event':
        if (msg.event === 'shot') this.opts.onEvent?.({ kind: 'shot', count: Number(msg.count) || 0 });
        break;
      case 'director-away':
        if (this.state.kind === 'connected') this.set({ ...this.state, partnerAway: true });
        break;
      case 'director-gone':
        this.switching = false;
        if (this.session) this.set({ kind: 'waiting', code: this.session.code, joinUrl: this.joinLink(this.session.code), mode: this.session.mode });
        break;
      case 'resume-failed':
      case 'rejoin-failed':
        this.session = null;
        this.stop();
        this.set({ kind: 'ended', message: 'This session ended. Start a new one to keep shooting.' });
        break;

      // ── directing phone ──
      case 'knock-sent':
        this.clearTimers();
        this.set({ kind: 'knocking', code: normalizeCode(this.opts.code ?? '') });
        break;
      case 'room-joined':
        this.clearTimers();
        this.switching = false;
        this.session = { code: msg.code, token: msg.token, mode };
        this.set({ kind: 'connected', code: msg.code, mode, partnerAway: msg.photographerPresent === false });
        this.send({ type: 'director-info', video: false }); // a website camera then sends photos through the server
        break;
      case 'knock-denied':
        this.stop();
        this.set({ kind: 'error', message: msg.message || 'Your partner didn’t let you join.' });
        break;
      case 'photographer-away':
        if (this.state.kind === 'connected') this.set({ ...this.state, partnerAway: true });
        break;
      case 'photographer-back':
        if (this.state.kind === 'connected') this.set({ ...this.state, partnerAway: false });
        break;

      // ── both ──
      case 'error':
        this.stop();
        this.set({ kind: 'error', message: msg.message || 'Something went wrong. Try again.' });
        break;
      case 'session-expired':
        this.session = null;
        this.stop();
        this.set({ kind: 'ended', message: msg.message || 'This session ended.' });
        break;
    }
  }
}
