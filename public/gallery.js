// PicMe gallery: keeps this session's shots on the phone (IndexedDB), so they survive
// a reload or a role swap. Best-effort — if storage is unavailable, nothing breaks.
(function () {
  'use strict';

  const DB = 'picme', STORE = 'shots', MAX_SHOTS = 80;
  let dbPromise = null;

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('no indexedDB'));
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('room', 'room');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  const db = () => (dbPromise = dbPromise || openDb());

  async function add(room, blobs) {
    if (!room || !blobs?.length) return;
    try {
      const d = await db();
      await new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        for (const blob of blobs) store.add({ room, ts: Date.now(), blob });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      prune();
    } catch {}
  }

  // All shots for a room, oldest first
  async function list(room) {
    try {
      const d = await db();
      return await new Promise(resolve => {
        const out = [];
        const req = d.transaction(STORE).objectStore(STORE).index('room').openCursor(IDBKeyRange.only(room));
        req.onsuccess = () => {
          const c = req.result;
          if (c) { out.push(c.value); c.continue(); } else resolve(out);
        };
        req.onerror = () => resolve(out);
      });
    } catch { return []; }
  }

  // Keep storage small: drop the oldest shots beyond MAX_SHOTS
  async function prune() {
    try {
      const d = await db();
      const tx = d.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const countReq = store.count();
      countReq.onsuccess = () => {
        let extra = countReq.result - MAX_SHOTS;
        if (extra <= 0) return;
        store.openCursor().onsuccess = (e) => {
          const c = e.target.result;
          if (c && extra-- > 0) { c.delete(); c.continue(); }
        };
      };
    } catch {}
  }

  window.PicMeGallery = { add, list };
})();
