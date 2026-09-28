// PicMe gallery: keeps the current session's shots on the phone (IndexedDB), so they survive
// a reload or a role swap. A new session wipes the old one. Best-effort — if storage is
// unavailable, nothing breaks.
(function () {
  'use strict';

  const DB = 'picme', STORE = 'shots', MAX_SHOTS = 240;
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

  function run(mode, fn) {
    return db().then(d => new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, mode);
      const out = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
    }));
  }

  // Store blobs for a room; resolves to their ids (in the same order)
  async function add(room, blobs) {
    if (!room || !blobs?.length) return [];
    try {
      const ids = [];
      await run('readwrite', store => {
        blobs.forEach((blob, i) => { store.add({ room, ts: Date.now(), fav: false, blob }).onsuccess = e => { ids[i] = e.target.result; }; });
      });
      prune();
      return ids;
    } catch { return []; }
  }

  // All shots for a room, oldest first: [{ id, room, ts, fav, blob }]
  async function list(room) {
    try {
      const out = [];
      await run('readonly', store => {
        store.index('room').openCursor(IDBKeyRange.only(room)).onsuccess = e => {
          const c = e.target.result;
          if (c) { out.push(c.value); c.continue(); }
        };
      });
      return out;
    } catch { return []; }
  }

  async function setFav(id, fav) {
    if (id == null) return;
    try {
      await run('readwrite', store => {
        store.get(id).onsuccess = e => { const r = e.target.result; if (r) { r.fav = !!fav; store.put(r); } };
      });
    } catch {}
  }

  async function remove(id) {
    if (id == null) return;
    try { await run('readwrite', store => { store.delete(id); }); } catch {}
  }

  // New session: forget every shot that doesn't belong to it
  async function keepOnly(room) {
    try {
      await run('readwrite', store => {
        store.openCursor().onsuccess = e => {
          const c = e.target.result;
          if (!c) return;
          if (c.value.room !== room) c.delete();
          c.continue();
        };
      });
    } catch {}
  }

  // Keep storage bounded: drop the oldest shots beyond MAX_SHOTS
  async function prune() {
    try {
      await run('readwrite', store => {
        store.count().onsuccess = e => {
          let extra = e.target.result - MAX_SHOTS;
          if (extra <= 0) return;
          store.openCursor().onsuccess = ev => {
            const c = ev.target.result;
            if (c && extra-- > 0) { c.delete(); c.continue(); }
          };
        };
      });
    } catch {}
  }

  window.PicMeGallery = { add, list, setFav, remove, keepOnly };
})();
