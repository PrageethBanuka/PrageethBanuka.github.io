/* Pixi: the little voice in my head, living in the corner of the site.
   Built from RoboEyes: two rounded rectangles, a lot of feelings.
   Looks at your pointer, blinks, wanders, naps, thinks out loud (rarely), and can be picked up and thrown.
   Drag it down off the screen to tuck it away; tap the peeking eyes to bring it back. */
(function () {
  const BR = window.BR; if (!BR || window.__pixi) return; window.__pixi = true;
  const { Spring, project, rubber, clamp, reduce, store } = BR;
  const root = document.documentElement, page = (location.pathname.match(/(\w+)\.html$/) || [, 'index'])[1];
  const W = 60, H = 40, PAD = 16, CELL = 4, COLS = W / CELL, ROWS = H / CELL;   // a 15 x 10 dot matrix

  /* ---------- what goes through my head ---------- */
  const LINES = [
    'Coffee runs through my circuits. That stopped being a metaphor.',
    'One more spring tweak. Then sleep. Probably.',
    'Everything on this site moves at 96 BPM. Tap along.',
    'Is it a bug or a feature? Let me check the commit message.',
    'Ship to 10%, watch the graphs, ship to 100%. Progressive delivery, but for life.',
    'Clear sky tonight? The telescope’s already by the door.',
    'Should be studying. Am adjusting a damping ratio instead.',
    'If it doesn’t feel right, it isn’t done.',
    'Drag me around. I don’t bite. I don’t even have a mouth.',
    'Two rectangles. That’s all a face needs.',
  ];
  const PAGE = {
    index: ['Psst. Inner voice here. Don’t mind me.', 'Tap the coffee. I dare you.'],
    engineering: ['Every demo on this page runs live. Go poke one.', 'AdaptiFocus hit 94.3% accuracy. My own focus, not so much.'],
    design: ['Scrub the edit bay. Feels like Final Cut, right?', 'Kerning is a love language.'],
    experience: ['OpenChoreo team at WSO2. Rolling out releases one slice at a time.', 'Most of leadership is remembering to send the reminder.'],
    offhours: () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
      ? ['Shh. Red light. Protect your night vision.', 'Find a bright one and stare. That’s the whole hobby.']
      : ['Star chart by day. Wait till sunset, it goes red.', 'Hover a star. I know most of their names.'],
  };
  const SAY = {
    fast: 'Whoa. Scroll slower, I’m reading too.',
    wake: 'I wasn’t asleep. I was compiling.',
    back: 'Oh, you’re back. I kept your seat warm.',
    light: 'Ah. Bright.', dark: 'Better. Much better.',
    copy: 'Email copied. I reply faster than my CI.',
    birthday: 'It’s my birthday. Act surprised.',
    thrown: 'Wheee. Again? No. Maybe.',
    poke: 'Okay, okay. Personal space.',
    untuck: 'I’m back. Did you miss me?',
  };
  const AT = {
    img: ['Enhance. Enhance.', 'I remember this one.', 'Good light in this one.'],
    canvas: ['This one’s live. Poke it.', 'Running in your browser, right now.'],
    btn: ['Press it. Go on.', 'I’ll hold the button warm for you.'],
    chip: ['Boop.', 'Tiny pill, big skill.'],
    head: ['Nice view from up here.', 'Reading over your shoulder.'],
  };
  /* ---------- my day, on Colombo time: each slot sets a mood, a tiny dot prop, and what's on my mind ----------
     prop: 'lamp' = red headlamp dot (night observing), 'type' = typing dots (work hours) */
  const ROUTINE = [
    { from: 5, to: 7, mood: 'tired', sleepy: true, say: ['Up before the sun. Why.', 'Five more minutes. Five more years.'] },
    { from: 7, to: 9, mood: 'tired', decaf: true, say: ['Coffee first. Then thoughts.', 'Loading personality… 40%.', 'Type “coffee”. Please. For me.'] },
    { from: 9, to: 12.5, weekday: true, prop: 'type', say: ['Standup energy: high. Caffeine: higher.', 'Shipping something at WSO2. Probably YAML.', 'Rolling out to 10% first. Always 10% first.'] },
    { from: 12.5, to: 13.5, say: ['Lunch. Rice and curry, obviously.', 'Brain on lunch break. Eyes still working.'] },
    { from: 13.5, to: 18, weekday: true, prop: 'type', say: ['Afternoon slump. Another coffee?', 'Progressive delivery: 10%… 50%… 100%. Breathe.', 'Reviewing a PR. Being nice about it.'] },
    { from: 9, to: 18, weekend: true, say: ['No standup today. Telescope maintenance.', 'Weekend. Designing a poster nobody asked for.', 'Saturday brain. Sunday brain. Same brain, more coffee.'] },
    { from: 18, to: 20, say: ['Sunset check. Clouds, please behave.', 'Golden hour. Then the good hour.'] },
    { from: 20, to: 24, prop: 'lamp', say: ['Red headlamp on. Telescope out.', 'Hunting for something faint and far away.', 'Night vision mode. Don’t open the fridge.'] },
    { from: 0, to: 5, mood: 'tired', prop: 'lamp', sleepy: true, say: ['Why are we awake? Oh right. Stars.', 'Go to sleep. Says the one awake.', 'Just one more frame of the Moon.'] },
  ];
  const clock = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23', timeZone: 'Asia/Colombo' }).formatToParts(new Date()).map(x => [x.type, x.value])); return { h: +p.hour + p.minute / 60, wk: p.weekday === 'Sat' || p.weekday === 'Sun' }; };
  const slot = () => { const { h, wk } = clock(); return ROUTINE.find(s => h >= s.from && h < s.to && !(s.weekday && wk) && !(s.weekend && !wk)) || {}; };
  let caffeinated = false;
  const pool = () => { const p = PAGE[page], R = slot().say || []; return [...(typeof p === 'function' ? p() : p || []), ...LINES, ...R, ...R]; };   // what I'm doing right now comes up twice as often

  /* ---------- markup + style ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .pixi { position: fixed; left: 0; top: 0; z-index: 60; width: ${W}px; height: ${H}px; padding: 0; border: 0; background: none; cursor: grab;
    touch-action: none; -webkit-tap-highlight-color: transparent; transition: opacity var(--h) ease; will-change: transform; }
  .pixi:active { cursor: grabbing; }
  .pixi canvas { width: ${W}px; height: ${H}px; display: block; }
  .pixi:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 12px; }
  .pixi.away { opacity: 0; pointer-events: none; }
  .pixi-z { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); opacity: 0; }
  .pixi-z.on { animation: pz 2.5s ease-out infinite; }
  @keyframes pz { 0% { opacity: 0; transform: translate(0, 0); } 30% { opacity: .9; } 100% { opacity: 0; transform: translate(10px, -18px); } }
  .pixi-say { position: fixed; left: 0; top: 0; z-index: 61; max-width: min(250px, calc(100vw - 32px)); padding: 10px 13px; border-radius: 16px;
    background: color-mix(in srgb, var(--bg) 80%, transparent); color: var(--ink); border: 1px solid var(--line);
    backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%);
    box-shadow: 0 16px 40px -18px rgba(0,0,0,.45); font-size: .86rem; line-height: 1.4; letter-spacing: .005em; pointer-events: auto; cursor: pointer;
    opacity: 0; visibility: hidden; }
  .pixi-say::before, .pixi-say::after { content: ""; position: absolute; border-radius: 50%; background: inherit; border: 1px solid var(--line); }
  .pixi-say::before { width: 9px; height: 9px; bottom: -13px; }
  .pixi-say::after { width: 5px; height: 5px; bottom: -21px; }
  .pixi-say[data-side="r"]::before { right: 18px; } .pixi-say[data-side="r"]::after { right: 14px; }
  .pixi-say[data-side="l"]::before { left: 18px; } .pixi-say[data-side="l"]::after { left: 14px; }
  .pixi-say .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @media (prefers-reduced-transparency: reduce) { .pixi-say { background: var(--bg); backdrop-filter: none; -webkit-backdrop-filter: none; } }
  @media (prefers-reduced-motion: reduce) { .pixi-z.on { animation: none; opacity: .8; } }
  @media print { .pixi, .pixi-say, .pixi-z { display: none; } }`;
  document.head.appendChild(css);

  const el = document.createElement('button');
  el.className = 'pixi'; el.type = 'button';
  el.setAttribute('aria-label', 'Pixi, the little voice in my head. Tap for a thought.');
  el.innerHTML = `<canvas width="${W * 2}" height="${H * 2}" aria-hidden="true"></canvas>`;
  const bub = document.createElement('div'); bub.className = 'pixi-say'; bub.setAttribute('role', 'status');
  bub.innerHTML = '<span class="sr"></span><span aria-hidden="true" class="t"></span>';
  const zz = document.createElement('span'); zz.className = 'pixi-z'; zz.setAttribute('aria-hidden', 'true'); zz.textContent = 'z';
  document.body.append(zz, bub, el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'); c.scale(2, 2);
  // the face is drawn into a tiny offscreen buffer, then shown as dots: each cell lights in proportion to how much eye covers it
  const off = document.createElement('canvas'); off.width = W; off.height = H; const o = off.getContext('2d', { willReadFrequently: true });
  const inBody = (i, j) => { const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL, rr = 12, qx = Math.max(rr - x, x - (W - rr), 0), qy = Math.max(rr - y, y - (H - rr), 0); return qx * qx + qy * qy <= rr * rr; };

  /* ---------- state ---------- */
  const floorTop = () => innerHeight - PAD - H - (parseFloat(getComputedStyle(root).getPropertyValue('--sab')) || 0);
  let side = store.get('br-pixi-side') === 'l' ? 'l' : 'r';
  const home = () => side === 'l' ? PAD : innerWidth - PAD - W;
  let tucked = store.get('br-pixi') === 'tucked';
  const X = new Spring(home(), { damping: 1, response: 0.5 }), Y = new Spring(0), R = new Spring(0, { damping: 0.7, response: 0.3 });
  const lx = new Spring(0, { damping: 0.85, response: 0.3 }), ly = new Spring(0, { damping: 0.85, response: 0.3 });
  const open = new Spring(1, { damping: 1, response: 0.09 }), lid = new Spring(0, { damping: 1, response: 0.25 }), tall = new Spring(1, { damping: 0.6, response: 0.3 });
  let sawRefill = false, anchor = null, roamAt = 0, mood = 'default', floor = 0, dragging = false, asleep = false, dizzyUntil = 0, lastAct = performance.now(), hidden = false;
  Y.set(tucked ? -(H - 11) : 0);

  let K = {};
  const colors = () => { const s = getComputedStyle(root); K = { ink: s.getPropertyValue('--ink').trim() || '#0B0E13', line: s.getPropertyValue('--ink-3').trim() || '#636B78', red: s.getPropertyValue('--accent').trim() || '#D62F24' }; queue(); };

  /* ---------- draw ---------- */
  let dirty = false, typingOn = false;
  function queue() { if (!dirty) { dirty = true; requestAnimationFrame(paint); } }
  [X, Y, R, lx, ly, open, lid, tall].forEach(s => s.on(queue));
  colors(); addEventListener('br-theme', () => requestAnimationFrame(colors));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', colors);
  const rr = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); o.beginPath(); o.roundRect ? o.roundRect(x, y, w, h, r) : o.rect(x, y, w, h); o.fill(); };
  function paint(now) {
    dirty = false;
    const t = now / 1000, dz = performance.now() < dizzyUntil, walking = !dragging && Math.abs(X.v) > 30;
    const bob = walking && !reduce() ? -Math.abs(Math.sin(t * 9.6)) * 3 : 0;            // little steps, 96 BPM x 3
    const tx = X.x, ty = floorTop() - floor - Y.x + bob;
    el.style.transform = `translate(${tx}px, ${ty}px) rotate(${R.x}deg)`;
    zz.style.transform = `translate(${tx + W - 6}px, ${ty - 6}px)`;
    placeBubble(tx, ty);

    o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H);
    const ew = 14, eh = 18, gap = 10, op = asleep ? 0.1 : clamp(open.x, 0.08, 1.2);
    [-1, 1].forEach(sd => {
      let ox = lx.x * 7, oy = ly.x * 4;
      if (dz) { ox += Math.cos(t * 14 + (sd > 0 ? 3.1 : 0)) * 3; oy += Math.sin(t * 14 + (sd > 0 ? 3.1 : 0)) * 2.4; }
      const grow = 1 + 0.18 * Math.max(0, sd * lx.x);                                  // curiosity: the eye on the look side grows
      const w = ew * (mood === 'surprised' ? 0.85 : 1), h = Math.max(2.5, eh * grow * op * tall.x);
      const x = W / 2 + sd * (gap / 2 + ew / 2) + ox - w / 2, y = H / 2 + oy - h / 2;
      o.globalCompositeOperation = 'source-over'; o.fillStyle = '#000'; rr(x, y, w, h, 5);
      const L = lid.x; o.globalCompositeOperation = 'destination-out';
      if (L > 0.01 && !asleep) {
        if (mood === 'happy') rr(x - 2, y + h * (1 - 0.45 * L), w + 4, h, 5);
        if (mood === 'tired' || mood === 'angry') {
          const outer = mood === 'tired' ? sd === -1 : sd === 1;
          o.beginPath(); o.moveTo(x - 1, y - 1); o.lineTo(x + w + 1, y - 1);
          o.lineTo(outer ? x - 1 : x + w + 1, y + h * 0.6 * L); o.closePath(); o.fill();
        }
      }
    });
    // show it as dots: unlit cells trace the body faintly, lit cells grow with coverage (anti-aliased, so motion stays smooth)
    const px = o.getImageData(0, 0, W, H).data; c.clearRect(0, 0, W, H);
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      let a = 0; for (let v = 0; v < CELL; v++) for (let u = 0; u < CELL; u++) a += px[((j * CELL + v) * W + i * CELL + u) * 4 + 3];
      a /= CELL * CELL * 255; const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
      if (a > 0.06) { c.globalAlpha = 1; c.fillStyle = K.ink; c.beginPath(); c.arc(cx, cy, 0.7 + 1.05 * a, 0, 6.283); c.fill(); }
      else if (inBody(i, j)) { c.globalAlpha = 0.45; c.fillStyle = K.line; c.beginPath(); c.arc(cx, cy, 0.65, 0, 6.283); c.fill(); }
    }
    c.globalAlpha = 1;
    // tiny routine props, in the same dots
    const prop = asleep || tucked ? '' : slot().prop;
    if (prop === 'lamp') {                                                              // a red headlamp, like at the telescope
      const cx = W / 2, cy = CELL / 2; c.fillStyle = K.red; c.globalAlpha = 0.25; c.beginPath(); c.arc(cx, cy, 3.4, 0, 6.283); c.fill();
      c.globalAlpha = 1; c.beginPath(); c.arc(cx, cy, 1.6, 0, 6.283); c.fill();
    }
    if (prop === 'type' && bub.style.visibility !== 'visible' && !anchor) {             // typing dots: busy at work
      const k = Math.floor(t * 3.2) % 4;                                                 // steps on the half beat of 96 BPM
      for (let i = 0; i < 3; i++) { c.globalAlpha = i === k ? 1 : 0.35; c.fillStyle = K.ink; c.beginPath(); c.arc(W / 2 + (i - 1) * CELL * 1.5, H - CELL * 1.5, 1.3, 0, 6.283); c.fill(); }
      c.globalAlpha = 1; typingOn = true;
    } else typingOn = false;
    if (dz || walking || typingOn) queue();
  }

  /* ---------- thoughts ---------- */
  let typing = 0, hideT = 0, saidAt = 0, unsolicited = 0, deck = [];
  const sayOn = new Spring(0, { damping: 1, response: 0.28 }).on(v => { bub.style.opacity = v; bub.style.visibility = v > 0.01 ? 'visible' : 'hidden'; queue(); });
  function placeBubble(tx, ty) {
    if (bub.style.visibility !== 'visible') return;
    const r = tx + W / 2 > innerWidth / 2, bw = bub.offsetWidth, bh = bub.offsetHeight, s = 0.92 + 0.08 * sayOn.x;
    bub.dataset.side = r ? 'r' : 'l';
    const bx = clamp(r ? tx + W - bw : tx, 12, innerWidth - bw - 12), by = ty - bh - 26 + (1 - sayOn.x) * 8;
    bub.style.transformOrigin = r ? '100% 100%' : '0 100%';
    bub.style.transform = `translate(${bx}px, ${by}px) scale(${s})`;
  }
  function chirp(n = 2) {
    if (!BR.sound.on) return; const a = BR.ac(); if (!a) return;
    for (let i = 0; i < n; i++) {
      const t0 = a.currentTime + i * 0.07, o = a.createOscillator(), g = a.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(900 + i * 260 + Math.random() * 120, t0); o.frequency.exponentialRampToValueAtTime(1400 + i * 300, t0 + 0.05);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 0.1);
    }
  }
  function say(text, opts = {}) {
    if (hidden || tucked) return false;
    clearInterval(typing); clearTimeout(hideT);
    bub.querySelector('.sr').textContent = text;
    const tEl = bub.querySelector('.t'); tEl.textContent = '';
    bub.style.visibility = 'visible'; tEl.textContent = text; placeBubble(X.x, floorTop() - floor - Y.x); // measure at full size first
    if (!reduce()) { tEl.textContent = ''; let i = 0; typing = setInterval(() => { tEl.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typing); }, 24); }
    sayOn.to(1); saidAt = performance.now(); chirp(); if (opts.mood) feel(opts.mood, 2600);
    hideT = setTimeout(hush, 2600 + text.length * 45);
    return true;
  }
  function hush() { clearInterval(typing); clearTimeout(hideT); sayOn.to(0); }
  function next() { if (!deck.length) deck = pool().sort(() => Math.random() - 0.5); return deck.pop(); }
  function muse(text) {                                                                // unsolicited: rare, never twice in 30 s
    if (dragging || asleep || performance.now() - saidAt < 30000 || unsolicited >= 6) return;
    if (document.querySelector('.m-toast.in, .vinyl, .refill')) return;
    if (say(text || next())) unsolicited++;
  }
  bub.addEventListener('click', hush);

  /* ---------- feelings ---------- */
  let moodT = 0;
  function feel(m, ms = 2000) {
    clearTimeout(moodT); mood = m;
    if (m === 'surprised') { tall.to(1.25, { velocity: 6 }); lid.to(0); } else { tall.to(1); lid.to(m === 'default' ? 0 : 1); }
    queue(); if (ms) moodT = setTimeout(() => feel(baseMood(), 0), ms);
  }
  const baseMood = () => { const s = slot(); return s.mood && !(s.decaf && caffeinated) ? s.mood : 'default'; };
  function blink(twice) { if (asleep) return; open.to(0, { then: () => open.to(1, { then: () => twice && setTimeout(() => blink(false), 120) }) }); }
  function sleep() { if (asleep || dragging || tucked) return; asleep = true; hush(); zz.classList.add('on'); lx.to(0); ly.to(0.4); queue(); }
  function wake(quiet) {
    if (!asleep) return; asleep = false; zz.classList.remove('on'); feel('surprised', 700); blink(true);
    if (!quiet && Math.random() < 0.5) setTimeout(() => say(SAY.wake), 500);
  }

  /* ---------- looking ---------- */
  let px = null, py = null, pointerAt = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; pointerAt = performance.now(); activity();
    if (dragging || asleep) return;
    const cx = X.x + W / 2, cy = floorTop() - floor - Y.x + H / 2;
    lx.to(clamp((px - cx) / (innerWidth * 0.35), -1, 1)); ly.to(clamp((py - cy) / (innerHeight * 0.45), -1, 1));
  }, { passive: true });
  function lookAround() { const a = Math.random() * 6.283; lx.to(Math.cos(a) * 0.9); ly.to(Math.sin(a) * 0.7 - 0.2); setTimeout(() => { lx.to(0); ly.to(0); }, 900 + Math.random() * 900); }

  /* ---------- moving ---------- */
  const maxX = () => innerWidth - PAD - W;
  function walkTo(x) {
    if (anchor) return shuffle();
    x = clamp(x, PAD, maxX()); const d = Math.abs(x - X.x); if (d < 4) return;
    lx.to(Math.sign(x - X.x) * 0.9); ly.to(0);
    X.to(x, { damping: 1, response: clamp(d / 420, 0.45, 1.6), then: () => { lx.to(0); tilt(0); } });
    queue();
  }
  function tilt(v) { R.to(clamp(-v / 120, -10, 10)); }
  X.on(() => { if (!dragging) R.to(clamp(-X.v / 140, -8, 8)); });                       // lean into the walk: the motion hints the direction
  function hop(h = 14) { if (reduce()) return; Y.to(Y.target, { velocity: h * 12, damping: 0.55, response: 0.32 }); }
  function wander() { const span = Math.min(260, innerWidth * 0.3); walkTo(X.x + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * span)); }

  // perch on top of cards that sit at the bottom of the screen (playlist, notifications)
  function perch() {
    const away0 = document.body.classList.contains('menu-open') || !!document.querySelector('.intro, .wa.live, .refill');
    if (anchor) { if (away0 && !hidden) { hidden = true; el.classList.add('away'); hush(); } else if (!away0 && hidden) { hidden = false; el.classList.remove('away'); } return follow(); }
    let f = 0; const L = X.x, Rx = X.x + W;
    document.querySelectorAll('.vinyl, .m-toast.in').forEach(n => { const r = n.getBoundingClientRect(); if (r.height && r.left < Rx && r.right > L && r.bottom > innerHeight - 40) f = Math.max(f, innerHeight - r.top - PAD + 6); });
    if (Math.abs(f - floor) > 1) { const from = floor; floor = f; Y.set(Y.x + (from - f)); Y.to(tucked ? Y.target : 0, { damping: 0.7, response: 0.4 }); }
    const away = document.body.classList.contains('menu-open') || !!document.querySelector('.intro, .wa.live, .refill');
    const refill = !!document.querySelector('.refill');
    if (refill && !sawRefill) sawRefill = true;
    else if (!refill && sawRefill) { sawRefill = false; const was = !caffeinated; caffeinated = true; setTimeout(() => { feel('happy', 1600); hop(16); say(was && slot().decaf ? 'Ahh. Personality loaded. 100%.' : 'Ahh. Better.'); }, 500); }
    if (away !== hidden) { hidden = away; el.classList.toggle('away', away); if (away) hush(); }
  }
  setInterval(perch, 400);

  /* ---------- roaming: hop onto things on the page, stay glued while you scroll ---------- */
  const SPOTS = 'h1, h2, .h2, .h3, .btn, .chip, figure img, .frame, canvas, .clip, .card, .sig-xl';
  const kind = n => n.matches('img, .frame, figure img, .clip') ? 'img' : n.matches('canvas') ? 'canvas' : n.matches('.btn') ? 'btn' : n.matches('.chip') ? 'chip' : 'head';
  const sitTop = r => r.top - H + 3;                                                   // eyes peek just over the top edge
  const usable = n => { if (n.closest('.pixi, .nav, .mmenu, .wa, .vinyl, .m-toast, .intro')) return false; const r = n.getBoundingClientRect(); return r.width >= 40 && r.height >= 14 && r.top > 110 && r.top < innerHeight - H - 90 && r.left > -10 && r.right < innerWidth + 10 && getComputedStyle(n).visibility !== 'hidden'; };
  function visit(n, why) {
    if (!n || dragging || tucked || hidden || asleep || reduce() || !usable(n)) return false;
    const r = n.getBoundingClientRect(), slot = clamp(r.left + Math.random() * Math.max(0, Math.min(r.width, 400) - W), PAD, maxX());
    hush(); anchor = null; roamAt = performance.now();
    const ty = floorTop() - floor - sitTop(r), dist = Math.hypot(slot - X.x, ty - Y.x);
    lx.to(clamp((slot - X.x) / 300, -1, 1)); ly.to(-0.6); feel('surprised', 500);
    const resp = clamp(dist / 900, 0.4, 0.9);
    X.to(slot, { damping: 1, response: resp });
    Y.to(ty, { velocity: Math.min(900, 300 + dist), damping: 0.72, response: resp, then: () => land(n, slot - r.left, why) });   // a hop: launch up, settle on the edge
    chirp(1); return true;
  }
  function land(n, dx, why) {
    if (dragging || !n.isConnected) return;
    anchor = { n, dx: new Spring(dx, { damping: 1, response: 0.9 }).on(queue) };
    const k = kind(n); lx.to(0); ly.to(k === 'head' ? 0.2 : 0.9);                        // look down at what it's sitting on
    if (k === 'chip' || k === 'btn') nudge(n);
    feel(k === 'btn' ? 'default' : 'happy', 1400);
    if (why === 'follow' || Math.random() < 0.35) setTimeout(() => anchor && anchor.n === n && muse(AT[k][Math.floor(Math.random() * AT[k].length)]), 700);
  }
  function nudge(n) { try { n.animate([{ translate: '0 0' }, { translate: '0 2px' }, { translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' }); } catch (e) {} }
  function follow() {                                                                   // content and Pixi move together, 1:1
    if (!anchor || dragging) return;
    const n = anchor.n, r = n.getBoundingClientRect();
    if (!n.isConnected || r.top < 70 || sitTop(r) > floorTop() - floor || r.right < 0 || r.left > innerWidth) return drop();
    X.set(clamp(r.left + anchor.dx.x, 4, innerWidth - W - 4)); Y.set(floorTop() - floor - sitTop(r));
  }
  function drop() {
    if (!anchor) return; anchor = null; X.stop(); hush(); feel('surprised', 600); ly.to(0.6);
    Y.to(0, { damping: 0.5, response: 0.45, then: () => { ly.to(0); setTimeout(() => !anchor && walkTo(home()), 800); } });   // falls back to the floor with a bounce
  }
  function shuffle() {                                                                  // walk along the top of whatever it's sitting on
    if (!anchor) return; const r = anchor.n.getBoundingClientRect(), span = Math.min(r.width, 400) - W;
    if (span < 20) return; const to = Math.random() * span; lx.to(Math.sign(to - anchor.dx.x) * 0.9);
    anchor.dx.to(to, { then: () => lx.to(0) });
  }
  addEventListener('scroll', follow, { passive: true });
  const roamPick = () => { const all = [...document.querySelectorAll(SPOTS)].filter(n => usable(n) && (!anchor || n !== anchor.n)); return all[Math.floor(Math.random() * all.length)]; };
  function roam() {
    const all = [...document.querySelectorAll(SPOTS)].filter(usable);
    if (all.length) visit(all[Math.floor(Math.random() * all.length)], 'roam');
  }
  // tag along: linger on something and Pixi may come over to see what you're looking at
  let dwellT = 0;
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return; clearTimeout(dwellT);
    const n = e.target.closest && e.target.closest(SPOTS); if (!n || (anchor && anchor.n === n)) return;
    dwellT = setTimeout(() => { if (performance.now() - roamAt > 20000 && Math.random() < 0.45) visit(n, 'follow'); }, 1400);
  });

  /* ---------- touch: tap, drag, throw, tuck ---------- */
  const tx = BR.tracker(), ty = BR.tracker(); let g = null, pokes = [];
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId); activity(); anchor = null;
    g = { x0: e.clientX, y0: e.clientY, dx: e.clientX - X.x, dy: e.clientY - (floorTop() - floor - Y.x), moved: false };
    tx.reset(); ty.reset(); X.stop(); Y.stop();
    open.to(0.8); tall.to(0.92);                                                         // squish on press: instant feedback
  });
  el.addEventListener('pointermove', e => {
    if (!g) return;
    if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 8) return;
    if (!g.moved) { g.moved = dragging = true; hush(); wake(true); feel('surprised', 0); if (tucked) { tucked = false; store.set('br-pixi', ''); } }
    let nx = e.clientX - g.dx; const lo = 4, hi = innerWidth - W - 4;
    if (nx < lo) nx = lo + rubber(nx - lo, innerWidth); if (nx > hi) nx = hi + rubber(nx - hi, innerWidth);
    let top = e.clientY - g.dy, h = floorTop() - floor - top;
    if (top < 4) h = floorTop() - floor - 4 - rubber(top - 4, innerHeight);
    X.set(nx); Y.set(h); tx.add(nx); ty.add(-h);
    R.to(clamp(tx.vel() / 90, -18, 18));
  });
  const up = e => {
    if (!g) return; const moved = g.moved; g = null; dragging = false; open.to(1);
    if (!moved) { tall.to(1); return tap(); }
    const vx = tx.vel(), vy = ty.vel(), speed = Math.hypot(vx, vy);
    if (Y.x < -18 || (vy > 900 && Y.x < 40)) return tuck(vy);
    const land = clamp(X.x + project(vx, 0.995), PAD, maxX());
    X.to(land, { velocity: vx, damping: 1, response: 0.55, then: () => tilt(0) });
    Y.to(0, { velocity: -vy, damping: 0.5, response: 0.45 });                         // thrown: momentum earns a bounce
    side = land + W / 2 > innerWidth / 2 ? 'r' : 'l'; store.set('br-pixi-side', side);
    if (speed > 2200) { dizzyUntil = performance.now() + 1600; queue(); setTimeout(() => say(SAY.thrown, { mood: 'happy' }), 1300); feel('default', 0); }
    else feel('happy', 900);
    chirp(1);
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });

  function tap() {
    if (tucked) { untuck(); return; }
    if (asleep) { wake(true); setTimeout(() => say(SAY.wake), 400); return; }
    const now = performance.now(); pokes = pokes.filter(t => now - t < 2500); pokes.push(now);
    if (pokes.length >= 5) { pokes = []; hop(8); return say(SAY.poke, { mood: 'angry' }); }
    if (bub.style.visibility === 'visible' && now - saidAt < 600) return;
    hop(); feel('happy', 1400); say(next());
  }
  function tuck(vy = 0) {
    tucked = true; store.set('br-pixi', 'tucked'); hush(); asleep = false; zz.classList.remove('on');
    Y.to(-(H - 11), { velocity: -vy, damping: 0.8, response: 0.4 }); R.to(0); feel('tired', 0); lx.to(0); ly.to(-1);
  }
  function untuck() {
    tucked = false; store.set('br-pixi', ''); feel('surprised', 600);
    Y.to(0, { velocity: 260, damping: 0.6, response: 0.4 }); setTimeout(() => say(SAY.untuck, { mood: 'happy' }), 450);
  }

  /* ---------- the world around it ---------- */
  function activity() { lastAct = performance.now(); if (asleep) wake(); }
  ['keydown', 'touchstart', 'wheel'].forEach(t => addEventListener(t, activity, { passive: true }));
  let ly0 = scrollY, lt0 = performance.now(), fastSaid = false, fastN = 0;
  addEventListener('scroll', () => {
    const now = performance.now(), v = (scrollY - ly0) / Math.max(1, now - lt0) * 1000; ly0 = scrollY; lt0 = now; activity();
    if (!dragging && !asleep && !tucked) ly.to(clamp(v / 3000, -1, 1));
    fastN = Math.abs(v) > 4500 ? fastN + 1 : 0;                                       // a real fling, not a jump to an anchor
    if (fastN >= 4 && !fastSaid && !tucked) { fastSaid = true; dizzyUntil = now + 1200; queue(); setTimeout(() => say(SAY.fast, { mood: 'surprised' }), 600); }
  }, { passive: true });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-copy]')) setTimeout(() => say(SAY.copy, { mood: 'happy' }), 500);
    if (e.target.closest('[data-theme-toggle]')) setTimeout(() => {
      const dark = root.dataset.theme === 'dark'; feel(dark ? 'happy' : 'tired', 1600); if (!dark) { open.to(0.35, { then: () => setTimeout(() => open.to(1), 500) }); }
      say(dark ? SAY.dark : SAY.light);
    }, 200);
  });
  let leftAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { leftAt = Date.now(); return; }
    if (leftAt && Date.now() - leftAt > 20000 && !tucked) { wake(true); hop(); setTimeout(() => say(SAY.back, { mood: 'happy' }), 400); }
  });
  addEventListener('resize', () => { X.set(clamp(X.x, PAD, maxX())); queue(); });

  /* ---------- a life of its own ---------- */
  (function blinks() { setTimeout(() => { if (!document.hidden) blink(Math.random() < 0.2); blinks(); }, 2200 + Math.random() * 3800); })();
  (function idle() {
    setTimeout(() => {
      idle();
      if (document.hidden || dragging || tucked || hidden) return;
      const quiet = performance.now() - lastAct;
      if (quiet > (slot().sleepy ? 20000 : 45000)) return sleep();
      if (asleep) return;
      if (performance.now() - pointerAt < 2500) return;                               // you're moving; it's watching you
      const r = Math.random();
      if (anchor) { if (r < 0.3) shuffle(); else if (r < 0.5) { drop(); } else if (r < 0.62) visit(roamPick(), 'roam') || lookAround(); else if (r < 0.8) lookAround(); else muse(); return; }
      if (r < 0.14 && performance.now() - roamAt > 15000) { roam(); return; }
      if (r < 0.32) lookAround();
      else if (r < 0.52 && !reduce()) wander();
      else if (r < 0.62) hop(10);
      else if (r < 0.72) { feel(Math.random() < 0.5 ? 'happy' : 'tired', 1800); lookAround(); }
      else if (r < 0.80) muse();
    }, 5000 + Math.random() * 7000);
  })();

  // first thought on this page: once per visit, after the page has settled
  setTimeout(() => {
    let seen = ''; try { seen = sessionStorage.getItem('br-pixi-' + page) || ''; } catch (e) {}
    if (seen) return;
    const M = BR.moments || new Set();
    const R = slot().say, first = M.has('birthday') ? SAY.birthday : page === 'index' && R ? R[0] : pool()[0];
    if (say(first, { mood: M.has('latenight') ? 'tired' : 'happy' })) { hop(10); try { sessionStorage.setItem('br-pixi-' + page, '1'); } catch (e) {} }
  }, 7000);

  feel(baseMood(), 0); queue();
  setInterval(() => { if (mood === 'default' || mood === 'tired') feel(baseMood(), 0); queue(); }, 60000);
  window.__pixi = { roam, visit, drop, say };                                        // handy from the console
})();
