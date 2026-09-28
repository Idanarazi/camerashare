// PicMe help sheet: "How it works" for both roles. Opens once for first-time users,
// then from the ? button. Hidden while a live session is on screen.
(function () {
  'use strict';

  const CSS = `
  .pmh-trigger {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 14px);
    right: 14px;
    z-index: 890;
    width: 40px; height: 40px;
    border-radius: 50%;
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text-2);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    touch-action: manipulation;
    transition: opacity 0.2s, transform 0.12s var(--ease);
  }
  .pmh-trigger:active { transform: scale(0.92); }
  .pmh-trigger.pmh-hidden { opacity: 0; pointer-events: none; }

  .pmh-backdrop {
    position: fixed; inset: 0; z-index: 900;
    background: rgba(0,0,0,0.6);
    opacity: 0; pointer-events: none;
    transition: opacity 0.25s var(--ease);
  }
  .pmh-backdrop.pmh-open { opacity: 1; pointer-events: auto; }

  .pmh-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 910;
    max-width: 520px; margin: 0 auto;
    background: var(--surface);
    border: 1px solid var(--line);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    max-height: 88dvh;
    display: flex; flex-direction: column;
    transform: translateY(100%);
    transition: transform 0.36s var(--ease);
    overflow: hidden;
  }
  .pmh-sheet.pmh-open { transform: translateY(0); }
  .pmh-handle { width: 36px; height: 4px; border-radius: 2px; background: var(--line-strong); margin: 10px auto 0; flex-shrink: 0; }
  .pmh-head { display: flex; align-items: center; padding: 14px 20px 0; flex-shrink: 0; }
  .pmh-title { flex: 1; font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
  .pmh-close {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--surface-2); border: none; color: var(--text-2);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; touch-action: manipulation; padding: 0;
  }
  .pmh-tabs { display: flex; gap: 4px; margin: 14px 20px 0; padding: 4px; border-radius: 12px; background: var(--surface-2); flex-shrink: 0; }
  .pmh-tab {
    flex: 1; min-height: 38px; border-radius: 9px; border: none;
    background: transparent; color: var(--text-2);
    font-size: 14px; font-weight: 650; cursor: pointer; touch-action: manipulation;
    transition: background 0.15s, color 0.15s;
  }
  .pmh-tab.pmh-active { background: var(--surface-3); color: var(--text); }
  .pmh-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 16px 20px 4px; user-select: text; -webkit-user-select: text; }
  .pmh-panel { display: none; }
  .pmh-panel.pmh-active { display: block; }
  .pmh-intro { font-size: 15px; color: var(--text-2); margin-bottom: 8px; }
  .pmh-row { display: flex; align-items: flex-start; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); }
  .pmh-icon {
    width: 40px; height: 40px; border-radius: 12px;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .pmh-rname { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .pmh-rdesc { font-size: 14px; color: var(--text-2); line-height: 1.45; }
  .pmh-foot { padding: 12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px); flex-shrink: 0; border-top: 1px solid var(--line); }
  `;

  function svg(paths, size, stroke) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke || 2}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  const ICONS = {
    qr:      svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM17 17h3v3h-3z"/>', 20),
    swipe:   svg('<polyline points="15 5 8 12 15 19"/>', 20, 2.4),
    pinch:   svg('<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>', 20),
    shutter: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>', 20),
    photos:  svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>', 20),
    mic:     svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/>', 20),
    flash:   svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', 20),
    camera:  svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.2"/>', 20),
    hold:    svg('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>', 20),
    grid:    svg('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>', 20),
    ref:     svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>', 20),
    swap:    svg('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>', 20),
    tripod:  svg('<rect x="7" y="2" width="10" height="7" rx="1.5"/><circle cx="12" cy="5.5" r="1.6"/><path d="M12 9v4M12 13l-6 9M12 13l6 9M12 13v9"/>', 20),
    cue:     svg('<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>', 20),
    close:   svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 16),
    help:    svg('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 20),
  };

  function row(icon, name, desc) {
    return `<div class="pmh-row"><div class="pmh-icon">${ICONS[icon]}</div><div><div class="pmh-rname">${name}</div><div class="pmh-rdesc">${desc}</div></div></div>`;
  }

  const HTML = `
  <button class="pmh-trigger" id="pmh-trigger" aria-label="How it works">${ICONS.help}</button>
  <div class="pmh-backdrop" id="pmh-backdrop"></div>
  <div class="pmh-sheet" id="pmh-sheet" role="dialog" aria-modal="true" aria-label="How PicMe works" aria-hidden="true">
    <div class="pmh-handle"></div>
    <div class="pmh-head">
      <span class="pmh-title">How it works</span>
      <button class="pmh-close" id="pmh-close" aria-label="Close">${ICONS.close}</button>
    </div>
    <div class="pmh-tabs" role="tablist">
      <button class="pmh-tab pmh-active" id="pmh-tab-director" role="tab">In the photo</button>
      <button class="pmh-tab" id="pmh-tab-photo" role="tab">Taking the photo</button>
    </div>
    <div class="pmh-body">
      <div class="pmh-panel pmh-active" id="pmh-panel-director">
        <p class="pmh-intro">You see your partner's camera live on your phone and guide them until the frame is exactly right.</p>
        ${row('qr',      'Scan to join',        'Scan the code on your partner’s screen — with your phone camera or the Scan button. You’re in instantly.')}
        ${row('swipe',   'Swipe to guide',      'Swipe on the picture the way the camera should move — left, right, up or down. Or tap the arrows at the edges.')}
        ${row('pinch',   'Pinch for distance',  'Spread two fingers: “move closer”. Pinch in: “step back”. The buttons next to the shutter do the same.')}
        ${row('hold',    'Hold it!',            'Tap Hold it (or double-tap the picture) when the frame is perfect and they should stop moving.')}
        ${row('shutter', 'Take the shot',       'Tap the shutter. After a 3-second countdown your partner’s phone grabs a quick burst. Shoot again as often as you like — the live view never stops.')}
        ${row('photos',  'Keep your favorite',  'Shots collect in the strip above the shutter. Tap one to see it big, then Save Photo — or Save all. They stay even if you reload or switch roles.')}
        ${row('grid',    'Grid & level',        'Tap the grid icon for rule-of-thirds lines and a live horizon level from your partner’s phone — it turns yellow when the shot is straight.')}
        ${row('ref',     'Make it like this',   'Tap the picture icon and choose a photo you love. Your partner sees it in the corner and can overlay it on their camera to match the framing.')}
        ${row('swap',    'Switch roles',        'Want to take one of them now? Tap the switch icon — once they agree, your phones swap. No rescanning.')}
        ${row('tripod',  'Tripod mode',         'For group shots: prop a phone up in Tripod mode, scan its code, and run the whole shoot from your phone. Your phone beeps the countdown so you can count everyone in.')}
        ${row('mic',     'Talk',                'Tap the mic to speak to your partner. Great when you’re too far to shout.')}
        ${row('flash',   'Flashlight',          'Turn your partner’s flashlight on or off when the light is low.')}
      </div>
      <div class="pmh-panel" id="pmh-panel-photo">
        <p class="pmh-intro">You hold the phone. Your partner sees what you see and tells you exactly how to move.</p>
        ${row('qr',      'Show your code',      'Open the camera and let your partner scan the code. If someone types it instead, you’ll be asked to allow them.')}
        ${row('cue',     'Follow the cues',     'A glowing edge means move that way. Yellow corner brackets growing means move closer; shrinking means step back.')}
        ${row('shutter', 'Hold still',          'When the countdown appears, keep steady — a burst of photos is taken at zero and sent to your partner. Your copies wait behind the thumbnail at the bottom.')}
        ${row('grid',    'Level',               'A level line appears in the middle when the phone is nearly straight — it turns yellow when the horizon is level.')}
        ${row('ref',     'Reference photo',     'If your partner sends a photo to match, it appears in the corner. Tap it to overlay it on your camera.')}
        ${row('swap',    'Switch roles',        'Tap the switch icon to swap — you step into the photo and your partner takes over the camera.')}
        ${row('camera',  'Full quality',        'Want the camera’s best quality? Tap Full quality to take a photo with your camera — it’s sent to your partner too.')}
        ${row('mic',     'Talk',                'Tap the mic to talk back.')}
      </div>
    </div>
    <div class="pmh-foot"><button class="btn btn-primary btn-block" id="pmh-gotit">Got it</button></div>
  </div>
  `;

  function init() {
    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = HTML;
    document.body.appendChild(wrapper);

    const $ = (id) => document.getElementById(id);
    const trigger = $('pmh-trigger'), backdrop = $('pmh-backdrop'), sheet = $('pmh-sheet');

    function open()  { backdrop.classList.add('pmh-open'); sheet.classList.add('pmh-open'); sheet.setAttribute('aria-hidden', 'false'); }
    function close() {
      backdrop.classList.remove('pmh-open'); sheet.classList.remove('pmh-open'); sheet.setAttribute('aria-hidden', 'true');
      try { localStorage.setItem('picme_onboarded', '1'); } catch {}
    }
    function showTab(tab) {
      const dir = tab === 'director';
      $('pmh-tab-director').classList.toggle('pmh-active', dir);
      $('pmh-tab-photo').classList.toggle('pmh-active', !dir);
      $('pmh-panel-director').classList.toggle('pmh-active', dir);
      $('pmh-panel-photo').classList.toggle('pmh-active', !dir);
    }

    $('pmh-tab-director').addEventListener('click', () => showTab('director'));
    $('pmh-tab-photo').addEventListener('click', () => showTab('photo'));
    trigger.addEventListener('click', open);
    $('pmh-close').addEventListener('click', close);
    $('pmh-gotit').addEventListener('click', close);
    backdrop.addEventListener('click', close);

    if (location.pathname.indexOf('photographer') !== -1) showTab('photo');

    let onboarded = false;
    try { onboarded = !!localStorage.getItem('picme_onboarded'); } catch {}
    // Someone arriving by scanning a code is mid-task — don't block them with the sheet
    const arrivingByScan = new URLSearchParams(location.search).has('k') || document.documentElement.dataset.scanJoin === '1';
    if (!onboarded && !arrivingByScan) setTimeout(open, 600);

    // Hide the ? while live (it would sit on top of controls)
    function watch(el, isLive) {
      if (!el) return;
      const update = () => {
        if (isLive()) { trigger.classList.add('pmh-hidden'); if (sheet.classList.contains('pmh-open')) close(); }
        else trigger.classList.remove('pmh-hidden');
      };
      new MutationObserver(update).observe(el, { attributes: true, attributeFilter: ['hidden', 'style'] });
      update();
    }
    const hud = $('live-hud-top');
    watch(hud, () => !hud.hidden);
    const control = $('control-screen');
    watch(control, () => control.style.display === 'block');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
