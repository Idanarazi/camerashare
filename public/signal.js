// PicMe signaling connection: a WebSocket that reconnects by itself.
// Handles locked screens, app switches and flaky mobile data.
(function () {
  'use strict';

  const BACKOFF_MS = [500, 1000, 2000, 4000, 8000, 10000];
  const STALE_MS   = 50000; // server sends "hb" every 20s; silence this long = dead socket

  class Signal {
    constructor({ onOpen, onMessage, onStatus } = {}) {
      this.onOpen    = onOpen    || (() => {});
      this.onMessage = onMessage || (() => {});
      this.onStatus  = onStatus  || (() => {});
      this.ws        = null;
      this.attempt   = 0;
      this.stopped   = true; // nothing happens until connect() is called
      this.retryTimer = null;
      this.lastMsgAt  = 0;
      this.url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

      // Reconnect straight away when the phone wakes up or gets signal back
      const wake = () => { if (!this.stopped && !this.isOpen()) this.reconnectNow(); };
      document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
      window.addEventListener('online', wake);
      window.addEventListener('pageshow', wake);

      this.staleTimer = setInterval(() => {
        if (this.isOpen() && Date.now() - this.lastMsgAt > STALE_MS) this.ws.close();
      }, 10000);
    }

    isOpen() { return this.ws && this.ws.readyState === WebSocket.OPEN; }

    connect() {
      this.stopped = false;
      clearTimeout(this.retryTimer);
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
      const ws = new WebSocket(this.url);
      this.ws = ws;
      this.onStatus(this.attempt ? 'reconnecting' : 'connecting');

      ws.onopen = () => {
        if (ws !== this.ws) return;
        const wasReconnect = this.attempt > 0;
        this.attempt   = 0;
        this.lastMsgAt = Date.now();
        this.onStatus('open');
        this.onOpen(wasReconnect);
      };
      ws.onmessage = ({ data }) => {
        if (ws !== this.ws) return;
        this.lastMsgAt = Date.now();
        let msg;
        try { msg = JSON.parse(data); } catch { return; }
        if (msg.type === 'hb') { this.send({ type: 'hb' }); return; }
        this.onMessage(msg);
      };
      ws.onclose = () => {
        if (ws !== this.ws) return;
        this.ws = null;
        if (this.stopped) { this.onStatus('closed'); return; }
        const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
        this.attempt++;
        this.onStatus('reconnecting');
        this.retryTimer = setTimeout(() => this.connect(), delay);
      };
      ws.onerror = () => {}; // onclose follows
    }

    reconnectNow() {
      clearTimeout(this.retryTimer);
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) return;
      if (this.ws) { try { this.ws.close(); } catch {} }
      else { this.attempt = Math.max(this.attempt, 1); this.connect(); }
    }

    send(obj) {
      if (!this.isOpen()) return false;
      this.ws.send(JSON.stringify(obj));
      return true;
    }

    // Stop for good (no more reconnects)
    stop() {
      this.stopped = true;
      clearTimeout(this.retryTimer);
      if (this.ws) { try { this.ws.close(); } catch {} }
    }
  }

  window.PicMeSignal = Signal;
})();
