/* Three quiet details, each only visible when it has something to say:
   1. Spacetime: a dot grid behind the home hero that bends around the cursor and around Pixi (it has mass), and carries a gravitational wave when you click.
   2. The island: a black pill that appears only for live activity (music, copied, sound, Pixi drawing, lost signal), then goes away.
   3. Magnetic controls: buttons lean a few pixels toward the pointer. */
(function () {
  const BR = window.BR; if (!BR || window.__wow) return; window.__wow = true;
  const { Spring, clamp, reduce } = BR, root = document.documentElement;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const css = document.createElement('style');
  css.textContent = `
  .st { position: absolute; inset: 0; z-index: 0; pointer-events: none; width: 100%; height: 100%;
    -webkit-mask: radial-gradient(120% 90% at 50% 45%, #000 55%, transparent 100%); mask: radial-gradient(120% 90% at 50% 45%, #000 55%, transparent 100%); }
  .hero { position: relative; } .hero > .grid { position: relative; z-index: 1; }
  .isl { position: fixed; z-index: 55; left: 0; top: 0; height: 36px; width: 36px; border-radius: 999px;
    background: #050607; color: #F2F3F1; overflow: hidden; display: none; cursor: default; touch-action: none; user-select: none; -webkit-user-select: none;
    box-shadow: 0 0 0 1px rgba(255,255,255,.07), 0 14px 34px -14px rgba(0,0,0,.6); font-size: 13px; letter-spacing: .01em; }
  .isl.live { display: block; }
  .isl-in { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 14px; white-space: nowrap; transition: opacity .16s ease, filter .16s ease, scale .16s ease; }
  .isl-in.out { opacity: 0; filter: blur(6px); scale: .94; transition-duration: .1s; }
  .isl-in > span:not(.mono):not(.eq):not(.ring) { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .isl-in > .mono, .isl-in > svg, .isl-in > .eq, .isl-in > .ring { flex: none; }
  .isl .spin { animation: ispin .6s cubic-bezier(.34,1.56,.64,1) both; } @keyframes ispin { from { rotate: -140deg; scale: .3; } }
  .nav .brand > span:last-child { transition: opacity .2s ease; } body.isl-on .nav .brand > span:last-child, body.isl-on .nav .clock { opacity: 0; } .nav .clock { transition: opacity .2s ease; }
  @media (min-width: 861px) { body.isl-on .nav .brand > span:last-child { opacity: 1; } }
  .isl-in.x { flex-direction: column; align-items: stretch; justify-content: center; gap: 10px; padding: 14px 18px; }
  .isl .mono { font-family: var(--f-mono); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; opacity: .6; }
  .isl .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .isl .eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; } .isl .eq i { width: 3px; height: 3px; border-radius: 2px; background: #FF5A4C; transition: height .12s ease-out; }
  .isl .steps { display: grid; grid-template-columns: repeat(16, 1fr); gap: 4px; } .isl .steps i { height: 4px; border-radius: 2px; background: rgba(255,255,255,.14); }
  .isl .steps i.on { background: #FF5A4C; }
  .isl button { font: inherit; color: inherit; background: rgba(255,255,255,.1); border: 0; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
  .isl button:active, .isl .isl-a:active { scale: .96; }
  .isl .isl-a { color: #050607; background: #F2F3F1; border-radius: 999px; padding: 6px 12px; text-decoration: none; font-weight: 500; }
  .isl svg { flex: none; }
  .isl .ring { --p: 0; width: 16px; height: 16px; border-radius: 50%; background: conic-gradient(#F2F3F1 calc(var(--p) * 1turn), rgba(255,255,255,.15) 0); -webkit-mask: radial-gradient(circle, transparent 4.5px, #000 5px); mask: radial-gradient(circle, transparent 4.5px, #000 5px); }
  .isl .tick path { stroke-dasharray: 20; stroke-dashoffset: 20; animation: tick .45s cubic-bezier(.16,1,.3,1) .08s forwards; } @keyframes tick { to { stroke-dashoffset: 0; } }
  .isl-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  body.menu-open .isl { display: none; }
  @media (prefers-reduced-motion: reduce) { .isl-in { transition: none; } .isl .tick path { animation: none; stroke-dashoffset: 0; } }`;
  document.head.appendChild(css);

  /* ---------- 1. spacetime ---------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    const cv = document.createElement('canvas'); cv.className = 'st'; cv.setAttribute('aria-hidden', 'true'); hero.prepend(cv);
    const c = cv.getContext('2d'); let Wd = 0, Ht = 0, ink = '#0B0E13', pts = [], vis = true, raf = 0, waves = [];
    const GAP = 26;
    const color = () => { ink = getComputedStyle(root).getPropertyValue('--ink').trim() || ink; kick(); };
    function size() {
      const d = Math.min(2, devicePixelRatio || 1); Wd = hero.clientWidth; Ht = hero.clientHeight;
      cv.width = Wd * d; cv.height = Ht * d; c.setTransform(d, 0, 0, d, 0, 0); pts = [];
      const ox = (Wd % GAP) / 2, oy = (Ht % GAP) / 2;
      for (let y = oy; y <= Ht; y += GAP) for (let x = ox; x <= Wd; x += GAP) pts.push([x, y]);
      kick();
    }
    // masses: the pointer (light) and Pixi (heavier); positions eased with critically damped springs
    const mx = new Spring(-999, { damping: 1, response: 0.25 }), my = new Spring(-999, { damping: 1, response: 0.25 }), mm = new Spring(0, { damping: 1, response: 0.4 });
    const pm = new Spring(0, { damping: 1, response: 0.5 });
    [mx, my, mm, pm].forEach(s => s.on(kick));
    let first = true;
    function local(e) { const r = hero.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; }
    addEventListener('pointermove', e => {
      const [x, y, r] = local(e), inside = x > 0 && y > 0 && x < r.width && y < r.height;
      if (inside) { if (first) { mx.set(x); my.set(y); first = false; } mx.to(x); my.to(y); mm.to(e.pointerType === 'touch' ? 0.8 : 1); } else mm.to(0);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => mm.to(0));
    // click anywhere quiet in the hero: a gravitational wave rolls out, with a LIGO-style chirp if sound is on
    hero.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button, [role=button], mark, .cof') || reduce()) return;
      const [x, y] = local(e); waves.push({ x, y, t: performance.now() }); kick(); chirp();
    });
    function chirp() {
      if (!BR.sound.on) return; const a = BR.ac(); if (!a) return;
      const t0 = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(45, t0); o.frequency.exponentialRampToValueAtTime(320, t0 + 0.42);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 0.52);
    }
    function draw(t) {
      raf = 0; c.clearRect(0, 0, Wd, Ht);
      const hr = hero.getBoundingClientRect(), P = BR.pixi && BR.pixi.center();
      let px = -999, py = -999;
      if (P && !P.away) { px = P.x - hr.left; py = P.y - hr.top; pm.to(px > -40 && py > -40 && px < Wd + 40 && py < Ht + 40 ? (P.held ? 2.6 : 1.4) : 0); } else pm.to(0);
      const M = [[mx.x, my.x, mm.x], [px, py, pm.x]].filter(m => m[2] > 0.01);
      waves = waves.filter(w => t - w.t < 1800);
      c.fillStyle = ink;
      for (const [x0, y0] of pts) {
        let x = x0, y = y0, glow = 0;
        for (const [ax, ay, k] of M) {                                                 // lensing: pulled toward the mass, strongest at a ring
          const dx = ax - x0, dy = ay - y0, r = Math.hypot(dx, dy) || 1, s = 70;
          const pull = 16 * k * (2 * r * s) / (r * r + s * s);                                  // peaks at r = s
          x += dx / r * pull * Math.min(1, r / 18); y += dy / r * pull * Math.min(1, r / 18);
          glow += k * Math.exp(-(r * r) / (2 * 120 * 120));
        }
        for (const w of waves) {                                                       // the wave: a travelling ring that stretches and squeezes space
          const age = (t - w.t) / 1000, R = age * 760, dx = x0 - w.x, dy = y0 - w.y, r = Math.hypot(dx, dy) || 1, d = r - R;
          if (Math.abs(d) < 90) { const amp = 7 * Math.exp(-d * d / 1600) * Math.sin(d / 9) * (1 - age / 1.8); x += dx / r * amp; y += dy / r * amp; glow += Math.abs(amp) / 9; }
        }
        const a = Math.min(0.55, 0.05 + glow * 0.38);
        if (a < 0.055 && !M.length && !waves.length) { c.globalAlpha = 0.05; c.fillRect(x0 - 0.6, y0 - 0.6, 1.2, 1.2); continue; }
        c.globalAlpha = a; c.beginPath(); c.arc(x, y, 0.7 + Math.min(1, glow) * 0.8, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
      if (vis && (M.length || waves.length || [mx, my, mm, pm].some(s => Math.abs(s.v) > 0.01))) kick();
    }
    function kick() { if (!raf && vis) raf = requestAnimationFrame(draw); }
    new IntersectionObserver(es => { vis = es[0].isIntersecting; kick(); }).observe(hero);
    new ResizeObserver(size).observe(hero);
    addEventListener('br-theme', () => requestAnimationFrame(color)); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', color);
    color(); size();
    setInterval(() => { if (BR.pixi && BR.pixi.center().held) kick(); }, 100);       // keep bending while Pixi is carried across
  }

  /* ---------- 2. the island ---------- */
  const isl = document.createElement('div'); isl.className = 'isl'; isl.setAttribute('aria-hidden', 'true');
  const sr = document.createElement('div'); sr.className = 'isl-sr'; sr.setAttribute('role', 'status'); sr.setAttribute('aria-live', 'polite');
  document.body.append(isl, sr);
  const IW = new Spring(36, { damping: 0.82, response: 0.4 }), IH = new Spring(36, { damping: 0.82, response: 0.4 }), IO = new Spring(0, { damping: 1, response: 0.3 });
  // it lives in the nav: desktop, in the gap between the links and the clock; phones, where my name is (the name steps aside)
  let A = { cx: innerWidth / 2, top: 74, max: 340, left: 0, align: 'center' }, dragY = 0, pend = null;
  const PS = new Spring(1, { damping: 0.7, response: 0.25 });
  function anchor() {
    const nav = document.querySelector('.nav'), nb = nav && nav.getBoundingClientRect();
    if (!nb) return (A = { cx: innerWidth / 2, top: 74, max: innerWidth - 32, align: 'center' });
    const top = nb.top + (nb.height - 36) / 2;
    if (innerWidth <= 860) {
      const name = nav.querySelector('.brand > span:last-child'), tool = nav.querySelector('.m-sound') || nav.querySelector('.menu-btn');
      if (name && tool) { const L = name.getBoundingClientRect().left, R = tool.getBoundingClientRect().left - 10; return (A = { left: L, max: Math.max(120, R - L), top, align: 'left' }); }
    } else {
      const lk = nav.querySelector('.nav-links'), tl = nav.querySelector('.nav-tools .tool') || nav.querySelector('.nav-tools');   // the clock steps aside too
      if (lk && tl) { const L = lk.getBoundingClientRect().right + 14, R = tl.getBoundingClientRect().left - 14; if (R - L >= 140) return (A = { cx: (L + R) / 2, max: R - L, top, align: 'center' }); }
    }
    return (A = { cx: innerWidth / 2, top: nb.bottom + 10, max: Math.min(340, innerWidth - 32), align: 'center' });   // no room in the bar: float just below it
  }
  const paint = () => {
    const w = IW.x, h = IH.x, wide = w > A.max + 1;
    let left = A.align === 'left' && !wide ? A.left : (A.align === 'left' ? A.left + A.max / 2 : A.cx) - w / 2;
    left = clamp(left, 8, innerWidth - w - 8);
    isl.style.left = left + 'px'; isl.style.top = A.top + 'px'; isl.style.translate = `0 ${dragY}px`;
    isl.style.width = w + 'px'; isl.style.height = h + 'px'; isl.style.borderRadius = Math.min(h / 2, 26) + 'px';
    isl.style.opacity = IO.x; isl.style.scale = (0.85 + 0.15 * IO.x) * PS.x;
    // new content only appears once the pill has (nearly) reached its size, so text never spills or overlaps
    if (pend && performance.now() - pend.t > 90 && Math.abs(w - pend.w) < pend.w * 0.12 + 4 && Math.abs(h - pend.h) < pend.h * 0.12 + 4) { pend.n.classList.remove('out'); pend = null; }
  };
  [IW, IH, IO, PS].forEach(s => s.on(paint));
  addEventListener('resize', () => { anchor(); if (cur) render(); else paint(); });
  const acts = new Map(); let cur = null, expanded = false, ttlT = 0;
  const ICON = {
    sound: on => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9v6h4l5 4V5L8 9z"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 10l4 4M21 10l-4 4"/>'}</svg>`,
    tick: '<svg class="tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3CC2B4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    nosig: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF5A4C" stroke-width="1.8" stroke-linecap="round"><path d="M3 20h2M8 20v-4M13 20v-8M18 20V7M3 4l18 16"/></svg>',
    sig: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3CC2B4" stroke-width="1.8" stroke-linecap="round"><path d="M3 20h2M8 20v-4M13 20v-8M18 20V7"/></svg>',
  };
  // an activity: { id, html (compact), xhtml (expanded, optional), say (for screen readers), ttl (ms, transient), prio }
  function set(a) { acts.set(a.id, a); pick(); }
  function clear(id) { acts.delete(id); pick(); }
  function pick() {
    const list = [...acts.values()].sort((a, b) => (b.prio || 0) - (a.prio || 0)), next = list[0] || null;
    if (!next) {
      cur = null; expanded = false; pend = null; document.body.classList.remove('isl-on');
      isl.querySelectorAll('.isl-in').forEach(n => n.classList.add('out'));
      IO.to(0, { then: () => { if (!cur) { isl.classList.remove('live'); isl.querySelectorAll('.isl-in').forEach(n => n.remove()); } } }); IW.to(36); IH.to(36); return;
    }
    const changed = !cur || cur.id !== next.id || cur.html !== next.html; cur = next;
    if (changed) render(); if (next.say && next.say !== sr.textContent) sr.textContent = next.say;
    clearTimeout(ttlT); if (next.ttl) ttlT = setTimeout(() => clear(next.id), next.ttl);
  }
  function render() {
    anchor(); isl.classList.add('live'); document.body.classList.toggle('isl-on', A.top < 60);
    const x = expanded && cur.xhtml;
    isl.querySelectorAll('.isl-in').forEach(o => { if (o.classList.contains('out')) o.remove(); else { o.classList.add('out'); setTimeout(() => o.remove(), 140); } });   // only ever one layer leaving and one arriving
    const n = document.createElement('div'); n.className = 'isl-in out' + (x ? ' x' : ''); n.innerHTML = x ? cur.xhtml : cur.html; isl.appendChild(n);
    // measure the content, then spring the pill to fit it
    n.style.position = 'absolute'; n.style.inset = 'auto'; n.style.width = x ? Math.min(340, innerWidth - 24) + 'px' : 'max-content';   // measure at its natural size, not squeezed by the pill
    // layout size (ignores the entrance scale), plus a little slack so sub-pixel text never ellipsizes
    const w0 = n.offsetWidth + 3, h = x ? n.offsetHeight + 1 : 36;
    n.style.position = ''; n.style.width = ''; n.style.inset = '';
    const w = Math.max(36, x ? w0 : Math.min(w0, A.max));
    pend = { n, w, h, t: performance.now() };
    IO.to(1); IW.to(w); IH.to(Math.max(36, h));
    if (reduce()) { n.classList.remove('out'); pend = null; }
    if (cur.wire) cur.wire(n);
    paint();
  }
  function expand(on) { if (!cur || !cur.xhtml || on === expanded) return; expanded = on; render(); }
  isl.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') expand(true); });
  isl.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') expand(false); });
  // press: it gives a little; swipe up to put it away (rubber-bands, then dismisses on a flick); tap to open on touch
  let sy = null, ty = 0, st = 0;
  isl.addEventListener('pointerdown', e => { PS.to(0.96); if (e.target.closest('button, a')) return; sy = e.clientY; st = performance.now(); isl.setPointerCapture(e.pointerId); });   // buttons inside keep their own clicks
  isl.addEventListener('pointermove', e => { if (sy === null) return; const d = e.clientY - sy; ty = d < 0 ? d : BR.rubber(d, 200); dragY = ty; paint(); });
  const release = () => PS.to(1, { velocity: 2 });
  isl.addEventListener('pointercancel', release);
  isl.addEventListener('pointerup', e => {
    release(); if (sy === null) return; const v = ty / Math.max(1, performance.now() - st) * 1000; sy = null;
    const back = new Spring(ty, { damping: 0.8, response: 0.3 }).on(y => { dragY = y; paint(); });
    if (ty < -24 || v < -500) { back.to(-70, { velocity: v, then: () => { dragY = 0; if (cur) clear(cur.id); } }); return; }
    back.to(0, { velocity: v });
    if (Math.abs(ty) < 6 && e.pointerType === 'touch' && !e.target.closest('button')) expand(!expanded);
  });

  // music from the drum machine: equalizer in the pill; hover to see the steps and stop it
  let steps = null;
  addEventListener('br-music', e => {
    if (!e.detail.on) return clear('music');
    set({ id: 'music', prio: 5, say: 'Drum machine playing at 96 BPM',
      html: `<span class="eq"><i></i><i></i><i></i><i></i></span><span>96 BPM</span>`,
      xhtml: `<div class="row"><span class="eq"><i></i><i></i><i></i><i></i></span><span class="mono">Drum machine · Off-hours</span><button type="button" data-stop>Stop</button></div><div class="steps">${'<i></i>'.repeat(16)}</div>`,
      wire: n => { steps = n.querySelectorAll('.steps i'); const b = n.querySelector('[data-stop]'); b && b.addEventListener('click', () => document.getElementById('play') && document.getElementById('play').click()); } });
  });
  addEventListener('br-beat', e => {
    if (!cur || cur.id !== 'music') return; const { s, hits } = e.detail, H = { Kick: 14, Snare: 11, 'Hi-hat': 7, Clarinet: 9 };
    isl.querySelectorAll('.isl-in:not(.out) .eq i').forEach((b, i) => { const name = ['Kick', 'Snare', 'Hi-hat', 'Clarinet'][i]; b.style.height = (hits.includes(name) ? H[name] : 3) + 'px'; });
    if (steps) steps.forEach((d, i) => d.classList.toggle('on', i === s));
  });
  // small confirmations
  document.addEventListener('click', e => {
    if (e.target.closest('[data-copy]')) set({ id: 'copy', prio: 9, ttl: 1800, say: 'Email address copied', html: `${ICON.tick}<span>Email copied</span>` });
    if (e.target.closest('[data-sound-toggle]')) setTimeout(() => set({ id: 'sound', prio: 8, ttl: 1400, say: BR.sound.on ? 'Sound on' : 'Sound off', html: `${ICON.sound(BR.sound.on)}<span>${BR.sound.on ? 'Sound on' : 'Sound off'}</span>` }), 0);
  });
  addEventListener('offline', () => set({ id: 'net', prio: 10, say: 'No connection', html: `${ICON.nosig}<span>No signal</span>` }));
  addEventListener('online', () => set({ id: 'net', prio: 10, ttl: 1600, say: 'Back online', html: `${ICON.sig}<span>Signal’s back</span>` }));
  // Pixi drawing my portrait: a progress ring
  addEventListener('br-activity', e => {
    const d = e.detail; if (d.id !== 'draw') return;
    if (d.done) return set({ id: 'draw', prio: 6, ttl: 1500, say: 'Portrait finished', html: `${ICON.tick}<span>Portrait done</span>` });
    const pct = Math.round(d.progress * 100), ring = isl.querySelector('.isl-in:not(.out) .ring');
    if (ring && cur && cur.id === 'draw') { ring.style.setProperty('--p', d.progress); const t = isl.querySelector('.isl-in:not(.out) [data-pct]'); if (t) t.textContent = pct + '%'; return; }
    set({ id: 'draw', prio: 6, say: 'Pixi is drawing a portrait', html: `<span class="ring" style="--p:${d.progress}"></span><span>Pixi is drawing</span><span class="mono" data-pct>${pct}%</span>` });
  });

  // an offer (only when the shop has a link): compact line, expands to a button
  addEventListener('br-activity', e => {
    const d = e.detail; if (d.id !== 'offer') return;
    set({ id: 'offer', prio: 3, ttl: d.url ? 9000 : 1800, say: d.text, html: `<span>${d.icon || ''}</span><span>${d.text}</span>`,
      xhtml: d.url && `<div class="row"><span>${d.icon || ''} ${d.text}</span></div><div class="row"><span class="mono">Opens in a new tab</span><a class="isl-a" href="${d.url}" target="_blank" rel="noopener">${d.cta} ↗</a></div>` });
  });
  // a secret found; hide and seek with a running clock and a give-up button
  let seekIv = 0;
  addEventListener('br-activity', e => {
    const d = e.detail;
    if (d.id === 'secret') set({ id: 'secret', prio: 9, ttl: 2600, say: `Secret found: ${d.name}`,
      html: `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="#FF5A4C"/></svg><span>${d.name}</span><span class="mono">${d.n}/${d.of}</span>` });
    if (d.id === 'seek') {
      clearInterval(seekIv);
      if (d.done) { clear('seek'); if (d.found) set({ id: 'seek-done', prio: 7, ttl: 2000, say: `Found in ${d.secs} seconds`, html: `${ICON.tick}<span>Found in ${d.secs} s</span>` }); return; }
      const fmt = () => { const s = Math.floor((Date.now() - d.t0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
      set({ id: 'seek', prio: 4, say: 'Hide and seek: Pixi is hiding somewhere on this page',
        html: `<span class="eq"><i style="height:6px;background:#F2F3F1"></i><i style="height:6px;background:#F2F3F1"></i></span><span>Find Pixi</span><span class="mono" data-seek>0:00</span>`,
        xhtml: `<div class="row"><span>Pixi is hiding on this page</span><span class="mono" data-seek>0:00</span></div><div class="row"><span class="mono">Scroll and look for two eyes</span><button type="button" data-giveup>Give up</button></div>`,
        wire: n => { const g = n.querySelector('[data-giveup]'); g && g.addEventListener('click', () => dispatchEvent(new Event('br-seek-giveup'))); } });
      seekIv = setInterval(() => { isl.querySelectorAll('[data-seek]').forEach(x => { x.textContent = fmt(); }); }, 1000);
    }
  });

  /* ---------- small things in the chrome ---------- */
  // the nav dot glides to the link you point at, then home to the current page
  const links = document.querySelector('.nav-links');
  if (links && fine.matches) {
    const dot = document.createElement('i'); dot.className = 'nav-glide'; dot.setAttribute('aria-hidden', 'true'); links.appendChild(dot);
    const st2 = document.createElement('style'); st2.textContent = `.nav-links { position: relative; } .nav-links a[aria-current="page"]::before { opacity: 0; }
      .nav-glide { position: absolute; left: 0; bottom: -2px; width: 4px; height: 4px; border-radius: 50%; background: var(--accent); pointer-events: none; }`;
    document.head.appendChild(st2);
    const gx = new Spring(0, { damping: 0.86, response: 0.32 }), go = new Spring(0, { damping: 1, response: 0.2 }), gw = new Spring(4, { damping: 0.7, response: 0.25 });
    const ap = () => { dot.style.translate = `${gx.x - gw.x / 2}px 0`; dot.style.opacity = go.x; dot.style.width = gw.x + 'px'; };
    [gx, go, gw].forEach(q => q.on(ap));
    const centerOf = a => { const lr = links.getBoundingClientRect(), r = a.getBoundingClientRect(); return r.left - lr.left + r.width / 2; };
    const home = () => { const c = links.querySelector('a[aria-current="page"]'); if (c) { gx.to(centerOf(c)); go.to(1); } else go.to(0); gw.to(4); };
    const c0 = links.querySelector('a[aria-current="page"]'); if (c0) { gx.set(centerOf(c0)); go.set(1); } else go.set(0); ap();
    links.addEventListener('pointerover', e => { const a = e.target.closest('a'); if (!a) return; const x = centerOf(a); if (go.x < 0.05) gx.set(x); gw.to(Math.min(14, 4 + Math.abs(x - gx.x) / 20)); gx.to(x, { then: () => gw.to(4) }); go.to(1); });   // stretches a little as it travels
    links.addEventListener('pointerleave', home);
    addEventListener('resize', home);
  }
  // the theme icon turns half a circle, with a little overshoot
  document.querySelectorAll('[data-theme-toggle] svg').forEach(svg => {
    const rt = new Spring(0, { damping: 0.6, response: 0.45 }).on(v => { svg.style.rotate = v + 'deg'; });
    svg.closest('[data-theme-toggle]').addEventListener('click', () => rt.to(rt.target + 180));
  });
  // turning sound on: the speaker's waves pop out
  const sst = document.createElement('style');
  sst.textContent = `[data-sound-toggle].pop svg path:not(:first-child) { animation: wpop .5s cubic-bezier(.34,1.56,.64,1); } @keyframes wpop { from { opacity: 0; scale: .4; transform-origin: 40% 50%; } }
    .email.copied [data-email] { background: linear-gradient(color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent) 22%, transparent)) 0 0 / 0 100% no-repeat; animation: csweep .7s cubic-bezier(.16,1,.3,1) forwards; }
    @keyframes csweep { 60% { background-size: 100% 100%; } to { background-size: 100% 100%; background-position: 100% 0; } }`;
  document.head.appendChild(sst);
  document.addEventListener('click', e => {
    const sb = e.target.closest('[data-sound-toggle]'); if (sb && BR.sound.on && !reduce()) { sb.classList.remove('pop'); void sb.offsetWidth; sb.classList.add('pop'); }
    const cp = e.target.closest('[data-copy]'); if (cp && !reduce()) { const em = cp.closest('.email'); if (em) { em.classList.remove('copied'); void em.offsetWidth; em.classList.add('copied'); setTimeout(() => em.classList.remove('copied'), 900); } }
  });

  /* ---------- 3. magnetic controls (mouse and trackpad only) ---------- */
  if (fine.matches && !reduce()) {
    const SEL = '.btn, .pill, .tool, .menu-btn, .nav-links a, .chip, .seg button';
    const springs = new WeakMap();
    const get = el => { let s = springs.get(el); if (!s) { const x = new Spring(0, { damping: 0.7, response: 0.3 }), y = new Spring(0, { damping: 0.7, response: 0.3 }); const ap = () => { el.style.translate = `${x.x}px ${y.x}px`; }; x.on(ap); y.on(ap); s = { x, y }; springs.set(el, s); } return s; };
    let last = null;
    addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest(SEL);
      if (last && last !== el) { const s = get(last); s.x.to(0); s.y.to(0); last = null; }
      if (!el || el.closest('.isl, .pixi-pt')) return;
      const r = el.getBoundingClientRect(), s = get(el), k = Math.min(1, 40 / Math.max(r.width, r.height)) * 0.35 + 0.08;   // small things lean more, big things barely move
      s.x.to(clamp((e.clientX - (r.left + r.width / 2)) * k, -5, 5)); s.y.to(clamp((e.clientY - (r.top + r.height / 2)) * k, -4, 4)); last = el;
    }, { passive: true });
  }
})();
