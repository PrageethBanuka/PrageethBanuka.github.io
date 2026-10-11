/* Pixi: the little voice in my head, living in the corner of the site.
   Built from RoboEyes: two rounded rectangles, a lot of feelings.
   Looks at your pointer, blinks, wanders, naps, thinks out loud (rarely), and can be picked up and thrown.
   Drag it down off the screen to tuck it away; tap the peeking eyes to bring it back. */
(function () {
  const BR = window.BR; if (!BR || window.__pixi) return; window.__pixi = true;
  const { Spring, project, rubber, clamp, reduce, store } = BR;
  const root = document.documentElement, page = (location.pathname.match(/(\w+)\.html$/) || [, 'index'])[1];
  const W = 60, H = 40, PAD = 16, CELL = 4, COLS = W / CELL, ROWS = H / CELL;   // a 15 x 10 dot matrix
  // embedded on someone else's site (via pixi-embed.js): no routine, no portrait, their own lines
  const CFG = window.pixiConfig || {}, EMBED = !!CFG.embed;
  const GENERIC = ['Hi. I live here now.', 'Drag me around. I don’t bite. I don’t even have a mouth.', 'Two rectangles. That’s all a face needs.',
    'Is it a bug or a feature?', 'Throw me. Go on.', 'Type “seek”. I’m very good at hiding.', 'I’m made of dots. Mostly.', 'Double-tap me. Trust me.'];

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
  const slot = () => { if (EMBED) return {}; const { h, wk } = clock(); return ROUTINE.find(s => h >= s.from && h < s.to && !(s.weekday && wk) && !(s.weekend && !wk)) || {}; };
  let caffeinated = false;
  const pool = () => { if (EMBED) return [...(CFG.lines && CFG.lines.length ? CFG.lines : GENERIC)];
    const p = PAGE[page], R = slot().say || []; return [...(typeof p === 'function' ? p() : p || []), ...LINES, ...R, ...R]; };   // what I'm doing right now comes up twice as often

  /* ---------- markup + style ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .pixi { position: fixed; left: 0; top: 0; z-index: 60; transform-origin: 50% 100%; width: ${W}px; height: ${H}px; padding: 0; border: 0; background: none; cursor: grab;
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
  .pixi-fx { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 59; pointer-events: none; }
  .pixi-shadow { position: fixed; left: 0; top: 0; z-index: 58; width: ${W * 0.8}px; height: 8px; border-radius: 50%; pointer-events: none;
    background: radial-gradient(closest-side, rgba(0,0,0,.22), transparent); transform-origin: 50% 50%; opacity: 0; }
  ${EMBED ? '' : '.dot { display: inline-block; }'}
  @media print { .pixi, .pixi-say, .pixi-z, .pixi-fx, .pixi-shadow { display: none; } }`;
  document.head.appendChild(css);

  const el = document.createElement('button');
  el.className = 'pixi'; el.type = 'button';
  el.setAttribute('aria-label', EMBED ? `${CFG.name || 'Pixi'}, a little dot companion. Tap for a thought.` : 'Pixi, the little voice in my head. Tap for a thought.');
  el.innerHTML = `<canvas width="${W * 2}" height="${H * 2}" aria-hidden="true"></canvas>`;
  const bub = document.createElement('div'); bub.className = 'pixi-say'; bub.setAttribute('role', 'status');
  bub.innerHTML = '<span class="sr"></span><span aria-hidden="true" class="t"></span>';
  const zz = document.createElement('span'); zz.className = 'pixi-z'; zz.setAttribute('aria-hidden', 'true'); zz.textContent = 'z';
  const fx = document.createElement('canvas'); fx.className = 'pixi-fx'; fx.setAttribute('aria-hidden', 'true');
  const shadow = document.createElement('span'); shadow.className = 'pixi-shadow'; shadow.setAttribute('aria-hidden', 'true');
  document.body.append(fx, shadow, zz, bub, el);
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
  const B = new Spring(0, { damping: 0.45, response: 0.22 }), Q = new Spring(0, { damping: 0.5, response: 0.24 });
  let run = null, tiredAt = -Infinity, overWave = false, dancing = null, sawRefill = false, jittery = false, anchor = null, roamAt = 0, mood = 'default', floor = 0, dragging = false, asleep = false, dizzyUntil = 0, lastAct = performance.now(), hidden = false;
  Y.set(tucked ? -(H - 11) : 0);

  let K = {};
  const colors = () => { const s = getComputedStyle(root); K = { ink: s.getPropertyValue('--ink').trim() || '#0B0E13', line: s.getPropertyValue('--ink-3').trim() || '#636B78', red: s.getPropertyValue('--accent').trim() || '#D62F24', scr: s.getPropertyValue('--screen-ink').trim() || '#E8EAE6' }; queue(); };

  /* ---------- draw ---------- */
  let tx_ = { vel: () => 0 }, ty_ = { vel: () => 0 }, dirty = false, typingOn = false, cells = [], ghostN = 0, hang = null, hiddenFx = false;
  function queue() { if (!dirty) { dirty = true; requestAnimationFrame(paint); } }
  [X, Y, R, lx, ly, open, lid, tall, B, Q].forEach(s => s.on(queue));
  colors(); addEventListener('br-theme', () => requestAnimationFrame(colors));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', colors);
  const heart = (cx, cy, s) => { const k = s / 2; o.beginPath(); o.moveTo(cx, cy + k * 0.95);
    o.bezierCurveTo(cx - k * 1.7, cy - k * 0.15, cx - k * 0.7, cy - k * 1.45, cx, cy - k * 0.45);
    o.bezierCurveTo(cx + k * 0.7, cy - k * 1.45, cx + k * 1.7, cy - k * 0.15, cx, cy + k * 0.95); o.fill(); };
  const rr = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); o.beginPath(); o.roundRect ? o.roundRect(x, y, w, h, r) : o.rect(x, y, w, h); o.fill(); };
  function paint(now) {
    dirty = false;
    const t = now / 1000, dz = performance.now() < dizzyUntil, walking = !dragging && Math.abs(X.v) > 30;
    const bob = walking && !reduce() ? -Math.abs(Math.sin(t * 9.6)) * 3 : 0;            // little steps, 96 BPM x 3
    const tx = X.x, ty = floorTop() - floor - Y.x + bob - B.x, sq = clamp(Q.x, -1, 1);
    if (hang) el.style.transform = `translate(${hang.x}px, ${hang.top}px) rotate(${hang.th * 57.3}deg) translateY(${H}px) scale(1, -1)`;   // upside down, swinging from the nav
    else el.style.transform = `translate(${tx}px, ${ty}px) rotate(${R.x}deg) scale(${1 + sq * 0.12}, ${1 - sq * 0.16})`;
    // a soft contact shadow that shrinks as it leaves the ground
    if (!anchor && !run && !hang && !tucked && !hidden && !hiddenFx) {
      const lift = Math.max(0, Y.x + B.x - bob), k = 1 / (1 + lift / 70);
      shadow.style.opacity = (0.9 * k).toFixed(3); shadow.style.transform = `translate(${tx + W * 0.1}px, ${floorTop() - floor + H - 4}px) scale(${k}, ${0.6 + 0.4 * k})`;
    } else shadow.style.opacity = 0;
    zz.style.transform = `translate(${tx + W - 6}px, ${ty - 6}px)`;
    if (hang) placeBubble(hang.x, hang.top + H + bub.offsetHeight + 40); else placeBubble(tx, ty);

    o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H);
    const ew = 14, eh = 18, gap = 10, op = asleep ? 0.1 : clamp(open.x, 0.08, 1.2);
    [-1, 1].forEach(sd => {
      let ox = lx.x * 7, oy = ly.x * 4;
      if (dz) { ox += Math.cos(t * 14 + (sd > 0 ? 3.1 : 0)) * 3; oy += Math.sin(t * 14 + (sd > 0 ? 3.1 : 0)) * 2.4; }
      const grow = 1 + 0.18 * Math.max(0, sd * lx.x);                                  // curiosity: the eye on the look side grows
      const w = ew * (mood === 'surprised' ? 0.85 : 1), h = mood === 'wink' && sd < 0 ? 2.5 : Math.max(2.5, eh * grow * op * tall.x);
      const x = W / 2 + sd * (gap / 2 + ew / 2) + ox - w / 2, y = H / 2 + oy - h / 2;
      o.globalCompositeOperation = 'source-over'; o.fillStyle = '#000';
      if (mood === 'love' && !asleep) heart(x + w / 2, H / 2 + oy + 1, 21 * (1 + 0.08 * Math.sin(t * 10)) * clamp(op, 0.3, 1));   // a beating heart for each eye
      else rr(x, y, w, h, 5);
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
    const px = o.getImageData(0, 0, W, H).data; c.clearRect(0, 0, W, H); cells = [];
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      let a = 0; for (let v = 0; v < CELL; v++) for (let u = 0; u < CELL; u++) a += px[((j * CELL + v) * W + i * CELL + u) * 4 + 3];
      a /= CELL * CELL * 255; const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
      if (a > 0.06) { c.globalAlpha = 1; c.fillStyle = K.ink; c.beginPath(); c.arc(cx, cy, 0.7 + 1.05 * a, 0, 6.283); c.fill(); cells.push([cx, cy, a]); }
      else if (inBody(i, j)) { if ((i + j) % 3 === 0) cells.push([cx, cy, 0.2]); c.globalAlpha = 0.45; c.fillStyle = K.line; c.beginPath(); c.arc(cx, cy, 0.65, 0, 6.283); c.fill(); }
    }
    c.globalAlpha = 1;
    // tiny routine props, in the same dots
    const prop = asleep || tucked ? '' : slot().prop;
    if (prop === 'lamp') {                                                              // a red headlamp, like at the telescope
      const cx = W / 2, cy = CELL / 2; c.fillStyle = K.red; c.globalAlpha = 0.25; c.beginPath(); c.arc(cx, cy, 3.4, 0, 6.283); c.fill();
      c.globalAlpha = 1; c.beginPath(); c.arc(cx, cy, 1.6, 0, 6.283); c.fill();
    }
    const feet = (walking || run) && !asleep;
    if (feet) {                                                                        // two little feet, stepping
      const k = Math.sin(t * (run ? 10 + 12 * run.e : 9.6)) > 0;
      [[-1, k], [1, !k]].forEach(([sd, up]) => { c.fillStyle = K.ink; c.globalAlpha = up ? 0.55 : 1; c.beginPath(); c.arc(W / 2 + sd * CELL * 1.5, H - CELL * (up ? 1.25 : 0.6), 1.4, 0, 6.283); c.fill(); });
      c.globalAlpha = 1;
    }
    if (prop === 'type' && !feet && bub.style.visibility !== 'visible' && !anchor) {             // typing dots: busy at work
      const k = Math.floor(t * 3.2) % 4;                                                 // steps on the half beat of 96 BPM
      for (let i = 0; i < 3; i++) { c.globalAlpha = i === k ? 1 : 0.35; c.fillStyle = K.ink; c.beginPath(); c.arc(W / 2 + (i - 1) * CELL * 1.5, H - CELL * 1.5, 1.3, 0, 6.283); c.fill(); }
      c.globalAlpha = 1; typingOn = true;
    } else typingOn = false;
    // afterimages when it's moving fast: motion reads as speed, not as a jump
    const speed = dragging ? Math.hypot(tx_.vel(), ty_.vel()) : Math.hypot(X.v, Y.v);
    if (speed > 1100 && !reduce() && (ghostN++ & 1)) ghost();
    if (dz || walking || typingOn || run || hang || mood === 'love') queue();
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
  function sleep() { if (asleep || dragging || tucked || dancing || hang) return; asleep = true; hush(); zz.classList.add('on'); lx.to(0); ly.to(0.4); queue(); setTimeout(dream, 6000); }
  function wake(quiet) {
    if (!asleep) return; asleep = false; stopDream(); zz.classList.remove('on'); feel('surprised', 700); blink(true);
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
  X.on(() => { if (!dragging && !run) R.to(clamp(-X.v / 140, -8, 8)); });                       // lean into the walk: the motion hints the direction
  function hop(h = 14) { if (reduce()) return; Y.to(Y.target, { velocity: h * 12, damping: 0.55, response: 0.32 }); }
  function wander() { const span = Math.min(260, innerWidth * 0.3); walkTo(X.x + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * span)); }

  // perch on top of cards that sit at the bottom of the screen (playlist, notifications)
  function perch() {
    if (run || hang || hiddenFx) return;
    const away0 = document.body.classList.contains('menu-open') || !!document.querySelector('.intro, .wa.live, .refill');
    if (anchor) { if (away0 && !hidden) { hidden = true; el.classList.add('away'); hush(); } else if (!away0 && hidden) { hidden = false; el.classList.remove('away'); } return follow(); }
    let f = 0; const L = X.x, Rx = X.x + W;
    document.querySelectorAll('.vinyl, .m-toast.in').forEach(n => { const r = n.getBoundingClientRect(); if (r.height && r.left < Rx && r.right > L && r.bottom > innerHeight - 40) f = Math.max(f, innerHeight - r.top - PAD + 6); });
    if (Math.abs(f - floor) > 1) { const from = floor; floor = f; Y.set(Y.x + (from - f)); Y.to(tucked ? Y.target : 0, { damping: 0.7, response: 0.4 }); }
    const away = document.body.classList.contains('menu-open') || !!document.querySelector('.intro, .wa.live, .refill');
    const refill = !!document.querySelector('.refill');
    if (refill && !sawRefill) { sawRefill = true; jittery = !!document.querySelector('.refill.jitter'); }
    else if (!refill && sawRefill) { sawRefill = false; const was = !caffeinated; caffeinated = true; setTimeout(() => { if (jittery) { dizzyUntil = performance.now() + 2200; feel('surprised', 2200); queue(); return say('Too much coffee. I can hear colours.'); } feel('happy', 1600); hop(16); say(was && slot().decaf ? 'Ahh. Personality loaded. 100%.' : 'Ahh. Better.'); }, 500); }
    if (away !== hidden) { hidden = away; el.classList.toggle('away', away); if (away) hush(); }
  }
  setInterval(perch, 400);

  /* ---------- roaming: hop onto things on the page, stay glued while you scroll ---------- */
  const SPOTS = 'h1, h2, .h2, .h3, .btn, .chip, figure img, .frame, canvas, .clip, .card, .sig-xl';
  const kind = n => n.matches('img, .frame, figure img, .clip') ? 'img' : n.matches('canvas') ? 'canvas' : n.matches('.btn') ? 'btn' : n.matches('.chip') ? 'chip' : 'head';
  const sitTop = r => r.top - H + 3;                                                   // eyes peek just over the top edge
  const usable = n => { if (n.closest('.pixi, .nav, .mmenu, .wa, .vinyl, .m-toast, .intro')) return false; const r = n.getBoundingClientRect(); return r.width >= 40 && r.height >= 14 && r.top > 80 && r.top < innerHeight - H - 90 && r.left > -10 && r.right < innerWidth + 10 && getComputedStyle(n).visibility !== 'hidden'; };
  function visit(n, why, sx, oy) {                                                     // oy: where to stand, relative to the element's top (default: on its top edge)
    if (!n || dragging || tucked || hidden || asleep || hang || hiddenFx || reduce() || !usable(n)) return false;
    const r = n.getBoundingClientRect(), slot = clamp(sx ?? r.left + Math.random() * Math.max(0, Math.min(r.width, 400) - W), PAD, maxX());
    hush(); anchor = null; roamAt = performance.now();
    const ty = floorTop() - floor - (oy != null ? r.top + oy : sitTop(r)), dist = Math.hypot(slot - X.x, ty - Y.x);
    lx.to(clamp((slot - X.x) / 300, -1, 1)); ly.to(-0.6); feel('surprised', 500);
    const resp = clamp(dist / 900, 0.4, 0.9);
    X.to(slot, { damping: 1, response: resp });
    Y.to(ty, { velocity: Math.min(900, 300 + dist), damping: 0.72, response: resp, then: () => land(n, slot - r.left, why, oy) });   // a hop: launch up, settle on the edge
    chirp(1); return true;
  }
  function land(n, dx, why, oy) {
    if (dragging || !n.isConnected) return;
    anchor = { n, oy, dx: new Spring(dx, { damping: 1, response: 0.9 }).on(queue) };
    const k = kind(n); lx.to(0); ly.to(k === 'head' ? 0.2 : 0.9);                        // look down at what it's sitting on
    if (k === 'chip' || k === 'btn') nudge(n);
    feel(k === 'btn' ? 'default' : 'happy', 1400);
    if (why === 'eat') return chomp(n);
    if (why === 'press' && pressCb) { const f = pressCb; pressCb = null; ly.to(0.9); return void setTimeout(() => { squash(0.9); kick(0.35); nudge(n); chirp(1); f(n); }, 320); }
    if (why !== 'end' && (why === 'follow' || Math.random() < 0.35)) setTimeout(() => anchor && anchor.n === n && muse(AT[k][Math.floor(Math.random() * AT[k].length)]), 700);
  }
  function nudge(n) { try { n.animate([{ translate: '0 0' }, { translate: '0 2px' }, { translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' }); } catch (e) {} }
  function follow() {                                                                   // content and Pixi move together, 1:1
    if (!anchor || dragging) return;
    const n = anchor.n, r = n.getBoundingClientRect();
    const top = anchor.oy != null ? r.top + anchor.oy : sitTop(r);
    if (anchor.keep) { if (!n.isConnected) return seekEnd(false); X.set(r.left + anchor.dx.x); Y.set(floorTop() - floor - top); return; }   // hiding: stays put, even off-screen
    if (!n.isConnected || top < 70 || top > floorTop() - floor || r.right < 0 || r.left > innerWidth) return drop();
    X.set(clamp(r.left + anchor.dx.x, 4, innerWidth - W - 4)); Y.set(floorTop() - floor - top);
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
  const tx = BR.tracker(), ty = BR.tracker(); tx_ = tx; ty_ = ty; let g = null, pokes = [];
  el.addEventListener('pointerdown', e => {
    if (hang) hangEnd(true);
    el.setPointerCapture(e.pointerId); activity(); anchor = null;
    g = { x0: e.clientX, y0: e.clientY, dx: e.clientX - X.x, dy: e.clientY - (floorTop() - floor - Y.x), moved: false };
    tx.reset(); ty.reset(); X.stop(); Y.stop();
    open.to(0.8); tall.to(0.92);                                                         // squish on press: instant feedback
    const mine = g; g.hold = setTimeout(() => { if (g === mine && !g.moved) { g.long = true; feel('love', 2600); purr(); squash(0.4); quip('Hold me closer, tiny dancer.', null, 1, 'hold'); secret('hold'); } }, 550);
  });
  el.addEventListener('pointermove', e => {
    if (!g) return;
    if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 8) return;
    if (!g.moved) { clearTimeout(g.hold); if (g.long) return; g.moved = dragging = true; hush(); wake(true); feel('surprised', 0); if (tucked) { tucked = false; store.set('br-pixi', ''); } }
    let nx = e.clientX - g.dx; const lo = 4, hi = innerWidth - W - 4;
    if (nx < lo) nx = lo + rubber(nx - lo, innerWidth); if (nx > hi) nx = hi + rubber(nx - hi, innerWidth);
    let top = e.clientY - g.dy, h = floorTop() - floor - top;
    if (top < 4) h = floorTop() - floor - 4 - rubber(top - 4, innerHeight);
    X.set(nx); Y.set(h); tx.add(nx); ty.add(-h);
    if (BR.wave) {
      const wr = BR.wave.el.getBoundingClientRect(), inside = e.clientX > wr.left && e.clientX < wr.right && e.clientY > wr.top - 20 && e.clientY < wr.bottom;
      if (inside) { BR.wave.focus((e.clientX - wr.left) / wr.width); if (!overWave) { overWave = true; feel('happy', 0); ly.to(1); chirp(1); } }
      else if (overWave) { overWave = false; BR.wave.release(); feel('surprised', 0); }
    }
    R.to(clamp(tx.vel() / 90, -18, 18));
  });
  const up = e => {
    if (!g) return; const moved = g.moved, long = g.long; clearTimeout(g.hold); g = null; dragging = false; open.to(1);
    if (long) { tall.to(1); return; }
    if (!moved) { tall.to(1); return tap(); }
    const vx = tx.vel(), vy = ty.vel(), speed = Math.hypot(vx, vy);
    if (Y.x < -18 || (vy > 900 && Y.x < 40)) return tuck(vy);
    overWave = false;
    if (dropOn(e.clientX, e.clientY)) return;
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
    if (seek) return seekEnd(true);
    if (tucked) { untuck(); return; }
    if (asleep) { wake(true); setTimeout(() => say(SAY.wake), 400); return; }
    if (offerDraw) { hush(); return void drawPortrait(); }
    const now = performance.now();
    if (pokes.length && now - pokes[pokes.length - 1] < 320 && !reduce()) { pokes.push(now); hush(); return flip(); }   // double tap: backflip
    pokes = pokes.filter(t => now - t < 2500); pokes.push(now);
    if (pokes.length >= 5) { pokes = []; hop(8); return say(SAY.poke, { mood: 'angry' }); }
    if (bub.style.visibility === 'visible' && now - saidAt < 600) return;
    hop(); feel('happy', 1400); say(next());
  }
  function tuck(vy = 0) {
    tucked = true; store.set('br-pixi', 'tucked'); hush(); asleep = false; zz.classList.remove('on');
    Y.to(-(H - 11), { velocity: -vy, damping: 0.8, response: 0.4 }); R.to(0); feel('tired', 0); lx.to(0); ly.to(-1);
  }
  function untuck() {
    secret('tuck'); tucked = false; store.set('br-pixi', ''); feel('surprised', 600);
    Y.to(0, { velocity: 260, damping: 0.6, response: 0.4 }); setTimeout(() => say(SAY.untuck, { mood: 'happy' }), 450);
  }

  /* ---------- the world around it ---------- */
  function activity() { lastAct = performance.now(); if (asleep) wake(); }
  ['keydown', 'touchstart', 'wheel'].forEach(t => addEventListener(t, activity, { passive: true }));
  let ly0 = scrollY, lt0 = performance.now(), fastSaid = false, fastN = 0, handAt = 0;
  ['wheel', 'touchmove'].forEach(t => addEventListener(t, () => { handAt = performance.now(); }, { passive: true }));   // only a real fling counts, not a scripted scroll
  addEventListener('scroll', () => {
    const now = performance.now(), v = (scrollY - ly0) / Math.max(1, now - lt0) * 1000; ly0 = scrollY; lt0 = now; activity();
    if (!dragging && !asleep && !tucked) ly.to(clamp(v / 3000, -1, 1));
    fastN = Math.abs(v) > 4500 && now - handAt < 250 ? fastN + 1 : 0;                                       // a real fling, not a jump to an anchor
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


  /* ---------- micro-interactions ---------- */
  const kick = (b = 1) => { if (reduce()) return; B.to(0, { velocity: 140 * b }); Q.to(0, { velocity: -7 * b }); };   // impulses: out and back, from wherever it is now
  const squash = (b = 1) => { if (!reduce()) Q.to(0, { velocity: 9 * b }); };

  // dance: in sync with the drum machine on Off-hours
  let swing = 1;
  addEventListener('br-music', e => {
    if (e.detail.on) { dancing = e.detail.src; wake(true); hush(); feel('happy', 0); if (Math.random() < 0.5) setTimeout(() => say('Ooh. My song.'), 900); }
    else { dancing = null; R.to(0); lx.to(0); feel(baseMood(), 0); if (Math.random() < 0.4) say('Encore? No? Okay.'); }
  });
  addEventListener('br-beat', e => {
    if (dancing !== 'drums' || dragging || tucked) return;
    const { s, hits } = e.detail; activity();
    if (hits.includes('Kick')) { kick(1); }
    if (hits.includes('Snare')) { swing = -swing; R.to(9 * swing, { velocity: 120 * swing }); squash(0.6); }
    if (hits.includes('Hi-hat')) open.to(1, { velocity: -6 });
    if (hits.includes('Clarinet')) ly.to(-0.5, { velocity: -4 });
    if (s % 4 === 0) lx.to(s % 8 === 0 ? 0.7 : -0.7);
  });
  // groove: the Spotify card can't share its beat, so nod along at the site's 96 BPM
  setInterval(() => {
    const card = document.querySelector('.vinyl.playing, #studyMix.playing');
    const vis = card && (() => { const r = card.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })();
    if (vis && dancing !== 'drums') {
      if (!dancing) { dancing = 'groove'; feel('happy', 0); const r = card.getBoundingClientRect(); if (!anchor && card.classList.contains('vinyl')) walkTo(r.left + r.width / 2 - W / 2); }
      if (!dragging && !asleep && !tucked) { kick(0.45); swing = -swing; R.to(5 * swing); activity(); }
    } else if (dancing === 'groove') { dancing = null; R.to(0); feel(baseMood(), 0); }
  }, 625);

  // clicks: glance at the spot, sometimes blink in sympathy
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.pixi') || dragging || asleep) return;
    const cx = X.x + W / 2, cy = floorTop() - floor - Y.x + H / 2;
    lx.to(clamp((e.clientX - cx) / (innerWidth * 0.3), -1, 1), { velocity: 0 }); ly.to(clamp((e.clientY - cy) / (innerHeight * 0.4), -1, 1));
    if (Math.random() < 0.3) setTimeout(() => blink(), 120);
  }, { passive: true });

  // the pointer: lean in when it's near, flinch when it rushes in, purr when petted
  let lastPx = 0, lastPy = 0, lastPt = 0, flinchAt = 0, petT = 0, pettedAt = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || dragging || asleep || tucked) return;
    const t = performance.now(), dt = Math.max(1, t - lastPt), sp = Math.hypot(e.clientX - lastPx, e.clientY - lastPy) / dt * 1000;
    lastPx = e.clientX; lastPy = e.clientY; lastPt = t;
    const cx = X.x + W / 2, cy = floorTop() - floor - Y.x + H / 2, d = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (d < 110 && sp > 2600 && t - flinchAt > 3000) { flinchAt = t; feel('surprised', 600); squash(1); open.to(1.15, { velocity: 8 }); }
    else if (d < 140 && !anchor && !dancing) R.to(clamp((e.clientX - cx) / 20, -6, 6));                    // lean toward you
  }, { passive: true });
  el.addEventListener('pointerenter', e => {
    if (e.pointerType === 'touch') return; feel('happy', 0); clearTimeout(petT);
    petT = setTimeout(() => { if (performance.now() - pettedAt > 20000) { pettedAt = performance.now(); squash(0.5); purr(); say('Petting accepted.', { mood: 'happy' }); secret('pet'); } }, 1600);
  });
  el.addEventListener('pointerleave', () => { clearTimeout(petT); if (!dancing) { feel(baseMood(), 0); R.to(0); } });
  function purr() {
    if (!BR.sound.on) return; const a = BR.ac(); if (!a) return;
    const t0 = a.currentTime, o = a.createOscillator(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain();
    o.type = 'triangle'; o.frequency.value = 95; l.frequency.value = 24; lg.gain.value = 0.03; l.connect(lg).connect(g.gain);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.04, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    o.connect(g).connect(a.destination); o.start(t0); l.start(t0); o.stop(t0 + 0.75); l.stop(t0 + 0.75);
  }

  // selecting text: it reads along
  let selT = 0, selSaid = false;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selT);
    selT = setTimeout(() => {
      const sel = getSelection(); if (!sel || sel.isCollapsed || String(sel).trim().length < 12 || asleep || tucked) return;
      const r = sel.getRangeAt(0).getBoundingClientRect(), cx = X.x + W / 2, cy = floorTop() - floor - Y.x;
      lx.to(clamp((r.left + r.width / 2 - cx) / (innerWidth * 0.3), -1, 1)); ly.to(clamp((r.top - cy) / (innerHeight * 0.4), -1, 1));
      if (!selSaid && Math.random() < 0.5) { selSaid = true; say('Copying my homework?', { mood: 'happy' }); }
    }, 500);
  });

  // window resized: it stumbles
  let rsT = 0;
  addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { dizzyUntil = performance.now() + 700; squash(0.8); queue(); }, 120); });

  // made it to the footer: hop onto "Send a signal"
  const foot = document.querySelector('.transmit .display');
  if (foot && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; let done = ''; try { done = sessionStorage.getItem('br-pixi-foot') || ''; } catch (e) {}
      if (done) return io.disconnect();
      setTimeout(() => { if (visit(foot, 'end')) { try { sessionStorage.setItem('br-pixi-foot', '1'); } catch (e) {} io.disconnect(); setTimeout(() => say('You made it to the end. Say hi?', { mood: 'happy' }), 1300); } }, 700);
    }), { threshold: 0.9 });
    io.observe(foot);
  }

  // little idle habits
  function yawn() { open.to(0.35, { then: () => { tall.to(1.35, { damping: 1, response: 0.5 }); setTimeout(() => { tall.to(1); open.to(1); }, 900); } }); }
  function peekOut() {                                                                   // walk to the edge, peek off-screen, come back
    if (anchor || reduce()) return; const left = X.x + W / 2 < innerWidth / 2, edge = left ? -W * 0.55 : innerWidth - W * 0.45, back = X.x;
    lx.to(left ? -1 : 1); X.to(edge, { damping: 1, response: 0.8, then: () => setTimeout(() => { if (!dragging && !anchor) { lx.to(left ? 1 : -1); X.to(back, { damping: 1, response: 0.8, then: () => lx.to(0) }); } }, 1400) });
  }
  function stretch() { tall.to(1.2, { damping: 0.6, response: 0.4 }); B.to(0, { velocity: 60 }); setTimeout(() => tall.to(1), 700); }


  /* ---------- drop it on things ---------- */
  function dropOn(x, y) {
    const hit = document.elementsFromPoint(x, y).find(n => !n.closest('.pixi, .pixi-say, .pixi-z'));
    if (!hit) return false;
    if (BR.wave && hit.closest('#scope')) { const wr = BR.wave.el.getBoundingClientRect(); return startRun((x - wr.left) / wr.width); }
    const step = hit.closest('.seq-row button');
    if (step) { step.click(); nudge(step); setTimeout(() => say('Drop the beat. Literally.', { mood: 'happy' }), 400); return false; }   // toggles one step, then falls as usual
    const spot = hit.closest(SPOTS);
    if (spot && visit(spot, 'drop')) {
      const line = spot.id === 'eyes' ? 'Oh hi, big me.' : spot.id === 'sky' ? 'Stargazing. Professionally.' : null;
      if (line) setTimeout(() => say(line, { mood: 'happy' }), 900);
      return true;
    }
    return false;
  }

  /* ---------- run on the wave until tired ---------- */
  const RUN_SAY = ['Cardio!', 'I am speed.', 'Is this… exercise?', 'Surf’s up. Signal’s up.'];
  function startRun(u) {
    if (reduce() || !BR.wave) return false;
    if (performance.now() - tiredAt < 30000) { setTimeout(() => say('Legs. Gone. Ask me later.', { mood: 'tired' }), 300); return false; }
    anchor = null; hush(); wake(true); feel('happy', 0); chirp(2);
    run = { u: clamp(u, 0.05, 0.95), dir: Math.random() < 0.5 ? 1 : -1, e: 1, last: performance.now(), mid: false };
    requestAnimationFrame(runStep); return true;
  }
  function runStep(t) {
    if (!run) return;
    if (dragging) { run = null; BR.wave.release(); return; }
    const dt = Math.min(0.05, (t - run.last) / 1000); run.last = t;
    const r = BR.wave.el.getBoundingClientRect();
    if (r.bottom < 70 || r.top > innerHeight - 30 || hidden) return endRun(false);
    run.u += run.dir * (0.05 + 0.2 * run.e) * dt;                                        // slows down as it tires
    const lo = (W / 2 + 8) / r.width, hi = 1 - lo;
    if (run.u > hi || run.u < lo) { run.u = clamp(run.u, lo, hi); run.dir = -run.dir; kick(0.7); }
    run.e = Math.max(0, run.e - dt / 15);
    BR.wave.focus(run.u);                                                                // its weight bends the trace
    const y0 = r.top + BR.wave.y(run.u), y1 = r.top + BR.wave.y(Math.min(1, run.u + 0.01));
    X.set(r.left + run.u * r.width - W / 2); Y.to(floorTop() - floor - (y0 - H + 4), { damping: 0.8, response: 0.09 });   // springs up and down the steps of the square wave
    R.to(clamp(Math.atan2(y1 - y0, 0.01 * r.width) * 57.3, -35, 35), { damping: 1, response: 0.12 });   // lean with the slope
    lx.to(run.dir * 0.8); ly.to(0.3);
    if (!run.mid && run.e < 0.6) { run.mid = true; say(RUN_SAY[Math.floor(Math.random() * RUN_SAY.length)]); }
    if (run.e < 0.35 && mood !== 'tired') feel('tired', 0);
    if (run.e <= 0) return endRun(true);
    requestAnimationFrame(runStep);
  }
  function endRun(tired) {
    if (!run) return; run = null; BR.wave.release(); R.to(0); lx.to(0);
    if (!tired) return fall();
    tiredAt = performance.now(); feel('tired', 0); ly.to(0.8);
    let n = 0; const pant = setInterval(() => { squash(0.5); if (++n > 9) clearInterval(pant); }, 200);   // out of breath
    setTimeout(() => say('Okay. Cardio done. For the year.', { mood: 'tired' }), 400); secret('cardio');
    setTimeout(() => { if (!dragging && !run) { fall(); if (Math.random() < 0.6) hiccups(); } }, 3200);
  }
  function fall() { if (dragging) return; Y.to(0, { damping: 0.5, response: 0.45, then: () => { feel(baseMood(), 0); setTimeout(() => !anchor && !run && walkTo(home()), 900); } }); }


  /* ---------- personality: little tricks ---------- */
  // speech budget for reactions: one quip every 12 s at most, each kind once per visit unless it says otherwise
  let quipAt = -Infinity; const quipped = new Set();
  function quip(text, m, chance = 1, key = text, again = false) {
    if (dragging || tucked || hidden || (!again && quipped.has(key)) || Math.random() > chance) return false;
    if (performance.now() - quipAt < 12000) return false;
    quipAt = performance.now(); quipped.add(key); return say(text, m ? { mood: m } : {});
  }
  function flip() {                                                                       // a backflip, from wherever it is
    feel('happy', 1200); B.to(0, { velocity: 260 }); chirp(3);
    R.to(R.x - 360, { damping: 1, response: 0.55, then: () => R.set(0) });
    setTimeout(() => quip('Ta-da.', 'wink', 0.6, 'flip', true), 600); secret('flip');
  }
  function waveBye() { let n = 0; const iv = setInterval(() => { R.to(n % 2 ? -10 : 10, { damping: 0.6, response: 0.15 }); if (++n > 5) { clearInterval(iv); R.to(0); } }, 160); hop(8); }
  function sneeze() { open.to(0.15, { then: () => setTimeout(() => { open.to(1.2, { velocity: 10 }); kick(1.2); squash(-1); chirp(1); quip('Achoo. Dust in the circuits.', null, 0.7, 'sneeze'); }, 380) }); }
  function hiccups(n = 3) { for (let i = 0; i < n; i++) setTimeout(() => { if (!dragging && !run) { kick(0.5); open.to(1.15, { velocity: 6 }); chirp(1); } }, 1400 + i * (900 + Math.random() * 900)); }

  /* ---------- reading the visitor ---------- */
  // circles around it: it gets dizzy
  let spinA = 0, spinPrev = null, spinT = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || dragging || asleep || tucked) return;
    const cx = X.x + W / 2, cy = floorTop() - floor - Y.x + H / 2, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy), t = performance.now();
    if (d > 240 || t - spinT > 600) { spinA = 0; spinPrev = null; }
    spinT = t; if (d < 20) return; const a = Math.atan2(dy, dx);
    if (spinPrev !== null) { let da = a - spinPrev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; spinA += da; }
    spinPrev = a;
    if (Math.abs(spinA) > Math.PI * 4) { spinA = 0; dizzyUntil = t + 1800; queue(); R.to(Math.sign(spinA || 1) * 12, { then: () => R.to(0) }); quip('Stop. The room is spinning.', 'surprised', 1, 'circles', true); secret('dizzy'); }
  }, { passive: true });

  // laser pointer: jiggle the cursor near it and it crouches, then pounces
  let jig = [], pounceAt = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || dragging || asleep || tucked || anchor || run || dancing || reduce()) return;
    const t = performance.now(), cy = floorTop() - floor - Y.x + H / 2;
    if (Math.abs(e.clientY - cy) > 180 || Math.abs(e.clientX - (X.x + W / 2)) > 320) { jig = []; return; }
    jig.push({ x: e.clientX, t }); jig = jig.filter(p => t - p.t < 700);
    let flips = 0; for (let i = 2; i < jig.length; i++) if ((jig[i].x - jig[i - 1].x) * (jig[i - 1].x - jig[i - 2].x) < 0) flips++;
    if (flips >= 5 && t - pounceAt > 6000) {
      pounceAt = t; jig = []; const tx0 = clamp(e.clientX - W / 2, PAD, maxX());
      feel('angry', 900); Q.to(0.5, { damping: 1, response: 0.2 }); lx.to(Math.sign(tx0 - X.x) || 1);                    // crouch, eyes narrowed
      setTimeout(() => { Q.to(0, { velocity: -14 }); B.to(0, { velocity: 320 }); X.to(tx0, { damping: 0.9, response: 0.35 }); chirp(2); setTimeout(() => quip('Got it. Probably.', 'happy', 0.5, 'pounce', true), 500); }, 380);
    }
  }, { passive: true });

  // rage clicks
  let clicks = [];
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.pixi')) return; const t = performance.now();
    clicks.push({ x: e.clientX, y: e.clientY, t }); clicks = clicks.filter(c => t - c.t < 900 && Math.hypot(c.x - e.clientX, c.y - e.clientY) < 50);
    if (clicks.length >= 4) { clicks = []; feel('surprised', 900); quip('Easy. It’s a website, not a vending machine.', null, 1, 'rage'); }
  }, { passive: true });

  // words it knows (typed anywhere outside a text field)
  let typed = '';
  addEventListener('keydown', e => {
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    if (!asleep && !tucked && !anchor) { squash(0.15); ly.to(0.9); }                                     // it watches you type
    if (typed.endsWith('seek') || typed.endsWith('hide')) { typed = ''; hideSeek(); }
    else if (typed.endsWith('pixi')) { typed = ''; secret('name'); wake(true); hop(16); feel('love', 1600); quip('That’s me!', null, 1, 'name', true); }
    else if (typed.endsWith('dance')) { typed = ''; wake(true); let n = 0; const iv = setInterval(() => { kick(0.8); swing = -swing; R.to(10 * swing); if (++n >= 16) { clearInterval(iv); R.to(0); } }, 312); feel('happy', 5200); }
    else if (typed.endsWith('flip')) { typed = ''; flip(); }
    else if (typed.endsWith('banuka') || typed.endsWith('draw') || typed.endsWith('selfie')) { typed = ''; drawPortrait(); }
    else if (typed.endsWith('sleep')) { typed = ''; setTimeout(sleep, 300); }
    else if (typed.endsWith('hello') || typed.endsWith(' hi')) { typed = ''; waveBye(); quip('Hi! Hello. Hey.', 'happy', 1, 'hello', true); }
  });

  // what visitors do with the page
  document.addEventListener('copy', () => { feel('love', 1400); quip('Copied. I’m flattered.', null, 1, 'copy'); });
  document.addEventListener('contextmenu', () => quip('Inspecting me? It’s all springs in here.', 'wink', 1, 'inspect'));
  addEventListener('offline', () => { feel('surprised', 1500); quip('Lost signal. Ironic, for this site.', null, 1, 'offline', true); });
  addEventListener('online', () => { hop(); quip('Signal’s back.', 'happy', 1, 'online', true); });
  document.addEventListener('mouseout', e => {                                                  // pointer heading for the tabs: wave goodbye
    if (e.relatedTarget || e.clientY > 2 || asleep || tucked) return;
    if (quip('Leaving? Bye. Come back sometime.', 'happy', 1, 'bye')) waveBye();
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-sound-toggle]') && BR.sound.on) setTimeout(() => { chirp(3); quip('Oh. I have a voice now.', 'happy', 1, 'voice'); }, 300); });
  document.addEventListener('pointerover', e => {                                               // the contact buttons get heart eyes
    if (e.target.closest && e.target.closest('[data-wa-open], [data-copy], .email') && !asleep && !tucked) { feel('love', 1300); quip('Yes. That one.', null, 0.5, 'contact'); }
  });
  let deep = 0;
  addEventListener('scroll', () => {
    deep = Math.max(deep, scrollY);
    if (scrollY < 10 && deep > innerHeight * 2.5) { deep = 0; ly.to(-1); quip('Back to the top. Classic.', null, 0.7, 'top'); }
  }, { passive: true });
  if (navigator.getBattery) navigator.getBattery().then(b => { const chk = () => { if (b.level < 0.2 && !b.charging) setTimeout(() => quip(`Your battery’s at ${Math.round(b.level * 100)}%. Mine runs on coffee.`, 'tired', 1, 'battery'), 20000); }; chk(); b.addEventListener('levelchange', chk); }).catch(() => {});
  // late night, light mode: squint
  setTimeout(() => {
    const h = clock().h, light = root.dataset.theme ? root.dataset.theme === 'light' : !matchMedia('(prefers-color-scheme: dark)').matches;
    if ((h >= 22 || h < 5) && light && !root.dataset.mode) { open.to(0.4, { then: () => setTimeout(() => open.to(1), 800) }); quip('It’s late and you’re in light mode? Brave.', 'tired', 1, 'latelight'); }
  }, 16000);
  // long visits and returning visitors
  setTimeout(() => quip('Five minutes here already. Coffee break?', 'happy', 1, 'five'), 300000);
  let visits = 0; try { const d = new Date().toDateString(), v = JSON.parse(store.get('br-pixi-visits') || '{}'); visits = v.d === d ? v.n : 0; if (!sessionStorage.getItem('br-pixi-v')) { visits++; store.set('br-pixi-visits', JSON.stringify({ d, n: visits })); sessionStorage.setItem('br-pixi-v', '1'); } } catch (e) {}
  if (visits >= 3) setTimeout(() => quip(`Visit number ${visits} today. We should stop meeting like this.`, 'wink', 1, 'visits'), 11000);
  // tucked away, it still peeks around now and then
  setInterval(() => { if (tucked && !document.hidden) { lx.to((Math.random() - 0.5) * 2); setTimeout(() => lx.to(0), 900); } }, 4000);
  // tap the speech bubble to dismiss: it sulks for a second
  bub.addEventListener('click', () => { if (Math.random() < 0.3) feel('tired', 900); });


  /* ---------- effects layer: Pixi's dots can leave its body ---------- */
  const fc = fx.getContext('2d'); let FW = 0, FH = 0, P = [], fxRaf = 0, fxLast = 0;
  const fxSize = () => { const d = Math.min(2, devicePixelRatio || 1); FW = innerWidth; FH = innerHeight; fx.width = FW * d; fx.height = FH * d; fc.setTransform(d, 0, 0, d, 0, 0); };
  fxSize(); addEventListener('resize', fxSize);
  const ease = p => 1 - Math.pow(1 - p, 4), easeIO = p => p < 0.5 ? 8 * p ** 4 : 1 - Math.pow(-2 * p + 2, 4) / 2;
  function emit(p) { P.push(p); if (!fxRaf) { fxLast = performance.now(); fxRaf = requestAnimationFrame(fxTick); } }
  function fxTick(t) {
    const dt = Math.min(0.05, (t - fxLast) / 1000); fxLast = t; fc.clearRect(0, 0, FW, FH);
    P = P.filter(p => {
      const age = t - p.t0;
      if (age < 0) { p.draw && dot(p.fx, p.fy, p.r, p.col, p.a0 ?? 1); return true; }
      if (p.kind === 'path') {                                                                 // along a curve, out and (optionally) back
        const go = p.dur, hold = p.hold || 0, back = p.back ? p.dur : 0; if (age > go + hold + back) { p.done && p.done(); return false; }
        let e = age < go ? easeIO(age / go) : age < go + hold ? 1 : 1 - easeIO((age - go - hold) / back);
        const u = 1 - e, x = u * u * p.fx + 2 * u * e * p.cx + e * e * p.tx, y = u * u * p.fy + 2 * u * e * p.cy + e * e * p.ty;
        dot(x, y, p.r * (p.grow ? 0.8 + 0.4 * Math.sin(e * Math.PI) : 1), p.col, p.fade ? 1 - e * 0.9 : 1); return true;
      }
      if (age > p.life) return false;                                                          // free particles: velocity, gravity, drag, fade
      p.vx *= 1 - p.drag * dt; p.vy = p.vy * (1 - p.drag * dt) + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      dot(p.x, p.y, p.r, p.col, (p.a0 ?? 1) * (1 - age / p.life)); return true;
    });
    fxRaf = P.length ? requestAnimationFrame(fxTick) : 0;
  }
  function dot(x, y, r, col, a) { fc.globalAlpha = Math.max(0, a); fc.fillStyle = col === 'red' ? K.red : K.ink; fc.beginPath(); fc.arc(x, y, r, 0, 6.283); fc.fill(); fc.globalAlpha = 1; }
  // where each of Pixi's dots is on screen right now (follows its rotation and squash)
  function dotsScreen() {
    let m; try { m = new DOMMatrixReadOnly(getComputedStyle(el).transform); } catch (e) { return []; }
    const oy = hang ? 0 : H;
    return cells.map(([x, y, a]) => { const q = m.transformPoint({ x: x - W / 2, y: y - oy }); return { x: q.x + W / 2, y: q.y + oy, a, lx: x, ly: y }; });
  }
  function ghost() { const now = performance.now(); dotsScreen().forEach(d => d.a > 0.3 && emit({ kind: 'free', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, drag: 0, r: 1.2, a0: 0.25, life: 170, t0: now })); }

  // dissolve into dots, fly somewhere along curved paths, reassemble
  function teleport(toX, toTop, done, from) {
    const src = from || dotsScreen(); if (reduce() || !src.length) { X.set(toX); Y.set(floorTop() - floor - toTop); done && done(); return; }
    hiddenFx = true; hush(); cv.style.visibility = 'hidden'; const now = performance.now(); let longest = 0;
    src.forEach((d, i) => {
      const tx = toX + d.lx, ty = toTop + d.ly, mx = (d.x + tx) / 2, my = (d.y + ty) / 2, n = Math.hypot(tx - d.x, ty - d.y) || 1;
      const bend = (Math.random() - 0.5) * Math.min(260, n * 0.6), delay = Math.random() * 160 + (d.a < 0.3 ? 60 : 0), dur = 620 + Math.random() * 380;
      longest = Math.max(longest, delay + dur);
      emit({ kind: 'path', fx: d.x, fy: d.y, tx, ty, cx: mx - (ty - d.y) / n * bend, cy: my + (tx - d.x) / n * bend, r: d.a < 0.3 ? 0.8 : 0.7 + 1.05 * d.a, a0: d.a < 0.3 ? 0.4 : 1, grow: true, dur, t0: now + delay, draw: true });
    });
    chirp(3);
    setTimeout(() => { X.set(toX); Y.set(floorTop() - floor - toTop); R.set(0); cv.style.visibility = ''; hiddenFx = false; squash(0.6); blink(); queue(); done && done(); }, longest);
  }

  // dot art: its eye dots float up and draw a little picture, then come home
  const ICONS = {
    star: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '#.....#'],
    cup: ['.......', '#####..', '#####.#', '#####.#', '######.', '.####..', '.......'],
    moon: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'],
    heart: ['.......', '.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
    note: ['...###.', '...#.#.', '...#.#.', '...#.#.', '.###.#.', '####...', '.##....'],
  };
  function perform(name) {
    const art = ICONS[name], src = dotsScreen().filter(d => d.a > 0.3); if (!art || !src.length || reduce()) return;
    const pts = []; art.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && pts.push([i, j])));
    const S = 6, top = floorTop() - floor - Y.x - 22 - art.length * S, left = clamp(X.x + W / 2 - (art[0].length * S) / 2, 8, innerWidth - art[0].length * S - 8), now = performance.now();
    open.to(0.12); lx.to(0); ly.to(-1); feel('happy', 3400);
    pts.forEach(([i, j], k) => { const d = src[k % src.length], tx = left + i * S, ty = top + j * S;
      emit({ kind: 'path', fx: d.x, fy: d.y, tx, ty, cx: (d.x + tx) / 2 + (Math.random() - 0.5) * 60, cy: Math.min(d.y, ty) - 30, r: 1.9, col: name === 'heart' ? 'red' : 'ink', dur: 700 + Math.random() * 200, hold: 1500, back: true, t0: now + k * 12 }); });
    chirp(2); setTimeout(() => { open.to(1); ly.to(0); squash(0.4); }, 3100);
  }

  // fireworks from its dots
  function fireworks(x, y, n = 60) {
    const now = performance.now();
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 160 + Math.random() * 340;
      emit({ kind: 'free', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 520, drag: 1.4, r: 1.2 + Math.random() * 1.2, col: i % 3 ? 'ink' : 'red', life: 900 + Math.random() * 700, t0: now }); }
  }

  /* ---------- surprises ---------- */
  let surpriseAt = performance.now();
  function surprise() {
    if (reduce() || anchor || run || hang || dragging || tucked || hidden) return lookAround();
    surpriseAt = performance.now(); const r = Math.random();
    if (r > 0.88 && hideSeek()) return;
    if (r > 0.6 && tinker()) return;
    let drew = '1'; try { drew = sessionStorage.getItem('br-pixi-drew') || ''; } catch (e) {}
    if (r < 0.12 && !drew) { try { sessionStorage.setItem('br-pixi-drew', '1'); } catch (e) {} if (drawPortrait()) return; }
    if (r < 0.28) return perform(Object.keys(ICONS)[Math.floor(Math.random() * 5)]);
    if (r < 0.5) return eatDot() || hangStart();
    if (r < 0.75) return hangStart() || perform('star');
    const spot = roamPick(); if (!spot) return perform('heart');
    const sr = spot.getBoundingClientRect(), x = clamp(sr.left + Math.random() * Math.max(0, Math.min(sr.width, 300) - W), PAD, maxX());
    teleport(x, sitTop(sr), () => { anchor = { n: spot, dx: new Spring(x - sr.left, { damping: 1, response: 0.9 }).on(queue) }; quip('Shortcut.', 'wink', 0.6, 'teleport', true); });
  }

  // hang upside down from the nav and swing; push it with the cursor
  function hangStart() {
    const nav = document.querySelector('.nav'); if (!nav || reduce()) return false;
    const nb = nav.getBoundingClientRect().bottom; if (nb < 20) return false;
    const x = clamp(innerWidth * (0.3 + Math.random() * 0.4), PAD, maxX());
    teleport(x, nb, () => {
      hang = { x, top: nb, th: 0.5 * (Math.random() < 0.5 ? 1 : -1), w: 0, last: performance.now(), until: performance.now() + 14000 };
      el.style.transformOrigin = '50% 0'; feel('happy', 0); requestAnimationFrame(hangStep);
      setTimeout(() => quip('Hi from up here.', 'happy', 1, 'hang', true), 500);
    });
    return true;
  }
  function hangStep(t) {
    if (!hang) return; const dt = Math.min(0.04, (t - hang.last) / 1000); hang.last = t;
    const nav = document.querySelector('.nav'), nb = nav ? nav.getBoundingClientRect().bottom : -1;
    if (nb < 10 || t > hang.until || hidden) return hangEnd();
    hang.top = nb; const w0 = 2 * Math.PI * 0.75;                                              // a real pendulum: gravity, a little air drag
    hang.w += (-w0 * w0 * Math.sin(hang.th) - 0.5 * hang.w) * dt; hang.th += hang.w * dt;
    queue(); requestAnimationFrame(hangStep);
  }
  addEventListener('pointermove', e => {                                                       // brush past it and it swings
    if (!hang || e.pointerType === 'touch') return;
    const cx = hang.x + W / 2, cy = hang.top + H / 2, d = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (d < 70) hang.w += clamp(e.movementX || 0, -40, 40) * 0.02;
  }, { passive: true });
  function hangEnd(quiet) {
    if (!hang) return; const h = hang; hang = null; el.style.transformOrigin = '';
    X.set(clamp(h.x + Math.sin(h.th) * H, PAD, maxX())); Y.set(floorTop() - floor - h.top); R.set(180 + h.th * 57.3);
    if (quiet) { R.to(0); return; }
    R.to(0, { damping: 0.8, response: 0.5 }); Y.to(0, { damping: 0.5, response: 0.5, then: () => { squash(0.8); feel('happy', 900); setTimeout(() => walkTo(home()), 700); } });   // drops and lands on its feet
  }

  // eat the red full stop at the end of a headline, then give it back
  function eatDot() {
    if (EMBED) return false;                                                             // only my own headlines' dots
    const dots = [...document.querySelectorAll('.dot')].filter(d => { const h = d.closest('h1, h2, .display'); return h && usable(h); });
    if (!dots.length) return false; const d = dots[Math.floor(Math.random() * dots.length)], h = d.closest('h1, h2, .display'), dr = d.getBoundingClientRect();
    const hr = h.getBoundingClientRect(), room = dr.right + 6 + W < innerWidth - 8;
    return visit(h, 'eat', room ? dr.right + 6 : dr.left + dr.width / 2 - W / 2, (room ? dr.bottom - dr.height * 0.2 - H + 3 : dr.bottom - dr.height * 0.32 - H + 2) - hr.top);   // stand on the line, right beside the dot
  }
  function chomp(h) {
    const d = h.querySelector('.dot'); if (!d) return; const dr = d.getBoundingClientRect();
    const ex = X.x + W / 2 - (dr.left + dr.width / 2), ey = floorTop() - floor - Y.x + H / 2 - (dr.top + dr.height / 2);
    lx.to(clamp(-ex / 40, -1, 1)); ly.to(0.6); open.to(1.25, { velocity: 6 });
    setTimeout(() => {
      const eat = d.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${ex}px, ${ey}px) scale(.3)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
      eat.onfinish = () => { let n = 0; const iv = setInterval(() => { squash(0.5); chirp(1); if (++n >= 3) clearInterval(iv); }, 170); feel('happy', 1800); quip('Mm. Punctuation.', null, 1, 'eat', true);
        setTimeout(() => { eat.cancel(); d.animate([{ transform: `translate(${ex}px, ${ey}px) scale(.3)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.34,1.56,.64,1)' }); kick(0.8); feel('wink', 1200); }, 3600); };
    }, 500);
  }

  // dreams: while asleep, a thought bubble cycles through little dot pictures
  let dreamIv = 0;
  function dream() {
    if (!asleep || hidden || tucked) return; clearInterval(typing); clearTimeout(hideT);
    const names = ['star', 'moon', 'cup', 'note', 'heart'], q = document.createElement('canvas'), Sz = 5, N = 7;
    q.width = q.height = N * Sz * 2; q.style.cssText = `width:${N * Sz}px;height:${N * Sz}px;display:block`;
    const qc = q.getContext('2d'); qc.scale(2, 2); let k = Math.floor(Math.random() * names.length);
    const draw = () => { qc.clearRect(0, 0, N * Sz, N * Sz); ICONS[names[k++ % names.length]].forEach((row, j) => [...row].forEach((ch, i) => {
      qc.globalAlpha = ch === '#' ? 1 : 0.18; qc.fillStyle = ch === '#' ? K.ink : K.line; qc.beginPath(); qc.arc(i * Sz + Sz / 2, j * Sz + Sz / 2, ch === '#' ? 1.7 : 0.7, 0, 6.283); qc.fill(); })); };
    draw(); bub.querySelector('.sr').textContent = 'Pixi is dreaming.'; const tEl = bub.querySelector('.t'); tEl.textContent = ''; tEl.append(q);
    bub.style.visibility = 'visible'; placeBubble(X.x, floorTop() - floor - Y.x); sayOn.to(0.9); dreamIv = setInterval(draw, 1700);
  }
  function stopDream() { if (dreamIv) { clearInterval(dreamIv); dreamIv = 0; hush(); } }

  // travelling between pages: the dots stream into the link you clicked, and reassemble on the next page
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    let u; try { u = new URL(a.href, location.href); } catch (er) { return; }
    if (u.origin !== location.origin || u.pathname === location.pathname || tucked || hidden || reduce()) return;
    const r = a.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    try { sessionStorage.setItem('br-pixi-arrive', JSON.stringify({ x, y })); } catch (er) {}
    const now = performance.now(); dotsScreen().forEach(d => emit({ kind: 'path', fx: d.x, fy: d.y, tx: x, ty: y, cx: (d.x + x) / 2, cy: Math.min(d.y, y) - 80, r: 1.2, dur: 420 + Math.random() * 200, t0: now, fade: true }));
    cv.style.visibility = 'hidden'; shadow.style.opacity = 0;
  });
  let arrive = null; try { arrive = JSON.parse(sessionStorage.getItem('br-pixi-arrive') || 'null'); sessionStorage.removeItem('br-pixi-arrive'); } catch (e) {}
  if (arrive && !tucked && !reduce()) {
    hiddenFx = true; cv.style.visibility = 'hidden';
    setTimeout(() => {
      const top = floorTop() - floor - Y.x, from = [];
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) if (inBody(i, j) && ((i + j) % 2 === 0)) from.push({ x: arrive.x + (Math.random() - 0.5) * 30, y: arrive.y + (Math.random() - 0.5) * 16, a: 0.5, lx: (i + 0.5) * CELL, ly: (j + 0.5) * CELL });
      teleport(X.x, top, () => { hop(10); feel('happy', 900); }, from);
    }, 380);
  }

  // the old cheat code
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let kq = [];
  addEventListener('keydown', e => {
    kq.push(e.key.length === 1 ? e.key.toLowerCase() : e.key); kq = kq.slice(-10);
    if (kq.join() === KONAMI.join()) { kq = []; if (tucked) untuck(); wake(true);
      const cx = X.x + W / 2, cy = floorTop() - floor - Y.x; flip(); feel('love', 2600);
      [0, 260, 520].forEach((d, i) => setTimeout(() => fireworks(i ? cx + (Math.random() - 0.5) * 300 : cx, i ? cy - 120 - Math.random() * 160 : cy), d));
      setTimeout(() => say('Cheat code accepted. +30 lives.'), 700); secret('konami'); }
  });


  /* ---------- self-portrait: Pixi plots my photo as a dot grid, row by row ----------
     44 x 44 brightness levels (0–9) sampled from my headshot; light dots on a small dark screen, like the site's other devices. */
  const ME = (
    '00000000000000000000000000000000000000000000' +
    '00000000000000000000000000000000000000000000' +
    '00000000000000000000000000000000000000000000' +
    '00000000000000000000000000000000000000000000' +
    '00000000000000000000111111100000000000000000' +
    '00000000000000000000010111110000000000000000' +
    '00000000000000001111111111110000000000000000' +
    '00000000000000011111111111110000000000000000' +
    '00000000000000111100111111111000000000000000' +
    '00000000000000111012454332111000000000000000' +
    '00000000000000111256777777311100000000000000' +
    '00000000000000111567888888511100000000000000' +
    '00000000000000111567888888611100000000000000' +
    '00000000000000111567888888731000000000000000' +
    '00000000000000014556788544651000000000000000' +
    '00000000000000014432354335543100000000000000' +
    '00000000000000133432344435755000000000000000' +
    '00000000000000145655577768874000000000000000' +
    '00000000000000035677589678863000000000000000' +
    '00000000000000015677646688862000000000000000' +
    '00000000000000003667644688720000000000000000' +
    '00000000000000000465445437610000000000000000' +
    '00000000000000000254477766410000000000000000' +
    '00000000000000000134644675200000000000000000' +
    '00000000000000000113554553510000000000000000' +
    '00000000000000000341111114651000000000000000' +
    '00000000000000001554111246661100000000000000' +
    '00000000000001111646544664951111100000000000' +
    '00000000001111111956666657941111111100000000' +
    '00000001111111111994666579931111111111100000' +
    '00000001111111111997677889921111111111100000' +
    '00000011111111112888799988911111111111100000' +
    '00000011111111113899999999711111111111100000' +
    '00000011111111113999999999611111111111110000' +
    '00000111111111113999999999411111111111110000' +
    '00000111111111113999999999211111111111111000' +
    '00001111111111112999999999111111111111111000' +
    '00001111111111111999999997111111111111112000' +
    '00001111111111111999999994111111111111111100' +
    '00011111111111111899999992111111111111111100' +
    '00011111111111111799999981111111111111111100' +
    '00011111111111111599999961111111111111111100' +
    '00011111111111111399999931111111111111111100' +
    '00000000000000000000000000000000000000000000'
  );
  const PN = 44, PS = 4, PSZ = PN * PS;
  let portrait = null, offerDraw = false, drewAt = -Infinity;
  const pcss = document.createElement('style');
  pcss.textContent = `
  .pixi-pt { position: fixed; left: 0; top: 0; z-index: 61; margin: 0; padding: 12px 12px 10px; border-radius: 20px; background: var(--screen); color: var(--screen-ink);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--screen-ink) 10%, transparent), 0 24px 60px -24px rgba(0,0,0,.55); opacity: 0; will-change: transform, opacity, filter; }
  .pixi-pt canvas { width: ${PSZ}px; height: ${PSZ}px; display: block; cursor: crosshair; touch-action: none; }
  .pixi-pt .cap { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; font-family: var(--f-mono); font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; opacity: .55; }
  .pixi-pt .x { position: absolute; top: 4px; right: 4px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: inherit; opacity: .5; cursor: pointer; display: grid; place-items: center; }
  .pixi-pt .x:hover { opacity: 1; background: color-mix(in srgb, var(--screen-ink) 12%, transparent); }
  .pixi-pt .x:active { transform: scale(.92); }
  @media (pointer: coarse) { .pixi-pt .x { width: 44px; height: 44px; top: -2px; right: -2px; } }
  @media (prefers-reduced-transparency: reduce) { .pixi-pt { box-shadow: 0 0 0 1px var(--line); } }`;
  document.head.appendChild(pcss);

  function drawPortrait() {
    if (EMBED) return false;
    if (portrait || dragging || hang || run || hiddenFx) return false;
    if (tucked) untuck(); wake(true); hush(); anchor = null; drewAt = performance.now(); offerDraw = false;
    const card = document.createElement('figure'); card.className = 'pixi-pt';
    card.innerHTML = `<canvas width="${PSZ * 2}" height="${PSZ * 2}" role="img" aria-label="Self-portrait of Banuka, drawn by Pixi as a grid of dots"></canvas><figcaption class="cap"><span>Self-portrait · Pixi</span><span data-n>0 dots</span></figcaption>
      <button class="x" type="button" aria-label="Close portrait"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>`;
    document.body.appendChild(card);
    const pc = card.querySelector('canvas'), g2 = pc.getContext('2d'); g2.scale(2, 2);
    const cw = PSZ + 24, ch = card.offsetHeight;
    // the card appears from Pixi: placed above it, on the side with room
    const px0 = X.x + W / 2, right = px0 > innerWidth / 2;
    const left = clamp(right ? X.x + W - cw : X.x, 12, innerWidth - cw - 12), top = clamp(floorTop() - floor - Y.x - ch - 30, 84, innerHeight - ch - 12);
    card.style.transformOrigin = `${clamp(px0 - left, 0, cw)}px ${ch + 30}px`;
    const S0 = new Spring(0, { damping: 0.9, response: 0.42 }).on(v => {                       // materialize: scale + blur + opacity together
      card.style.opacity = clamp(v, 0, 1); card.style.filter = v < 0.98 ? `blur(${(1 - clamp(v, 0, 1)) * 8}px)` : '';
      card.style.transform = `translate(${left}px, ${top}px) scale(${0.6 + 0.4 * v})`; });
    S0.set(0); S0.to(1);
    const L = []; let lit = 0;
    for (let j = 0; j < PN; j++) for (let i = 0; i < PN; i++) { const v = +ME[j * PN + i]; L.push({ i, j, v, at: Infinity, s: 1 }); if (v) lit++; }
    portrait = { card, L, left, top, cw, ch, S0, mx: -999, my: -999, rip: [], done: false, raf: 0, drawn: 0 };
    const nEl = card.querySelector('[data-n]');
    // Pixi hops onto the card's top edge and works across it like a plotter head, row by row, back and forth
    const sit = () => floorTop() - floor - (top - H + 3);
    X.to(clamp(left + 12, PAD, maxX()), { damping: 1, response: 0.45 }); Y.to(sit(), { velocity: 500, damping: 0.75, response: 0.45 });
    feel('happy', 0); ly.to(1);
    const T0 = performance.now() + (reduce() ? 0 : 600), ROW = reduce() ? 0 : 95;
    L.forEach(d => { const col = d.j % 2 ? PN - 1 - d.i : d.i; d.at = T0 + d.j * ROW + (col / PN) * ROW; });
    let lastRow = -1;
    function frame(t) {
      if (!portrait || portrait.card !== card) return;
      g2.clearRect(0, 0, PSZ, PSZ);
      const p = portrait, row = Math.floor((t - T0) / Math.max(1, ROW));
      if (!p.done && ROW && row >= 0 && row < PN && row !== lastRow) {                           // move the head to this row's sweep
        lastRow = row; const fwd = row % 2 === 0, from = left + 12 + (fwd ? 0 : PSZ - W), to = left + 12 + (fwd ? PSZ - W : 0);
        X.set(clamp(from, PAD, maxX())); X.to(clamp(to, PAD, maxX()), { damping: 1, response: ROW / 1000 * 0.9 }); lx.to(fwd ? 0.8 : -0.8);
        if (row % 6 === 0) squash(0.15);
      }
      let drawn = 0;
      for (const d of p.L) {
        const age = t - d.at; if (age < 0) { faint(d); continue; }
        if (d.v) drawn++;
        const e = ROW ? Math.min(1, age / 260) : 1, pop = e < 1 ? 1 + 0.6 * Math.sin(e * Math.PI) * (1 - e) : 1;     // each dot pops in with a little overshoot
        let x = d.i * PS + PS / 2, y = d.j * PS + PS / 2, r = d.v ? 0.45 + 1.45 * d.v / 9 : 0;
        if (p.done) {                                                                             // the lens: dots swell and lean away from the cursor
          const dx = x - p.mx, dy = y - p.my, dd = Math.hypot(dx, dy), k = Math.max(0, 1 - dd / 34);
          d.s += ((1 + 0.9 * k * k) - d.s) * 0.25; if (dd > 0.1) { x += dx / dd * 3.2 * k * k; y += dy / dd * 3.2 * k * k; }
          for (const q of p.rip) { const rr = (t - q.t) * 0.12, w = Math.abs(Math.hypot(x - q.x, y - q.y) - rr); if (w < 10) d.s += (1 - w / 10) * 0.35 * Math.max(0, 1 - (t - q.t) / 900); }
        }
        if (!r) { faint(d, x, y); continue; }
        g2.globalAlpha = 1; g2.fillStyle = K.scr; g2.beginPath(); g2.arc(x, y, Math.min(PS * 0.62, r * pop * d.s), 0, 6.283); g2.fill();
      }
      p.rip = p.rip.filter(q => t - q.t < 900);
      if (drawn !== p.drawn) { p.drawn = drawn; nEl.textContent = `${drawn.toLocaleString()} dots`; if (!p.done && drawn % 20 === 0) dispatchEvent(new CustomEvent('br-activity', { detail: { id: 'draw', progress: drawn / lit } })); }
      if (!p.done && t > T0 + PN * ROW + 300) { p.done = true; finish(); }
      if (p.done && p.sig && t > p.sig) { const e = Math.min(1, (t - p.sig) / 500); g2.fillStyle = K.red; g2.globalAlpha = 1; g2.beginPath(); g2.arc(PSZ - 9, PSZ - 9, 2.6 * (1 + 0.5 * Math.sin(e * Math.PI) * (1 - e)) * e, 0, 6.283); g2.fill(); }
      p.raf = requestAnimationFrame(frame);
    }
    function faint(d, x = d.i * PS + PS / 2, y = d.j * PS + PS / 2) { g2.globalAlpha = 0.12; g2.fillStyle = K.scr; g2.beginPath(); g2.arc(x, y, 0.45, 0, 6.283); g2.fill(); g2.globalAlpha = 1; }
    function finish() {
      dispatchEvent(new CustomEvent('br-activity', { detail: { id: 'draw', progress: 1, done: true } }));
      portrait.sig = performance.now() + 250;                                                   // signs it with the red star
      lx.to(0); ly.to(0.6); feel('happy', 1600); hop(12); chirp(3);
      anchor = { n: card, oy: -H + 3, dx: new Spring(X.x - left, { damping: 1, response: 0.9 }).on(queue) };
      setTimeout(() => say('Drew us. The glasses took the longest.', { mood: 'happy' }), 700); secret('portrait');
      portrait.idle = setTimeout(() => closePortrait(), 22000);
    }
    portrait.raf = requestAnimationFrame(frame);
    const local = e => { const r = pc.getBoundingClientRect(); return [(e.clientX - r.left) * PSZ / r.width, (e.clientY - r.top) * PSZ / r.height]; };
    const poke = () => { clearTimeout(portrait.idle); portrait.idle = setTimeout(() => closePortrait(), 22000); };
    pc.addEventListener('pointermove', e => { [portrait.mx, portrait.my] = local(e); poke(); });
    pc.addEventListener('pointerleave', () => { portrait.mx = portrait.my = -999; });
    pc.addEventListener('pointerdown', e => { const [x, y] = local(e); portrait.rip.push({ x, y, t: performance.now() }); squash(0.3); poke(); });   // tap: a ripple runs through the dots
    card.querySelector('.x').addEventListener('click', () => closePortrait());
    return true;
  }
  function closePortrait() {
    const p = portrait; if (!p) return; portrait = null; clearTimeout(p.idle);
    if (anchor && anchor.n === p.card) anchor = null;
    // the dots fly home into Pixi, then the card dematerializes
    if (!reduce()) {
      const r = p.card.querySelector('canvas').getBoundingClientRect(), now = performance.now(), hx = X.x + W / 2, hy = floorTop() - floor - Y.x + H / 2;
      p.L.forEach((d, k) => { if (d.v >= 3 && k % 2 === 0) { const x = r.left + d.i * PS + PS / 2, y = r.top + d.j * PS + PS / 2;
        emit({ kind: 'path', fx: x, fy: y, tx: hx, ty: hy, cx: (x + hx) / 2 + (Math.random() - 0.5) * 80, cy: Math.min(y, hy) - 40 * Math.random(), r: 0.5 + 1.2 * d.v / 9, dur: 520 + Math.random() * 420, t0: now + (d.j / PN) * 220, fade: true }); } });
      p.L.forEach(d => { d.v = 0; });
    }
    p.S0.to(0, { damping: 1, response: 0.35, then: () => { cancelAnimationFrame(p.raf); p.card.remove(); } });
    setTimeout(() => { if (!dragging && !anchor) { fall(); squash(0.5); } }, 500);
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && portrait) closePortrait(); });
  document.addEventListener('pointerdown', e => { if (portrait && portrait.done && !e.target.closest('.pixi-pt, .pixi')) closePortrait(); }, { passive: true });
  // hover my name for a moment and Pixi offers to draw me; the next tap on Pixi does it
  let nameT = 0;
  document.addEventListener('pointerover', e => {
    const m = e.target.closest && e.target.closest('mark, .brand'); if (!m || !/Banuka/.test(m.textContent + (m.getAttribute('aria-label') || ''))) return;
    clearTimeout(nameT); nameT = setTimeout(() => { if (!portrait && performance.now() - drewAt > 60000) { offerDraw = true; feel('happy', 1400); hop(8); say('Want a portrait? Tap me.'); } }, 1200);
  });
  document.addEventListener('pointerout', e => { if (e.target.closest && e.target.closest('mark, .brand')) clearTimeout(nameT); });


  /* ---------- secrets: little things to find, collected in the footer ---------- */
  const SECRETS = [
    ['name', 'Said its name', 'Type its name'], ['pet', 'Petted Pixi', 'Rest a while on it'], ['hold', 'Heart eyes', 'A long hold'],
    ['flip', 'Backflip', 'Twice, quickly'], ['dizzy', 'Made it dizzy', 'Round and round'], ['cardio', 'Cardio on the wave', 'Drop it on the signal'],
    ['portrait', 'Got a portrait', 'Type “draw”'], ['seek', 'Found it hiding', 'Type “seek”'], ['tuck', 'Woke it from a nap', 'Tuck it under the edge'],
    ['timelapse', 'Watched the sky turn', 'Off-hours, after dark or not'], ['owl', 'Night owl', 'Come back after midnight'], ['konami', 'Cheat code', '↑ ↑ ↓ ↓ ← → ← → B A'],
  ];
  let got = new Set(); try { got = new Set(JSON.parse(store.get('br-pixi-found') || '[]')); } catch (e) {}
  function secret(id) {
    if (got.has(id)) return; got.add(id); store.set('br-pixi-found', JSON.stringify([...got]));
    const s = SECRETS.find(x => x[0] === id); if (!s) return;
    dispatchEvent(new CustomEvent('br-activity', { detail: { id: 'secret', name: s[1], n: got.size, of: SECRETS.length } }));
    renderSecrets(); if (got.size === SECRETS.length) setTimeout(() => { fireworks(X.x + W / 2, floorTop() - floor - Y.x, 90); say('All of them. You know me better than I do.', { mood: 'love' }); }, 1600);
  }
  const scss = document.createElement('style');
  scss.textContent = `
  .sec-btn { font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--ink-3); background: none; border: 0; padding: 4px 0; cursor: pointer; }
  .sec-btn:hover { color: var(--ink); } .sec-btn b { color: var(--accent); font-weight: 500; }
  .sec-list { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; text-transform: none; letter-spacing: .02em; }
  .sec-list li { color: var(--ink-3); } .sec-list li.got { color: var(--ink); } .sec-list li.got::before { content: "✦ "; color: var(--accent); } .sec-list li:not(.got)::before { content: "· "; }
  .pixi.peek canvas { clip-path: inset(0 0 46% 0); }`;
  document.head.appendChild(scss);
  function renderSecrets() {
    document.querySelectorAll('[data-secrets]').forEach(dd => {
      if (!got.size) { dd.innerHTML = ''; return; }
      const open = dd.querySelector('.sec-list') && !dd.querySelector('.sec-list').hidden;
      dd.innerHTML = `<button class="sec-btn" type="button" aria-expanded="${open}">Secrets · <b>${got.size}</b> of ${SECRETS.length}</button>
        <ul class="sec-list"${open ? '' : ' hidden'}>${SECRETS.map(([id, name, hint]) => got.has(id) ? `<li class="got">${name}</li>` : `<li>${hint}</li>`).join('')}</ul>`;
      const b = dd.querySelector('.sec-btn'), l = dd.querySelector('.sec-list');
      b.addEventListener('click', () => { l.hidden = !l.hidden; b.setAttribute('aria-expanded', !l.hidden); BR.blip('tick'); });
    });
  }
  renderSecrets();
  { const h = clock().h; if (h >= 0 && h < 4) setTimeout(() => secret('owl'), 4000); }

  /* ---------- hide and seek: it hides somewhere on the page with just its eyes showing ---------- */
  let seek = null;
  function hideSeek() {
    if (seek || (portrait && !portrait.done) || hang || run || dragging || hiddenFx || reduce()) return false;
    if (tucked) { tucked = false; store.set('br-pixi', ''); }
    const all = [...document.querySelectorAll('h2, .h2, .h3, .btn, figure img, .frame, canvas, .card, .chip, .label')].filter(n => {
      if (n.closest('.pixi, .nav, .mmenu, .wa, .vinyl, .m-toast, .intro, .pixi-pt, .isl, .pixi-fx, .visit-sky, .st, .transmit')) return false;
      const r = n.getBoundingClientRect(); return r.width >= 60 && r.height >= 12 && n.offsetParent !== null && (r.top > innerHeight * 0.4 || r.bottom < 0 || r.top < -40);   // somewhere you'll have to look for
    });
    if (!all.length) return false;
    const n = all[Math.floor(Math.random() * all.length)];
    anchor = null; hush(); feel('happy', 0); say('Hide and seek! Count to three…');
    setTimeout(() => {
      const r = n.getBoundingClientRect(), dx = clamp(Math.random() * Math.max(0, r.width - W), 0, Math.max(0, r.width - W)), top = r.top - H * 0.55;
      teleport(clamp(r.left + dx, -W, innerWidth), top, () => {
        anchor = { n, dx: new Spring(dx, { damping: 1, response: 0.9 }).on(queue), oy: -H * 0.55, keep: true };
        el.classList.add('peek'); feel('happy', 0); seek = { t0: performance.now(), n };
        dispatchEvent(new CustomEvent('br-activity', { detail: { id: 'seek', t0: Date.now() } }));
        seek.look = setInterval(() => { lx.to((Math.random() - 0.5) * 2); ly.to(-0.6 + Math.random() * 0.4); if (Math.random() < 0.3) blink(); }, 1400);
        seek.limit = setTimeout(() => seekEnd(false), 90000);
      });
    }, 1700);
    return true;
  }
  function seekEnd(found) {
    if (!seek) return; const s = seek; seek = null; clearInterval(s.look); clearTimeout(s.limit); el.classList.remove('peek');
    const secs = Math.round((performance.now() - s.t0) / 1000); anchor = null;
    dispatchEvent(new CustomEvent('br-activity', { detail: { id: 'seek', done: true, found, secs } }));
    if (found) {
      let best = +store.get('br-pixi-seek') || 0; const rec = !best || secs < best; if (rec) store.set('br-pixi-seek', secs);
      feel('love', 1800); hop(18); chirp(3); fireworks(X.x + W / 2, floorTop() - floor - Y.x, 40);
      say(`Found me! ${secs} s.${rec && best ? ' New record.' : ''}`); secret('seek');
      setTimeout(() => !anchor && fall(), 2200);
    } else {
      const where = (s.n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
      teleport(home(), floorTop() - floor - 0, () => { Y.set(0); say(where ? `I win. I was by “${where}”.` : 'I win. Next time.', { mood: 'wink' }); });
    }
  }
  addEventListener('br-seek-giveup', () => seekEnd(false));

  /* ---------- Pixi plays with the page: presses the time-lapse, writes a beat, turns the tuner, pours a coffee ---------- */
  let pressCb = null;
  function press(btn, f) { if (!btn || !usable(btn)) return false; pressCb = f; if (!visit(btn, 'press')) { pressCb = null; return false; } return true; }
  function tinker() {
    if (anchor || run || hang || dragging || tucked || hidden || seek || reduce() || (portrait && !portrait.done)) return false;
    const lb = document.getElementById('lapse'), sky = document.getElementById('sky'), hrs = document.getElementById('hrs');
    if (lb && sky && lb.textContent.trim() === 'Time-lapse' && hrs && +hrs.value === 0 && usable(lb)) {
      return press(lb, () => { lb.click(); setTimeout(() => { anchor = null; visit(sky, 'watch'); setTimeout(() => quip('Watch them turn.', 'happy', 1, 'turn', true), 1100); }, 600);
        setTimeout(() => { if (lb.textContent.trim() === 'Pause') { const nb = document.getElementById('nowBtn'); if (!press(nb, () => nb.click())) nb && nb.click(); } }, 11000); });
    }
    const play = document.getElementById('play'), pads = [...document.querySelectorAll('.seq-row button[aria-pressed="false"]')];
    if (play && play.textContent.trim() === 'Play' && pads.length > 8) {
      const seq = document.querySelector('.seq'); if (!seq || !usable(seq)) return false;
      return press(seq, () => { const pick = pads.sort(() => Math.random() - 0.5).slice(0, 5);
        pick.forEach((b, i) => setTimeout(() => { b.click(); nudge(b); squash(0.3); chirp(1); }, i * 240));
        setTimeout(() => quip('Made you a beat. Press play.', 'happy', 1, 'beat', true), pick.length * 240 + 300); });
    }
    const stops = [...document.querySelectorAll('#stops button')];
    if (stops.length && Math.random() < 0.6) { const b = stops[Math.floor(Math.random() * stops.length)]; return press(b, () => { b.click(); setTimeout(() => quip('Tuned in.', 'wink', 0.5, 'tune', true), 500); }); }
    const cof = document.querySelector('.cof');
    if (cof && Math.random() < 0.25) return press(cof, () => { cof.click(); setTimeout(() => quip('One for me.', 'happy', 1, 'mycup'), 900); });
    return false;
  }
  // you start the time-lapse: Pixi comes to watch it with you
  const lbtn = document.getElementById('lapse');
  if (lbtn) lbtn.addEventListener('click', e => {
    if (!e.isTrusted) return;
    setTimeout(() => { if (lbtn.textContent.trim() !== 'Pause') return; const sky = document.getElementById('sky');
      if (!anchor && !seek && !run) visit(sky, 'watch');
      setTimeout(() => { if (lbtn.textContent.trim() === 'Pause') { secret('timelapse'); quip('Watch them turn.', 'happy', 1, 'turn', true); } }, 5000); }, 200);
  });

  /* ---------- a life of its own ---------- */
  (function blinks() { setTimeout(() => { if (!document.hidden) blink(Math.random() < 0.2); blinks(); }, 2200 + Math.random() * 3800); })();
  (function idle() {
    setTimeout(() => {
      idle();
      if (document.hidden || dragging || tucked || hidden || dancing || run || hang || hiddenFx || seek || (portrait && !portrait.done)) return;
      if (Math.random() < 0.05 && performance.now() - surpriseAt > 30000) { surpriseAt = performance.now(); if (tinker()) return; }
      const quiet = performance.now() - lastAct;
      if (quiet > (slot().sleepy ? 20000 : 45000)) return sleep();
      if (asleep) return;
      if (performance.now() - pointerAt < 2500) return;                               // you're moving; it's watching you
      const r = Math.random();
      if (anchor) { if (r < 0.3) shuffle(); else if (r < 0.5) { drop(); } else if (r < 0.62) visit(roamPick(), 'roam') || lookAround(); else if (r < 0.8) lookAround(); else muse(); return; }
      if (r < 0.14 && performance.now() - roamAt > 15000) { roam(); return; }
      if (r > 0.86 && r <= 0.94 && performance.now() - surpriseAt > 45000) return surprise();
      if (r > 0.94) return (mood === 'tired' ? yawn : Math.random() < 0.15 ? sneeze : Math.random() < 0.5 ? peekOut : stretch)();
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
    const R = slot().say, first = EMBED ? (CFG.hello || 'Hi! I’m ' + (CFG.name || 'Pixi') + '. Tap me.') : M.has('birthday') ? SAY.birthday : page === 'index' && R ? R[0] : pool()[0];
    if (say(first, { mood: M.has('latenight') ? 'tired' : 'happy' })) { hop(10); try { sessionStorage.setItem('br-pixi-' + page, '1'); } catch (e) {} }
  }, 7000);

  feel(baseMood(), 0); queue();
  setInterval(() => { if (mood === 'default' || mood === 'tired') feel(baseMood(), 0); queue(); }, 60000);
  BR.pixi = { center: () => ({ x: X.x + W / 2, y: floorTop() - floor - Y.x + H / 2, held: dragging, away: tucked || hidden || hiddenFx }) };   // for the spacetime grid
  window.__pixi = { flip, hideSeek, tinker, secret, drawPortrait, roam, visit, drop, say, perform, hangStart, eatDot, surprise, teleport, fireworks, sleep };                                        // handy from the console
})();
