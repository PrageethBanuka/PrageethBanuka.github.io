/* Small details you only notice when you look:
   posters tilt like Apple TV cards · the footer signature signs itself as you arrive · the tab icon shows tonight's Moon
   and pulses with the drum machine · your visit leaves a constellation in the footer · mono labels decode like a signal
   · the clock shows seconds when you hover it · printing leaves a sign-off. */
(function () {
  const BR = window.BR; if (!BR || window.__details) return; window.__details = true;
  const { Spring, clamp, reduce } = BR, root = document.documentElement;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const css = document.createElement('style');
  css.textContent = `
  .tilt { transform-style: preserve-3d; will-change: transform; }
  .tilt .sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; mix-blend-mode: soft-light; transition: opacity .3s ease;
    background: radial-gradient(circle at var(--sx, 50%) var(--sy, 0%), rgba(255,255,255,.55), rgba(255,255,255,0) 55%); }
  .tilt:hover .sheen { opacity: 1; }
  .visit-sky { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .transmit { position: relative; } .transmit > .wrap { position: relative; z-index: 1; }
  .visit-note { opacity: 0; transition: opacity .6s ease; } .visit-note.on { opacity: 1; }
  @media print {
    body::after { content: "Printed from prageethbanuka.github.io · Coffee runs through my circuits."; display: block; margin-top: 32px;
      font: 500 10px/1.4 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: #636B78; }
    .visit-sky { display: none; }
  }`;
  document.head.appendChild(css);

  /* ---------- posters tilt toward the pointer, with a moving highlight (like tvOS focus) ---------- */
  if (fine && !reduce()) {
    const SEL = '.piece button';
    const S = new WeakMap();
    const get = el => {
      let s = S.get(el); if (s) return s;
      const sh = document.createElement('span'); sh.className = 'sheen'; sh.setAttribute('aria-hidden', 'true'); el.appendChild(sh); el.classList.add('tilt');
      const rx = new Spring(0, { damping: 0.8, response: 0.35 }), ry = new Spring(0, { damping: 0.8, response: 0.35 }), z = new Spring(0, { damping: 1, response: 0.3 });
      const ap = () => { el.style.transform = `perspective(900px) rotateX(${rx.x}deg) rotateY(${ry.x}deg) scale(${1 + 0.02 * z.x - (s.down ? 0.015 : 0)})`;
        el.style.boxShadow = z.x > 0.01 ? `0 ${18 * z.x}px ${40 * z.x}px -${18 * z.x}px rgba(0,0,0,.35)` : ''; };
      [rx, ry, z].forEach(q => q.on(ap)); s = { rx, ry, z, down: false, ap }; S.set(el, s); return s;
    };
    document.addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest(SEL); if (!el) return;
      const r = el.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height, s = get(el);
      s.ry.to((u - 0.5) * 8); s.rx.to((0.5 - v) * 6); s.z.to(1);
      el.style.setProperty('--sx', `${u * 100}%`); el.style.setProperty('--sy', `${v * 100}%`);
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const el = e.target.closest && e.target.closest(SEL); if (!el || el.contains(e.relatedTarget)) return;
      const s = get(el); s.rx.to(0); s.ry.to(0); s.z.to(0);
    });
    document.addEventListener('pointerdown', e => { const el = e.target.closest && e.target.closest(SEL); if (el) { const s = get(el); s.down = true; s.ap(); } });
    addEventListener('pointerup', () => document.querySelectorAll('.tilt').forEach(el => { const s = S.get(el); if (s && s.down) { s.down = false; s.ap(); } }));
  }

  /* ---------- the footer signature signs itself as you scroll to the end ---------- */
  const sig = document.querySelector('.transmit .sig-xl');
  if (sig && !reduce()) {
    const ink = new Spring(0, { damping: 1, response: 0.5 }).on(v => { sig.style.clipPath = v > 0.999 ? '' : `inset(-10% ${(1 - v) * 100}% -10% 0)`; });
    ink.set(0);
    const upd = () => {
      const r = sig.getBoundingClientRect(), p = clamp((innerHeight - 24 - r.top) / Math.max(1, r.height), 0, 1);   // fully signed once it's fully in view
      ink.to(Math.max(ink.target, p));                                                  // it only ever writes forward, like a pen
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  }

  /* ---------- the tab icon: tonight's Moon after sunset, a heartbeat while the drums play ---------- */
  const fav = document.querySelector('link[rel="icon"]');
  if (fav) {
    const orig = fav.href, cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const hour = () => +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Colombo' }).format(new Date());
    const night = () => { const h = hour(); return h >= 19 || h < 6; };
    const phase = () => (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % 29.530588853 + 29.530588853) % 29.530588853 / 29.530588853;
    function base() { c.clearRect(0, 0, 64, 64); c.fillStyle = '#0B0E13'; c.beginPath(); c.roundRect ? c.roundRect(0, 0, 64, 64, 14) : c.rect(0, 0, 64, 64); c.fill(); }
    function moon() {
      base(); const ph = phase(), cx = 32, cy = 32, r = 19;
      c.fillStyle = 'rgba(232,234,230,.14)'; c.beginPath(); c.arc(cx, cy, r, 0, 6.283); c.fill();     // earthshine
      c.save(); if (ph > 0.5) { c.translate(64, 0); c.scale(-1, 1); }                                   // waning: mirror
      const q = ph > 0.5 ? 1 - ph : ph, rx = r * Math.abs(Math.cos(q * 2 * Math.PI));
      c.fillStyle = '#E8EAE6'; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);         // the lit limb
      c.ellipse(cx, cy, rx, r, 0, Math.PI / 2, -Math.PI / 2, q < 0.25);                                  // the terminator
      c.fill(); c.restore();
      return cv.toDataURL();
    }
    function star(k) { base(); c.strokeStyle = 'rgba(232,234,230,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(32, 32, 13, 0, 6.283); c.stroke();
      c.fillStyle = '#FF4A3D'; c.beginPath(); c.arc(32, 32, 6 * k, 0, 6.283); c.fill(); return cv.toDataURL(); }
    const rest = () => { fav.href = night() ? moon() : orig; };
    rest(); setInterval(rest, 300000);
    let beatT = 0, playing = false;
    addEventListener('br-music', e => { playing = e.detail.on; if (!playing) rest(); });
    addEventListener('br-beat', e => { if (!playing || !e.detail.hits.includes('Kick')) return; fav.href = star(1.55); clearTimeout(beatT); beatT = setTimeout(() => { fav.href = star(1); }, 140); });
  }

  /* ---------- your visit leaves a constellation in the footer: one star for every half minute you spend here ---------- */
  const foot = document.querySelector('.transmit');
  if (foot) {
    let ms = 0, seed = 0; try { ms = +sessionStorage.getItem('br-visit-ms') || 0; seed = +sessionStorage.getItem('br-visit-seed') || 0; if (!seed) { seed = 1 + Math.floor(Math.random() * 1e9); sessionStorage.setItem('br-visit-seed', seed); } } catch (e) { seed = 7; }
    const rnd = (() => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
    const STARS = Array.from({ length: 40 }, () => ({ x: 0.5 + rnd() * 0.46, y: 0.035 + rnd() * 0.16, m: rnd() }));   // a quiet band above the headline, right side
    const cv = document.createElement('canvas'); cv.className = 'visit-sky'; cv.setAttribute('aria-hidden', 'true'); foot.prepend(cv);
    const c = cv.getContext('2d'); let FW = 0, FH = 0, shown = 0, born = [], raf = 0;
    const note = document.createElement('span'); note.className = 'label visit-note';
    const fr = foot.querySelector('.foot'); fr && fr.appendChild(note);
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); FW = foot.clientWidth; FH = foot.clientHeight; cv.width = FW * d; cv.height = FH * d; c.setTransform(d, 0, 0, d, 0, 0); draw(performance.now()); };
    const count = () => Math.min(STARS.length, Math.floor(ms / 30000));
    function draw(t) {
      raf = 0; c.clearRect(0, 0, FW, FH); const n = count(); if (!n) return;
      const ink = getComputedStyle(root).getPropertyValue('--ink').trim(), acc = getComputedStyle(root).getPropertyValue('--accent').trim();
      const P = STARS.slice(0, n).map(s => [s.x * FW, s.y * FH, s.m]);
      c.strokeStyle = ink; c.lineWidth = 1;
      for (let i = 1; i < P.length; i++) {                                              // each new star links to its nearest older one
        let best = 0, bd = Infinity; for (let j = 0; j < i; j++) { const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]); if (d < bd) { bd = d; best = j; } }
        const age = born[i] ? Math.min(1, (t - born[i]) / 1600) : 1;
        if (bd > 150) continue;                                                       // only near neighbours: a constellation, not a web
        c.globalAlpha = 0.09 * age; c.beginPath(); c.moveTo(P[best][0], P[best][1]); c.lineTo(P[best][0] + (P[i][0] - P[best][0]) * age, P[best][1] + (P[i][1] - P[best][1]) * age); c.stroke();
      }
      P.forEach(([x, y, m], i) => {
        const age = born[i] ? Math.min(1, (t - born[i]) / 900) : 1, pop = 1 + 0.8 * Math.sin(age * Math.PI) * (1 - age);
        c.globalAlpha = (0.35 + 0.5 * m) * age; c.fillStyle = i === P.length - 1 ? acc : ink;
        c.beginPath(); c.arc(x, y, (0.9 + 1.3 * m) * pop, 0, 6.283); c.fill();
      });
      c.globalAlpha = 1;
      if (born.some(b => b && t - b < 1600)) raf = requestAnimationFrame(draw);
    }
    const label = () => { const n = count(), min = Math.max(1, Math.round(ms / 60000)); note.textContent = n >= 3 ? `Your visit · ${min} min · ${n} stars` : ''; note.classList.toggle('on', n >= 3); };
    let last = performance.now();
    setInterval(() => {
      const now = performance.now(); if (!document.hidden) ms += now - last; last = now;
      try { sessionStorage.setItem('br-visit-ms', Math.round(ms)); } catch (e) {}
      const n = count(); if (n > shown) { for (let i = shown; i < n; i++) born[i] = reduce() ? 0 : performance.now(); shown = n; if (!raf) raf = requestAnimationFrame(draw); }
      label();
    }, 2000);
    shown = count(); new ResizeObserver(size).observe(foot); label();
    addEventListener('br-theme', () => requestAnimationFrame(() => draw(performance.now())));
  }

  /* ---------- mono labels decode like a signal being acquired, on hover ---------- */
  if (fine && !reduce()) {
    const GLYPH = '01·:/<>[]=+-_';
    const busy = new WeakSet();
    document.addEventListener('pointerover', e => {
      const el = e.target.closest && e.target.closest('.label'); if (!el || busy.has(el) || el.children.length || el.id || el.closest('button, a, [data-clock], .visit-note, .pixi-say')) return;
      const txt = el.textContent; if (!txt || txt.length > 48 || txt.trim().length < 3) return;
      busy.add(el); const t0 = performance.now(), dur = Math.min(520, 160 + txt.length * 14);
      const w = el.getBoundingClientRect().width; el.style.minWidth = w + 'px';                         // no layout shift while it scrambles
      (function step(t) {
        const p = (t - t0) / dur; if (p >= 1) { el.textContent = txt; el.style.minWidth = ''; setTimeout(() => busy.delete(el), 600); return; }
        el.textContent = [...txt].map((ch, i) => ch === ' ' || i / txt.length < p ? ch : GLYPH[(Math.random() * GLYPH.length) | 0]).join('');
        requestAnimationFrame(step);
      })(t0);
    });
  }

  /* ---------- the clock shows seconds while you hover it ---------- */
  const clk = document.querySelector('.nav [data-clock]');
  if (clk && fine) {
    const f = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Colombo' }); let iv = 0, keep = '';
    clk.addEventListener('pointerenter', () => { keep = clk.textContent; const t = () => { clk.textContent = `Colombo ${f.format(new Date())}`; }; t(); iv = setInterval(t, 1000); });
    clk.addEventListener('pointerleave', () => { clearInterval(iv); if (keep) clk.textContent = keep; });
    clk.style.cursor = 'default'; clk.style.fontVariantNumeric = 'tabular-nums';
  }
})();
