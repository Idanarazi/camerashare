// PicMe photo viewer — swipe between shots, heart the good ones, delete the rest.
// Shared by the Director and the Photographer. A "shot" is { blob, url, id, fav, deleted }.
(function () {
  'use strict';

  const ICON = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  };

  class PicMeViewer {
    /**
     * getShots(): the session's shots in display order (newest first), deleted ones included or not
     * onDelete(shot) / onUndo(shot) / onFav(shot): let the page update its own strip & storage
     * closeLabel: text for the close button ("Back to Live")
     */
    constructor({ getShots, onDelete, onUndo, onFav, onClose, toast, closeLabel = 'Back to Live' }) {
      Object.assign(this, { getShots, onDelete, onUndo, onFav, onClose, toast });
      this.favOnly = false;
      this.list = [];
      this.index = 0;
      this.undoTimer = null;

      const el = document.createElement('div');
      el.className = 'viewer';
      el.hidden = true;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Your shots');
      el.innerHTML = `
        <div class="v-track" tabindex="0" aria-live="polite"></div>
        <img class="v-peek" hidden alt="" draggable="false">
        <div class="v-top">
          <span class="chip v-count">1 / 1</span>
          <div class="v-top-actions">
            <button class="icon-btn v-fav" aria-pressed="false" aria-label="Favorite">${ICON.heart}</button>
            <button class="icon-btn v-del" aria-label="Delete this photo">${ICON.trash}</button>
          </div>
        </div>
        <div class="v-undo" hidden><span>Photo deleted</span><button class="link-btn v-undo-btn">Undo</button></div>
        <div class="review-bar">
          <div class="review-top">
            <button class="link-btn v-filter" aria-pressed="false">♥ Favorites</button>
            <button class="link-btn v-saveall">Save all</button>
          </div>
          <div class="v-scrub"><div class="v-thumbs"></div></div>
          <div class="review-actions">
            <button class="btn btn-secondary v-close">${closeLabel}</button>
            <button class="btn btn-primary v-save">Save Photo</button>
          </div>
        </div>`;
      document.body.appendChild(el);
      this.el = el;
      const q = (s) => el.querySelector(s);
      this.track = q('.v-track'); this.thumbs = q('.v-thumbs'); this.count = q('.v-count'); this.peek = q('.v-peek');
      this.favBtn = q('.v-fav'); this.filterBtn = q('.v-filter'); this.saveAllBtn = q('.v-saveall');

      q('.v-close').addEventListener('click', () => this.close());
      q('.v-save').addEventListener('click', () => this.save([this.current()]));
      this.saveAllBtn.addEventListener('click', () => this.save(this.list.slice(0, 30)));
      this.favBtn.addEventListener('click', () => this.toggleFav());
      q('.v-del').addEventListener('click', () => this.deleteCurrent());
      q('.v-undo-btn').addEventListener('click', () => this.undo());
      this.filterBtn.addEventListener('click', () => this.toggleFilter());

      // Swiping is native scrolling with snap points — smooth on every phone
      let raf = 0;
      this.track.addEventListener('scroll', () => {
        this.lastScroll = Date.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => this.syncFromScroll());
      }, { passive: true });
      // A finger on the photo always wins over a programmatic glide
      const userTakesOver = () => { this.target = null; this.touching = true; };
      const letGo = () => { this.touching = false; };
      this.track.addEventListener('touchstart', userTakesOver, { passive: true });
      this.track.addEventListener('pointerdown', userTakesOver);
      ['touchend', 'touchcancel', 'pointerup', 'pointercancel'].forEach(t => this.track.addEventListener(t, letGo, { passive: true }));
      this.track.addEventListener('wheel', userTakesOver, { passive: true });
      this.track.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') this.go(this.index + 1);
        if (e.key === 'ArrowLeft')  this.go(this.index - 1);
      });
      new ResizeObserver(() => { if (!this.el.hidden) this.go(this.index, false); }).observe(this.track);

      // The scrubber (like the Photos app): drag the thumbnail bar and the photo under the
      // middle shows instantly — flick it to fly through dozens of shots.
      this.thumbs.addEventListener('scroll', () => {
        this.lastScroll = Date.now();
        const st = this.scrubTarget;
        if (st) {   // our own glide — not the finger
          if (Math.abs(this.thumbs.scrollLeft - st.left) <= 2 || Date.now() > st.until) this.scrubTarget = null;
          return;
        }
        if (this.scrubByUser) this.watchScrub();   // only a finger on the bar (or its momentum) counts
      }, { passive: true });
      const scrubStart = () => { this.scrubTarget = null; this.scrubByUser = true; this.touching = true; this.target = null; this.watchScrub(); };
      this.thumbs.addEventListener('touchstart', scrubStart, { passive: true });
      this.thumbs.addEventListener('pointerdown', scrubStart);
      this.thumbs.addEventListener('wheel', scrubStart, { passive: true });
      ['touchend', 'touchcancel', 'pointerup', 'pointercancel'].forEach(t => this.thumbs.addEventListener(t, letGo, { passive: true }));
    }

    get isOpen() { return !this.el.hidden; }
    current() { return this.list[this.index]; }

    visible() {
      const all = this.getShots().filter(s => !s.deleted);
      return this.favOnly ? all.filter(s => s.fav) : all;
    }

    open(shot) {
      this.el.hidden = false;
      this.render(shot);
      this.track.focus({ preventScroll: true });
    }

    close() {
      clearTimeout(this.refreshTimer);
      this.peek.hidden = true;
      this.peekWant = null;
      this.scrubbing = false;
      this.thumbs.classList.remove('scrubbing');
      this.keep = null;
      if (this.el.hidden) return;
      this.el.hidden = true;
      this.hideUndo(true);
      this.onClose?.();
    }

    // Re-read the shots (new ones arrived, one was deleted…) and stay on the same photo.
    // Shots can stream in several a second, so updates are batched and never interrupt a swipe.
    refresh(keep) {
      if (this.el.hidden) return;
      if (keep) this.keep = keep;
      clearTimeout(this.refreshTimer);
      const wait = this.touching || Date.now() - (this.lastScroll || 0) < 350 ? 400 : 120;
      this.refreshTimer = setTimeout(() => {
        if (this.el.hidden) return;
        if (this.touching || Date.now() - (this.lastScroll || 0) < 350) { this.refresh(); return; }
        const k = this.keep || this.current();
        this.keep = null;
        this.render(k);
      }, wait);
    }

    render(focusShot) {
      this.list = this.visible();
      if (!this.list.length) {
        if (this.favOnly) { this.favOnly = false; this.list = this.visible(); }
        if (!this.list.length) { this.close(); return; }
      }
      const idx = Math.max(0, this.list.indexOf(focusShot));
      this.track.innerHTML = '';
      this.thumbs.innerHTML = '';
      this.list.forEach((shot, i) => {
        const slide = document.createElement('div');
        slide.className = 'v-slide';
        slide.innerHTML = `<img src="${shot.url}" alt="Photo ${i + 1}" draggable="false">`;
        this.track.appendChild(slide);

        const t = document.createElement('button');
        t.className = 'v-thumb' + (shot.fav ? ' fav' : '');
        t.setAttribute('aria-label', `Photo ${i + 1}`);
        const img = document.createElement('img');
        img.alt = ''; img.draggable = false; img.decoding = 'async';
        t.appendChild(img);
        // Small thumbnail made once per photo — full-size pictures here make phones flicker
        const apply = () => {
          img.src = shot.thumbUrl;
          // The selected thumbnail opens up to the photo's real shape
          t.style.setProperty('--ew', Math.round(Math.min(66, Math.max(32, 44 * (shot.aspect || 0.75)))) + 'px');
          if (i === this.index) this.updateChrome();
        };
        if (shot.thumbUrl) apply(); else PicMeViewer.makeThumb(shot).then(apply);
        t.addEventListener('click', () => this.go(i));
        this.thumbs.appendChild(t);
      });
      const favs = this.getShots().filter(s => !s.deleted && s.fav).length;
      this.filterBtn.textContent = favs ? `♥ Favorites ${favs}` : '♥ Favorites';
      this.filterBtn.setAttribute('aria-pressed', String(this.favOnly));
      this.saveAllBtn.textContent = `Save ${this.favOnly ? 'favorites' : 'all'} ${Math.min(this.list.length, 30)}`;
      this.saveAllBtn.hidden = this.list.length < 2;
      this.index = idx;
      this.peek.hidden = true;
      this.peekWant = null;
      requestAnimationFrame(() => this.go(idx, false));
      this.updateChrome();
    }

    go(i, smooth = true) {
      if (!this.list.length) return;
      i = Math.max(0, Math.min(this.list.length - 1, i));
      this.index = i;
      this.target = smooth ? i : null;   // while gliding there, "current" stays the destination
      this.track.scrollTo({ left: i * this.track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
      this.scrubTo(i, smooth);
      this.updateChrome();
    }

    // Distance between thumbnail centres in the scrubber
    pitch() {
      const c = this.thumbs.children;
      return c.length > 1 ? (c[1].offsetLeft - c[0].offsetLeft) : 28;
    }

    // Move the scrubber ourselves. While it glides there, its scrolling isn't the finger's.
    scrubTo(i, smooth) {
      this.scrubByUser = false;
      const left = i * this.pitch();
      this.scrubTarget = Math.abs(this.thumbs.scrollLeft - left) > 1 ? { left, until: Date.now() + 900 } : null;
      this.thumbs.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }

    // Big photo was swiped → follow along in the scrubber
    syncFromScroll() {
      const w = this.track.clientWidth || 1;
      if (this.target != null) {
        if (Math.abs(this.track.scrollLeft - this.target * w) > 2) return;
        this.target = null;
      }
      const i = Math.max(0, Math.min(this.list.length - 1, Math.round(this.track.scrollLeft / w)));
      if (i !== this.index) { this.index = i; this.scrubTo(i, true); this.updateChrome(); }
    }

    // While a finger (or its momentum) moves the scrubber, check its position every frame
    // and show the photo under the middle. Phones don't always report scrolling promptly,
    // so we look for ourselves instead of waiting to be told.
    watchScrub() {
      if (this.scrubRaf) return;
      let last = NaN, still = 0;
      const tick = () => {
        const x = this.thumbs.scrollLeft;
        if (x !== last) {
          // Once a finger really moves the bar, all thumbnails go uniform (like Photos) until it stops
          if (this.scrubByUser && !Number.isNaN(last) && !this.scrubbing) { this.scrubbing = true; this.thumbs.classList.add('scrubbing'); }
          last = x; still = 0;
          if (this.scrubByUser) this.syncFromScrub();
        } else still++;
        if (!this.el.hidden && (this.touching || still < 16)) this.scrubRaf = requestAnimationFrame(tick);
        else { this.scrubRaf = 0; this.endScrub(); }
      };
      this.scrubRaf = requestAnimationFrame(tick);
    }

    syncFromScrub() {
      if (!this.list.length || this.scrubTarget) return;
      const i = Math.max(0, Math.min(this.list.length - 1, Math.round(this.thumbs.scrollLeft / this.pitch())));
      if (i === this.index) return;
      this.index = i;
      this.target = null;
      // Swap the picture straight away (moving the big photo strip itself is too slow on iPhone).
      // The new picture is decoded first, so the old one stays up until it's ready — never a black frame.
      const url = this.list[i].url;
      this.peekWant = url;
      const pre = new Image();
      pre.src = url;
      const show = () => {
        if (this.peekWant !== url) return;
        this.peek.src = url;
        if (this.peek.hidden) {
          this.peek.style.height = this.track.clientHeight + 'px';
          this.peek.hidden = false;
        }
      };
      (pre.decode ? pre.decode() : Promise.resolve()).then(show, show);
      this.updateChrome();
    }

    // Finger lifted and the bar has settled: the middle thumbnail opens up, and the big photo
    // strip lines up underneath the preview
    endScrub() {
      this.scrubByUser = false;
      if (this.scrubbing) {
        this.scrubbing = false;
        this.thumbs.classList.remove('scrubbing');
        this.updateChrome();
      }
      if (!this.peekWant) return;
      const url = this.peekWant;
      this.track.scrollTo({ left: this.index * this.track.clientWidth, behavior: 'auto' });
      // Only drop the preview once the real photo underneath is ready to draw
      const under = this.track.children[this.index]?.querySelector('img');
      const hide = () => requestAnimationFrame(() => requestAnimationFrame(() => {
        if (this.peekWant !== url) return;   // a new slide started meanwhile
        this.peekWant = null;
        this.peek.hidden = true;
      }));
      if (under?.decode) Promise.race([under.decode(), new Promise(r => setTimeout(r, 400))]).then(hide, hide);
      else hide();
    }

    // Counter, heart state, and keep the selected thumbnail centred in the strip
    updateChrome() {
      const shot = this.current();
      if (!shot) return;
      this.count.textContent = `${this.index + 1} / ${this.list.length}`;
      this.favBtn.setAttribute('aria-pressed', String(!!shot.fav));
      this.favBtn.setAttribute('aria-label', shot.fav ? 'Remove from favorites' : 'Add to favorites');
      // Selected thumbnail opens up; its neighbours slide aside to make room.
      // Not while sliding — that waits until the bar stops.
      if (this.scrubbing) return;
      const kids = this.thumbs.children, sel = kids[this.index];
      for (let k = 0; k < kids.length; k++) {
        const t = kids[k];
        const cls = k < this.index ? 'pre' : k > this.index ? 'post' : 'cur';
        if (t.dataset.pos !== cls) {
          t.classList.remove('pre', 'post', 'cur');
          t.classList.add(cls);
          t.dataset.pos = cls;
          if (cls === 'cur') t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
        }
      }
      if (sel) {
        const ew = parseFloat(sel.style.getPropertyValue('--ew')) || 34;
        this.thumbs.style.setProperty('--shift', Math.max(0, (ew - sel.offsetWidth) / 2 + 3) + 'px');
      }
    }

    toggleFav() {
      const shot = this.current();
      if (!shot) return;
      shot.fav = !shot.fav;
      try { navigator.vibrate?.(10); } catch {}
      this.onFav?.(shot);
      if (this.favOnly && !shot.fav) { this.render(this.list[this.index + 1] || this.list[this.index - 1]); return; }
      this.thumbs.children[this.index]?.classList.toggle('fav', !!shot.fav);
      const favs = this.getShots().filter(s => !s.deleted && s.fav).length;
      this.filterBtn.textContent = favs ? `♥ Favorites ${favs}` : '♥ Favorites';
      this.updateChrome();
    }

    toggleFilter() {
      const favs = this.getShots().filter(s => !s.deleted && s.fav);
      if (!this.favOnly && !favs.length) { this.toast?.('Tap ♥ on the photos you like first'); return; }
      const keep = this.current();
      this.favOnly = !this.favOnly;
      this.render(this.favOnly ? (keep?.fav ? keep : favs[0]) : keep);
    }

    deleteCurrent() {
      const shot = this.current();
      if (!shot) return;
      const next = this.list[this.index + 1] || this.list[this.index - 1];
      shot.deleted = true;
      this.onDelete?.(shot);
      this.lastDeleted = shot;
      this.showUndo();
      this.render(next);
    }

    showUndo() {
      const bar = this.el.querySelector('.v-undo');
      bar.hidden = false;
      clearTimeout(this.undoTimer);
      this.undoTimer = setTimeout(() => this.hideUndo(), 4000);
    }

    hideUndo(immediate) {
      clearTimeout(this.undoTimer);
      this.el.querySelector('.v-undo').hidden = true;
      if (immediate !== undefined) this.lastDeleted = null;
    }

    undo() {
      const shot = this.lastDeleted;
      if (!shot) return;
      shot.deleted = false;
      this.lastDeleted = null;
      this.onUndo?.(shot);
      this.hideUndo();
      if (this.el.hidden) this.el.hidden = false;
      this.render(shot);
    }

    // Saving must happen inside a tap — that's what lets the phone open its save/share sheet.
    async save(shots) {
      shots = shots.filter(Boolean);
      if (!shots.length) return;
      const stamp = Date.now();
      const files = shots.map((s, i) => new File([s.blob], `picme-${stamp}${shots.length > 1 ? '-' + (i + 1) : ''}.jpg`, { type: s.blob.type || 'image/jpeg' }));
      if (navigator.canShare?.({ files })) {
        try { await navigator.share({ files }); } catch {}
        return;
      }
      for (const f of files) {
        const url = URL.createObjectURL(f);
        const a = Object.assign(document.createElement('a'), { href: url, download: f.name });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      this.toast?.(files.length > 1 ? `${files.length} photos downloaded` : 'Photo downloaded');
    }
  }

  // Make (once) a small JPEG thumbnail for a shot: 132px tall, sharp on any phone screen
  PicMeViewer.makeThumb = function (shot) {
    if (shot.thumbUrl) return Promise.resolve(shot.thumbUrl);
    if (shot.thumbJob) return shot.thumbJob;
    thumbQueue = thumbQueue.then(async () => {
      try {
        const H = 132;
        let src, w0, h0;
        if (window.createImageBitmap) { src = await createImageBitmap(shot.blob); w0 = src.width; h0 = src.height; }
        else {
          src = new Image(); src.src = shot.url; await src.decode(); w0 = src.naturalWidth; h0 = src.naturalHeight;
        }
        const w = Math.max(1, Math.round(w0 * H / h0));
        const c = document.createElement('canvas');
        c.width = w; c.height = H;
        c.getContext('2d').drawImage(src, 0, 0, w, H);
        src.close?.();
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
        shot.thumbUrl = blob ? URL.createObjectURL(blob) : shot.url;
        shot.aspect = w0 / h0;
      } catch {
        shot.thumbUrl = shot.url;
      }
      return shot.thumbUrl;
    });
    shot.thumbJob = thumbQueue;
    return shot.thumbJob;
  };
  let thumbQueue = Promise.resolve();   // one at a time, so a big batch doesn't choke the phone

  window.PicMeViewer = PicMeViewer;
})();
