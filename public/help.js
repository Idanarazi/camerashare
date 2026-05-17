(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────────────
  const CSS = `
  .pmh-trigger {
    position: fixed;
    top: max(14px, env(safe-area-inset-top));
    right: 14px;
    z-index: 890;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.13);
    color: rgba(255,255,255,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.14s, color 0.14s, opacity 0.2s, transform 0.2s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .pmh-trigger:active {
    background: rgba(255,255,255,0.14);
    color: #fff;
    transform: scale(0.92);
  }
  .pmh-trigger.pmh-hidden {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.85);
  }

  .pmh-backdrop {
    position: fixed;
    inset: 0;
    z-index: 900;
    background: rgba(0,0,0,0.60);
    opacity: 0;
    transition: opacity 0.28s cubic-bezier(0.22,1,0.36,1);
    pointer-events: none;
  }
  .pmh-backdrop.pmh-open {
    opacity: 1;
    pointer-events: auto;
  }

  .pmh-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 910;
    background: #111;
    border-top: 1px solid rgba(255,255,255,0.09);
    border-radius: 26px 26px 0 0;
    max-height: 88dvh;
    display: flex;
    flex-direction: column;
    transform: translateY(100%);
    transition: transform 0.38s cubic-bezier(0.22,1,0.36,1);
    will-change: transform;
    overflow: hidden;
  }
  .pmh-sheet.pmh-open {
    transform: translateY(0);
  }

  .pmh-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.18);
    margin: 10px auto 0;
    flex-shrink: 0;
  }

  .pmh-head {
    display: flex;
    align-items: center;
    padding: 14px 18px 0;
    flex-shrink: 0;
  }
  .pmh-title {
    flex: 1;
    font-family: 'Barlow Condensed', 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: #fff;
  }
  .pmh-close {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: none;
    color: rgba(255,255,255,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: background 0.12s;
    padding: 0;
  }
  .pmh-close:active { background: rgba(255,255,255,0.16); }

  .pmh-tabs {
    display: flex;
    gap: 6px;
    padding: 14px 18px 0;
    flex-shrink: 0;
  }
  .pmh-tab {
    flex: 1;
    padding: 8px 0;
    border-radius: 10px;
    background: rgba(255,255,255,0.05);
    border: 1px solid transparent;
    color: rgba(255,255,255,0.40);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.16s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .pmh-tab.pmh-active {
    background: rgba(0,168,255,0.12);
    border-color: rgba(0,168,255,0.28);
    color: #00A8FF;
  }
  .pmh-tab:active { transform: scale(0.97); }

  .pmh-body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 14px 18px 0;
  }

  .pmh-panel { display: none; }
  .pmh-panel.pmh-active { display: block; }

  .pmh-intro {
    font-size: 14px;
    color: rgba(255,255,255,0.50);
    line-height: 1.55;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .pmh-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .pmh-row:last-child { border-bottom: none; }

  .pmh-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .pmh-rtext { flex: 1; min-width: 0; }
  .pmh-rname {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    line-height: 1.2;
    margin-bottom: 3px;
  }
  .pmh-rdesc {
    font-size: 13px;
    color: rgba(255,255,255,0.40);
    line-height: 1.45;
  }

  .pmh-foot {
    padding: 14px 18px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
    flex-shrink: 0;
    background: #111;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .pmh-gotit {
    width: 100%;
    padding: 16px;
    border-radius: 16px;
    background: linear-gradient(135deg, #0099ee 0%, #00A8FF 100%);
    border: none;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: opacity 0.12s, transform 0.1s;
    letter-spacing: 0.1px;
  }
  .pmh-gotit:active { opacity: 0.88; transform: scale(0.98); }
  `;

  // ── SVG helpers ──────────────────────────────────────────────────────
  function svg(paths, viewBox, size, stroke, strokeW) {
    return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="${stroke || 'rgba(255,255,255,0.75)'}" stroke-width="${strokeW || 1.75}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  const ICONS = {
    qr:      svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/><path d="M14 14h3v3h-3zM17 17h3v3h-3z"/>', '0 0 24 24', 20),
    arrows:  svg('<path d="M12 2L12 6M12 22L12 18M2 12L6 12M22 12L18 12"/><circle cx="12" cy="12" r="3"/>', '0 0 24 24', 20),
    move:    svg('<path d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M3 12h18"/>', '0 0 24 24', 20),
    timer:   svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', '0 0 24 24', 20),
    freeze:  svg('<rect x="2" y="2" width="20" height="20" rx="3"/><line x1="8" y1="12" x2="16" y2="12"/>', '0 0 24 24', 20),
    mic:     svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>', '0 0 24 24', 20),
    flash:   svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', '0 0 24 24', 20),
    eye:     svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>', '0 0 24 24', 20),
    focus:   svg('<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/><circle cx="12" cy="12" r="3"/>', '0 0 24 24', 20),
    capture: svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>', '0 0 24 24', 20),
    close:   svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', '0 0 24 24', 14, 'rgba(255,255,255,0.55)', 2),
    help:    svg('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>', '0 0 24 24', 16, 'currentColor', 1.75),
  };

  function row(iconKey, name, desc) {
    return `<div class="pmh-row"><div class="pmh-icon">${ICONS[iconKey]}</div><div class="pmh-rtext"><div class="pmh-rname">${name}</div><div class="pmh-rdesc">${desc}</div></div></div>`;
  }

  // ── HTML ─────────────────────────────────────────────────────────────
  const HTML = `
  <button class="pmh-trigger" id="pmh-trigger" aria-label="Help">${ICONS.help}</button>
  <div class="pmh-backdrop" id="pmh-backdrop"></div>
  <div class="pmh-sheet" id="pmh-sheet" role="dialog" aria-modal="true" aria-label="How to use PicMe">
    <div class="pmh-handle"></div>
    <div class="pmh-head">
      <span class="pmh-title">How It Works</span>
      <button class="pmh-close" id="pmh-close" aria-label="Close">${ICONS.close}</button>
    </div>
    <div class="pmh-tabs">
      <button class="pmh-tab pmh-active" id="pmh-tab-photo" data-tab="photo">Photographer</button>
      <button class="pmh-tab" id="pmh-tab-director" data-tab="director">Director</button>
    </div>
    <div class="pmh-body">
      <div class="pmh-panel pmh-active" id="pmh-panel-photo">
        <p class="pmh-intro">Hold the phone — you're the camera. Your Director watches your live feed and guides you to the perfect frame.</p>
        ${row('qr',     'Room Code & QR',      'Open Photographer, then share the room code or QR code with your Director so they can join your session.')}
        ${row('arrows', 'Direction Arrows',     'Your Director taps arrows on their screen. You\'ll feel a vibration and see an arrow — step or tilt that way.')}
        ${row('move',   'Move Closer / Back',   'Director can also tell you to step closer or further. A label appears on your screen with the distance cue.')}
        ${row('timer',  '3–2–1 Countdown',      'When Director hits Capture, a 3-second countdown appears. Hold still — the shot is taken automatically.')}
        ${row('freeze', 'Frame Freeze',         'After capture, the screen freezes so your Director can review the frame. Tap to unfreeze and resume live.')}
        ${row('mic',    'Microphone',           'Tap the mic button to talk to your Director hands-free. They\'ll hear you through their speaker.')}
        ${row('flash',  'Flashlight',           'Director can toggle your phone\'s flashlight remotely — useful in low light without you having to reach the screen.')}
      </div>
      <div class="pmh-panel" id="pmh-panel-director">
        <p class="pmh-intro">You call the shots. Watch the Photographer\'s live feed and send real-time cues to frame every angle perfectly.</p>
        ${row('qr',     'Joining a Session',    'Open Director, then enter the room code or tap "Scan QR Code" and point your camera at the Photographer\'s screen.')}
        ${row('focus',  'Tap to Focus',         'Tap anywhere on the live feed to send a focus point to the Photographer\'s camera.')}
        ${row('arrows', 'Direction Controls',   'Tap the arrow buttons to nudge the Photographer — up, down, left, right. They\'ll feel it and see the cue.')}
        ${row('move',   'Move Closer / Back',   'Use the Move Closer and Step Back buttons to guide distance. The Photographer sees the instruction on their screen.')}
        ${row('capture','Capture',              'Hit the red Capture button to start a 3-second countdown. The Photographer\'s phone takes the shot automatically.')}
        ${row('mic',    'Microphone',           'Tap Mic to speak to the Photographer live — faster than typing, great for real-time guidance.')}
        ${row('flash',  'Flashlight',           'Toggle the Photographer\'s flashlight remotely from the Director controls — no need to hand the phone back.')}
      </div>
    </div>
    <div class="pmh-foot">
      <button class="pmh-gotit" id="pmh-gotit">Got It</button>
    </div>
  </div>
  `;

  // ── Init ─────────────────────────────────────────────────────────────
  function init() {
    // Inject CSS
    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // Inject HTML
    const wrapper = document.createElement('div');
    wrapper.innerHTML = HTML;
    document.body.appendChild(wrapper);

    const trigger  = document.getElementById('pmh-trigger');
    const backdrop = document.getElementById('pmh-backdrop');
    const sheet    = document.getElementById('pmh-sheet');
    const closeBtn = document.getElementById('pmh-close');
    const gotit    = document.getElementById('pmh-gotit');
    const tabPhoto = document.getElementById('pmh-tab-photo');
    const tabDir   = document.getElementById('pmh-tab-director');
    const panelPhoto = document.getElementById('pmh-panel-photo');
    const panelDir   = document.getElementById('pmh-panel-director');

    function open() {
      backdrop.classList.add('pmh-open');
      sheet.classList.add('pmh-open');
      sheet.setAttribute('aria-hidden', 'false');
    }

    function close() {
      backdrop.classList.remove('pmh-open');
      sheet.classList.remove('pmh-open');
      sheet.setAttribute('aria-hidden', 'true');
      localStorage.setItem('picme_onboarded', '1');
    }

    // Tab switching
    function showTab(tab) {
      if (tab === 'director') {
        tabPhoto.classList.remove('pmh-active');
        tabDir.classList.add('pmh-active');
        panelPhoto.classList.remove('pmh-active');
        panelDir.classList.add('pmh-active');
      } else {
        tabDir.classList.remove('pmh-active');
        tabPhoto.classList.add('pmh-active');
        panelDir.classList.remove('pmh-active');
        panelPhoto.classList.add('pmh-active');
      }
    }

    tabPhoto.addEventListener('click', () => showTab('photo'));
    tabDir.addEventListener('click',   () => showTab('director'));

    trigger.addEventListener('click',  open);
    closeBtn.addEventListener('click', close);
    gotit.addEventListener('click',    close);
    backdrop.addEventListener('click', close);

    // Auto-select tab based on current page
    if (location.pathname.indexOf('director') !== -1) {
      showTab('director');
    }

    // Auto-show for first-time users
    if (!localStorage.getItem('picme_onboarded')) {
      setTimeout(open, 700);
    }

    // Hide trigger while live (photographer page)
    const liveHud = document.getElementById('live-hud-top');
    if (liveHud) {
      const obs = new MutationObserver(() => {
        if (!liveHud.hidden) {
          trigger.classList.add('pmh-hidden');
          if (sheet.classList.contains('pmh-open')) close();
        } else {
          trigger.classList.remove('pmh-hidden');
        }
      });
      obs.observe(liveHud, { attributes: true, attributeFilter: ['hidden'] });
    }

    // Hide trigger while live (director page)
    const controlScreen = document.getElementById('control-screen');
    if (controlScreen) {
      const obs = new MutationObserver(() => {
        if (controlScreen.style.display === 'block') {
          trigger.classList.add('pmh-hidden');
          if (sheet.classList.contains('pmh-open')) close();
        } else {
          trigger.classList.remove('pmh-hidden');
        }
      });
      obs.observe(controlScreen, { attributes: true, attributeFilter: ['style'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
