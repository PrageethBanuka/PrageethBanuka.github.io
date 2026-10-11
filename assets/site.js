/* SIGNAL — shared runtime: theme, sound, chrome, springs */
(function () {
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const t = store.get('br-theme');
  if (t && !root.dataset.mode) root.dataset.theme = t;

  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => RM.matches;

  /* ---------- springs: damping ratio + response (seconds), interruptible, velocity-aware ---------- */
  const active = new Set();
  let running = false, last = 0;
  function frame(now) {
    const dt = Math.min(0.064, (now - last) / 1000 || 0.016); last = now;
    for (const s of [...active]) s.step(dt);
    if (active.size) requestAnimationFrame(frame); else running = false;
  }
  class Spring {
    constructor(v = 0, o = {}) { this.x = v; this.v = 0; this.target = v; this.subs = []; this.done = null; this.cfg(o); }
    cfg({ damping = 1, response = 0.4 } = {}) { this.k = (2 * Math.PI / response) ** 2; this.c = 4 * Math.PI * damping / response; return this; }
    on(f) { this.subs.push(f); return this; }
    emit() { for (const f of this.subs) f(this.x, this); }
    set(v) { this.x = this.target = v; this.v = 0; active.delete(this); this.emit(); return this; }
    stop() { active.delete(this); return this; }
    to(target, o = {}) {
      if (o.damping !== undefined || o.response !== undefined) this.cfg({ damping: o.damping ?? 1, response: o.response ?? 0.4 });
      if (o.velocity !== undefined) this.v = o.velocity;
      this.target = target; this.done = o.then || null;
      if (reduce() && !o.force) { this.set(target); const d = this.done; this.done = null; d && d(); return this; }
      active.add(this);
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      return this;
    }
    step(dt) {
      const n = Math.ceil(dt * 240), h = dt / n;
      for (let i = 0; i < n; i++) { const a = -this.k * (this.x - this.target) - this.c * this.v; this.v += a * h; this.x += this.v * h; }
      const sc = Math.max(1, Math.abs(this.target));
      if (Math.abs(this.v) < 0.002 * sc && Math.abs(this.x - this.target) < 0.0005 * sc) {
        this.x = this.target; this.v = 0; active.delete(this); this.emit();
        const d = this.done; this.done = null; d && d(); return;
      }
      this.emit();
    }
  }
  const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);
  const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  function tracker() {
    const h = [];
    return {
      add(p) { h.push({ p, t: performance.now() }); if (h.length > 6) h.shift(); },
      vel() { if (h.length < 2) return 0; const a = h[0], b = h[h.length - 1]; const dt = (b.t - a.t) / 1000; return dt > 0 ? (b.p - a.p) / dt : 0; },
      reset() { h.length = 0; },
    };
  }

  /* ---------- sound: off by default, quantised feel ---------- */
  let ctx = null;
  const sound = { on: store.get('br-sound') === 'on' };
  function ac() { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); } if (ctx && ctx.state !== 'running') ctx.resume(); return ctx; }
  // iOS: Web Audio is muted by the silent switch and stays locked until a tap.
  // On the first gesture, ask for a "playback" session (ignores the switch), play a silent clip as a fallback,
  // and wake the AudioContext so later sounds play straight away.
  let unlocked = false;
  function silentWav() {
    const n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    try { const el = new Audio(silentWav()); el.setAttribute('playsinline', ''); el.volume = 0.01; const p = el.play(); if (p) p.catch(() => {}); } catch (e) { /* ignore */ }
    const c = ac(); if (c) { const src = c.createBufferSource(); src.buffer = c.createBuffer(1, 1, 22050); src.connect(c.destination); src.start(0); }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(t => addEventListener(t, unlock, { capture: true, passive: true }));
  function noiseBuf(c, dur) {
    const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
  }
  function blip(kind = 'tick', force = false) {
    if (!sound.on && !force) return;
    const c = ac(); if (!c) return;
    if (c.state !== 'running') { c.resume().then(() => play(c, kind)).catch(() => {}); return; }
    play(c, kind);
  }
  function pourSound(c, big) {
    const t0 = c.currentTime + 0.01, out = c.createGain(); out.gain.value = 0.9; out.connect(c.destination);
    const tone = (f, t, dur, g, type = 'sine') => { const o = c.createOscillator(), e = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(e).connect(out); o.start(t); o.stop(t + dur + 0.02); return o; };
    // 1. ceramic clink: two inharmonic partials, quick decay
    tone(2380, t0, 0.22, 0.09); tone(3710, t0, 0.14, 0.045);
    // 2. the pour: band-passed noise whose pitch rises as the cup fills
    const len = 0.78, src = c.createBufferSource(); src.buffer = noiseBuf(c, len + 0.1);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7;
    bp.frequency.setValueAtTime(380, t0 + 0.08); bp.frequency.exponentialRampToValueAtTime(1500, t0 + 0.08 + len);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const g = c.createGain(); g.gain.setValueAtTime(0, t0 + 0.08); g.gain.linearRampToValueAtTime(1.5, t0 + 0.14);
    g.gain.setValueAtTime(1.4, t0 + 0.08 + len - 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08 + len + 0.06);
    const lfo = c.createOscillator(), depth = c.createGain(); lfo.frequency.value = 11; depth.gain.value = 0.4; lfo.connect(depth).connect(g.gain); // bubbly texture
    src.connect(bp).connect(lp).connect(g).connect(out); src.start(t0 + 0.08); src.stop(t0 + 0.08 + len + 0.1); lfo.start(t0 + 0.08); lfo.stop(t0 + 0.08 + len + 0.1);
    // 3. last drip
    const d = tone(1250, t0 + 0.95, 0.09, 0.09); d.frequency.exponentialRampToValueAtTime(620, t0 + 1.0);
    // milestone: a small two-note chime
    if (big) { tone(659.25, t0 + 1.08, 0.5, 0.1, 'triangle'); tone(987.77, t0 + 1.2, 0.7, 0.08, 'triangle'); }
  }
  function play(c, kind) {
    if (kind === 'pour' || kind === 'pour-big') return pourSound(c, kind === 'pour-big');
    const t0 = c.currentTime;
    if (kind === 'tick') {
      const s = c.createBufferSource(); s.buffer = noiseBuf(c, 0.05);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 3;
      const g = c.createGain(); g.gain.setValueAtTime(0.18, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);
      s.connect(f).connect(g).connect(c.destination); s.start(t0); s.stop(t0 + 0.05);
    } else {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = kind === 'tone' ? 440 : 660;
      const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 0.45);
    }
  }

  /* ---------- chrome ---------- */
  const MARK = (draw) => `<span class="sig${draw ? ' draw' : ''}" role="img" aria-label="Prageeth, signature"></span><span class="star" aria-hidden="true"></span>`;
  const PAGES = [
    ['engineering', 'engineering.html', 'Engineering'],
    ['design', 'design.html', 'Design'],
    ['experience', 'experience.html', 'Experience'],
    ['offhours', 'offhours.html', 'Off-hours'],
  ];
  /* ---------- intro: the old site's handwritten signature, replayed from its stroke timing ---------- */
  function intro() {
    let seen = null; try { seen = sessionStorage.getItem('br-intro'); } catch (e) {}
    if (seen || reduce()) return;
    try { sessionStorage.setItem('br-intro', '1'); } catch (e) {}
    const el = document.createElement('div'); el.className = 'intro'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<canvas></canvas><span class="label intro-skip">Tap to skip</span>';
    document.currentScript.insertAdjacentElement('beforebegin', el);
    const cv = el.querySelector('canvas'), c = cv.getContext('2d');
    const img = new Image(); img.src = 'assets/signature-time.png';
    let T, A, out, oc, w, h, start = 0, done = false, raf = 0;
    const DRAW = 1250, HOLD = 380;
    const finish = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      el.classList.add('out'); setTimeout(() => el.remove(), 700);
    };
    el.addEventListener('pointerdown', finish); addEventListener('keydown', finish, { once: true });
    setTimeout(finish, 4000); // never block the page for long, even if the image is slow
    img.onload = () => {
      w = img.naturalWidth; h = img.naturalHeight;
      const t = document.createElement('canvas'); t.width = w; t.height = h; const tc = t.getContext('2d'); tc.drawImage(img, 0, 0);
      let d; try { d = tc.getImageData(0, 0, w, h).data; } catch (e) { return finish(); }
      T = new Uint8Array(w * h); A = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) { T[i] = d[i * 4]; A[i] = d[i * 4 + 3]; }
      oc = document.createElement('canvas'); oc.width = w; oc.height = h; out = oc.getContext('2d').createImageData(w, h);
      const dpr = Math.min(2, devicePixelRatio || 1), cw = cv.clientWidth, ch = cw * h / w;
      cv.width = cw * dpr; cv.height = ch * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingQuality = 'high';
      const ink = getComputedStyle(root).getPropertyValue('--ink').trim();
      const tmp = document.createElement('canvas').getContext('2d'); tmp.fillStyle = ink; tmp.fillRect(0, 0, 1, 1); const [r, g, b] = tmp.getImageData(0, 0, 1, 1).data;
      start = performance.now();
      const frame = now => {
        if (done) return;
        const p = Math.min(1, (now - start) / DRAW), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2; // ease in-out, like a pen
        const edge = e * 262, o = out.data;
        for (let i = 0; i < T.length; i++) {
          const a = A[i]; if (!a) continue;
          const k = Math.max(0, Math.min(1, (edge - T[i]) / 8)); // soft leading edge
          const j = i * 4; o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = a * k;
        }
        oc.getContext('2d').putImageData(out, 0, 0);
        c.clearRect(0, 0, cw, ch); c.drawImage(oc, 0, 0, cw, ch);
        if (p < 1) raf = requestAnimationFrame(frame);
        else { el.classList.add('lit'); setTimeout(finish, HOLD + 260); }
      };
      raf = requestAnimationFrame(frame);
    };
    img.onerror = finish;
  }

  function nav(page, opts = {}) {
    intro();
    const links = PAGES.map(([id, href, name], i) =>
      `<li><a href="${href}"${id === page ? ' aria-current="page"' : ''}><span class="n">0${i + 1}</span>${name}</a></li>`).join('');
    const themeBtn = root.dataset.mode ? '' :
      `<button class="tool" type="button" data-theme-toggle aria-label="Switch light or dark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg></button>`;
    const here = (PAGES.find(p => p[0] === page) || [])[2] || '';
    const DESC = { engineering: 'Six live projects', design: 'Posters and campaigns', experience: 'WSO2, leadership, education', offhours: 'Sky and music, in red light' };
    const mlinks = [['home', 'index.html', 'Index', 'Coffee runs through my circuits'], ...PAGES.map(([id, href, name]) => [id, href, name, DESC[id]])]
      .map(([id, href, name, d], i) => `<li><a href="${href}"${id === page ? ' aria-current="page"' : ''}><span class="n">0${i}</span><b>${name}</b><small>${d}</small><span class="go" aria-hidden="true">→</span></a></li>`).join('');
    const mTheme = root.dataset.mode ? '' : `<button class="pill" type="button" data-theme-toggle><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>Light / dark</button>`;
    const html = `<header class="nav"><div class="wrap nav-in">
      <a class="brand" href="index.html" aria-label="Banuka Rajapaksha, home">${MARK(opts.draw)}<span>Banuka Rajapaksha</span></a>
      <ul class="nav-links">${links}</ul>
      <div class="nav-tools">
        <span class="clock" data-clock>Colombo --:--</span>
        <button class="tool" type="button" data-sound-toggle aria-pressed="${sound.on}" aria-label="Interface sound">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path class="w" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg></button>
        ${themeBtn}
      </div>
      ${here ? `<span class="here">${here}</span>` : ''}
      <button class="tool m-sound" type="button" data-sound-toggle aria-pressed="${sound.on}" aria-label="Interface sound">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path class="w" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M17 10l4 4M21 10l-4 4"/></svg></button>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mmenu" aria-label="Menu"><i></i><i></i></button>
      </div></header>
      <div class="mmenu" id="mmenu" aria-label="Site menu">
        <ol>${mlinks}</ol>
        <div class="mfoot">
          <div class="row">${mTheme}<button class="pill" type="button" data-sound-toggle aria-pressed="${sound.on}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>Sound</button></div>
          <div class="row"><a class="pill" href="https://www.linkedin.com/in/banuka-rajapaksha" target="_blank" rel="noopener">LinkedIn ↗</a><a class="pill" href="https://github.com/PrageethBanuka" target="_blank" rel="noopener">GitHub ↗</a><a class="pill" href="https://medium.com/@prageethbanuka2002" target="_blank" rel="noopener me">Medium ↗</a></div>
          <span class="label" data-clock>Colombo --:--</span>
        </div>
      </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
  }
  function footer(opts = {}) {
    const html = `<footer class="transmit"><div class="wrap">
      <div class="grid">
        <div class="hang"><span class="label">Transmit</span></div>
        <div class="main">
          <h2 class="display">${opts.headline || 'Send a signal<span class="dot">.</span>'}</h2>
          <div class="tx-row">
            <span class="email"><span data-email>prageethbanuka2002@gmail.com</span>
              <button class="tool" type="button" data-copy aria-label="Copy email address"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button></span>
            <a class="btn ghost" href="https://www.linkedin.com/in/banuka-rajapaksha" target="_blank" rel="noopener">LinkedIn <span class="arr">↗</span></a>
            <a class="btn ghost" href="https://github.com/PrageethBanuka" target="_blank" rel="noopener">GitHub <span class="arr">↗</span></a>
            <a class="btn ghost" href="https://medium.com/@prageethbanuka2002" target="_blank" rel="noopener me">Medium <span class="arr">↗</span></a>
            <button class="btn" type="button" data-wa-open><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>WhatsApp me</button>
            <span class="label" data-copy-note aria-live="polite"></span>
          </div>
          <div class="foot">
            <span class="label">© 2026 Banuka Rajapaksha · v.2026</span>
            <span class="label" data-clock-long>Colombo, Sri Lanka</span>
            <span class="label">Coffee runs through my circuits ☕</span>
          </div>
          <span class="sig sig-xl" role="img" aria-label="Signed, Prageeth" style="view-transition-name:none"></span>
        </div>
      </div></div></footer>`;
    document.currentScript.insertAdjacentHTML('beforebegin', `
      <div class="wa-scrim" data-wa-close></div>
      <section class="wa" role="dialog" aria-modal="true" aria-labelledby="waTitle" inert>
        <div class="wa-grab" aria-hidden="true"><span></span></div>
        <div class="wa-in">
          <div class="wa-top"><div><span class="label">Direct line · WhatsApp</span><h2 class="h3" id="waTitle">Send me a message</h2></div>
            <button class="tool" type="button" data-wa-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
          <form class="wa-form" novalidate>
            <label for="waName" class="label">Your name</label>
            <input id="waName" name="name" autocomplete="name" maxlength="60" required>
            <span class="label">About</span>
            <div class="wa-topics" role="radiogroup" aria-label="Topic">
              ${['Internship', 'Collaboration', 'Design work', 'Just saying hi'].map((t, i) => `<label><input type="radio" name="topic" value="${t}"${i === 3 ? ' checked' : ''}><span>${t}</span></label>`).join('')}
            </div>
            <label for="waMsg" class="label">Message</label>
            <textarea id="waMsg" name="msg" rows="4" maxlength="600" required></textarea>
            <p class="wa-err" aria-live="polite"></p>
            <button class="btn" type="submit">Open in WhatsApp <span class="arr">→</span></button>
            <p class="wa-note">WhatsApp opens with your message ready. Nothing is sent until you tap send there.</p>
          </form>
        </div>
      </section>`);
    document.currentScript.insertAdjacentHTML('beforebegin', html);
  }

  function wire() {
    const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark'; store.set('br-theme', root.dataset.theme); blip('tick');
      window.dispatchEvent(new Event('br-theme'));
    }));
    document.querySelectorAll('[data-sound-toggle]').forEach(b => b.addEventListener('click', () => {
      sound.on = !sound.on; store.set('br-sound', sound.on ? 'on' : 'off'); document.querySelectorAll('[data-sound-toggle]').forEach(x => x.setAttribute('aria-pressed', sound.on));
      if (sound.on) blip('tone');
    }));
    // WhatsApp sheet: rises from the bottom, drag down to dismiss
    const wa = document.querySelector('.wa'), was = document.querySelector('.wa-scrim');
    if (wa) {
      const WA_NUMBER = '94716220226';
      let H = 600; const y = new Spring(1, { damping: 1, response: 0.4 }).on(v => {
        wa.style.transform = `translateY(${Math.max(0, v) * (H + 40) + Math.min(0, v) * 0}px)`;
        was.style.opacity = BR.clamp(1 - v, 0, 1);
      });
      y.set(1);
      const open = () => { H = wa.offsetHeight; wa.inert = false; wa.classList.add('live'); was.classList.add('live'); document.body.classList.add('menu-open'); y.to(0, { damping: 1, response: 0.42 }); setTimeout(() => wa.querySelector('#waName').focus({ preventScroll: true }), 300); blip('tick'); };
      const close = (v) => { was.classList.remove('live'); document.body.classList.remove('menu-open'); wa.inert = true; y.to(1, { velocity: v ? v / (H + 40) : 0, damping: 1, response: 0.36, then: () => wa.classList.remove('live') }); };
      document.querySelectorAll('[data-wa-open]').forEach(b => b.addEventListener('click', open));
      document.querySelectorAll('[data-wa-close]').forEach(b => b.addEventListener('click', () => close()));
      addEventListener('keydown', e => { if (e.key === 'Escape' && wa.classList.contains('live')) close(); });
      const grab = wa.querySelector('.wa-grab'), trk = tracker(); let d0 = null;
      grab.addEventListener('pointerdown', e => { grab.setPointerCapture(e.pointerId); d0 = e.clientY - y.x * (H + 40); trk.reset(); y.stop(); });
      grab.addEventListener('pointermove', e => { if (d0 === null) return; const px = e.clientY - d0; const r = px < 0 ? BR.rubber(px, H) : px; y.set(r / (H + 40)); trk.add(r); });
      const end = () => { if (d0 === null) return; d0 = null; const v = trk.vel(), land = y.x * (H + 40) + project(v); if (land > H * 0.4) close(v); else y.to(0, { velocity: v / (H + 40), damping: 0.8, response: 0.35 }); };
      grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
      const form = wa.querySelector('form'), err = wa.querySelector('.wa-err');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const F = form.elements, name = F.namedItem('name').value.trim(), msg = F.namedItem('msg').value.trim(), topic = (form.querySelector('[name=topic]:checked') || {}).value || '';
        if (!name) { delete err.dataset.ok; err.textContent = 'Add your name so I know who it is.'; F.namedItem('name').focus(); return; }
        if (!msg) { delete err.dataset.ok; err.textContent = 'Write a message first.'; F.namedItem('msg').focus(); return; }
        err.textContent = ''; delete err.dataset.ok;
        const text = `Hi Banuka, I'm ${name}.${topic && topic !== 'Just saying hi' ? ` (${topic})` : ''}\n\n${msg}\n\n— via prageethbanuka.github.io`;
        const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
        const w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url;
        err.dataset.ok = '1'; err.textContent = 'Opening WhatsApp. Your message is ready to send.';
      });
    }
    // progressive disclosure: detail folds behind a button on phones, stays open on wide screens
    document.querySelectorAll('[data-collapse]').forEach(el => {
      const d = document.createElement('details'); d.className = 'more';
      d.innerHTML = `<summary>${el.dataset.collapse}</summary>`;
      el.before(d); d.appendChild(el);
      if (matchMedia('(min-width: 861px)').matches) d.open = true;
    });
    const mb = document.querySelector('.menu-btn'), mm = document.getElementById('mmenu');
    if (mb && mm) {
      const set = open => {
        mb.setAttribute('aria-expanded', open); mm.classList.toggle('open', open); document.body.classList.toggle('menu-open', open);
        mm.inert = !open; blip('tick');
        if (open) setTimeout(() => (mm.querySelector('[aria-current]') || mm.querySelector('a')).focus({ preventScroll: true }), 80);
      };
      mm.inert = true;
      mb.addEventListener('click', () => set(mb.getAttribute('aria-expanded') !== 'true'));
      mm.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
      addEventListener('keydown', e => { if (e.key === 'Escape' && mm.classList.contains('open')) { set(false); mb.focus(); } });
      matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) set(false); });
    }
    document.querySelectorAll('.nav-links a, .brand').forEach(a => {
      a.addEventListener('pointerenter', () => blip('tick'));
    });
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });
    const tick = () => {
      const s = fmt.format(new Date());
      const sx = window.BR && BR.clockSuffix ? (typeof BR.clockSuffix === 'function' ? BR.clockSuffix() : BR.clockSuffix) : '';
      document.querySelectorAll('[data-clock]').forEach(e => { e.textContent = `Colombo ${s}${sx}`; });
      document.querySelectorAll('[data-clock-long]').forEach(e => { e.textContent = `My local time · ${s} · UTC+5:30`; });
    };
    tick(); setInterval(tick, 20000); window.addEventListener('br-moments', tick);
    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const em = document.querySelector('[data-email]'), note = document.querySelector('[data-copy-note]');
      const ok = () => { note.textContent = 'Copied'; blip('tone'); };
      const fail = () => { const r = document.createRange(); r.selectNodeContents(em); const s = getSelection(); s.removeAllRanges(); s.addRange(r); note.textContent = 'Selected. Press ⌘C'; };
      try { navigator.clipboard.writeText(em.textContent).then(ok, fail); } catch (e) { fail(); }
      setTimeout(() => { note.textContent = ''; }, 2400);
    }));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', wire) : wire();

  // moments (time-based features) and the hidden trail load on every page
  ['moments.js', 'secret.js', 'extras.js'].forEach(f => { const el = document.createElement('script'); el.src = 'assets/' + f + '?v=20261011h'; document.head.appendChild(el); });

  window.BR = { Spring, project, rubber, clamp, tracker, reduce, RM, blip, sound, ac, noiseBuf, nav, footer, store };
})();
