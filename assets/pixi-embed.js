/* Pixi, embeddable. One line on any site:
     <script src="https://prageethbanuka.github.io/assets/pixi-embed.js" defer></script>
   Optional, before it:
     <script>window.pixiConfig = { name: 'Pixi', hello: 'Hi!', lines: ['…', '…'], sound: false };</script>
   Pixi by Banuka Rajapaksha · prageethbanuka.github.io/pixi.html */
(function () {
  if (window.__pixiEmbed) return; window.__pixiEmbed = true;
  const me = document.currentScript, base = me ? me.src.replace(/[^/]*$/, '') : 'https://prageethbanuka.github.io/assets/';
  const cfg = window.pixiConfig = Object.assign({}, window.pixiConfig || {}, { embed: true });
  const root = document.documentElement;

  // a small runtime, only if the page doesn't already have one: springs (damping ratio + response), helpers, storage
  if (!window.BR) {
    const RM = matchMedia('(prefers-reduced-motion: reduce)'), reduce = () => RM.matches;
    const active = new Set(); let running = false, last = 0;
    function frame(now) { const dt = Math.min(0.064, (now - last) / 1000 || 0.016); last = now; for (const s of [...active]) s.step(dt); if (active.size) requestAnimationFrame(frame); else running = false; }
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
        active.add(this); if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } return this;
      }
      step(dt) {
        const n = Math.ceil(dt * 240), h = dt / n;
        for (let i = 0; i < n; i++) { const a = -this.k * (this.x - this.target) - this.c * this.v; this.v += a * h; this.x += this.v * h; }
        const sc = Math.max(1, Math.abs(this.target));
        if (Math.abs(this.v) < 0.002 * sc && Math.abs(this.x - this.target) < 0.0005 * sc) { this.x = this.target; this.v = 0; active.delete(this); this.emit(); const d = this.done; this.done = null; d && d(); return; }
        this.emit();
      }
    }
    const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    let ctx = null;
    const ac = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); } if (ctx && ctx.state !== 'running') ctx.resume(); return ctx; };
    window.BR = {
      Spring, reduce, RM, store, ac,
      project: (v, d = 0.998) => (v / 1000) * d / (1 - d),
      rubber: (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o)),
      clamp: (x, a, b) => Math.min(b, Math.max(a, x)),
      tracker() { const h = []; return { add(p) { h.push({ p, t: performance.now() }); if (h.length > 6) h.shift(); }, vel() { if (h.length < 2) return 0; const a = h[0], b = h[h.length - 1], dt = (b.t - a.t) / 1000; return dt > 0 ? (b.p - a.p) / dt : 0; }, reset() { h.length = 0; } }; },
      sound: { on: !!cfg.sound }, blip() {}, noiseBuf(c, d) { const b = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; return b; },
    };
  }

  // colours and fonts: use the host's tokens if it has them, otherwise sensible light/dark defaults
  if (!getComputedStyle(root).getPropertyValue('--ink').trim()) {
    const st = document.createElement('style');
    st.textContent = `:root { --ink: #0B0E13; --ink-2: #434B57; --ink-3: #636B78; --bg: #F1F2EF; --line: rgba(11,14,19,.12); --accent: #D62F24; --screen: #0B0E13; --screen-ink: #E8EAE6;
        --f-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; --q: 156ms; --h: 312ms; --beat: 625ms; --ease-out: cubic-bezier(.16, 1, .3, 1); }
      @media (prefers-color-scheme: dark) { :root { --ink: #E8EAE6; --ink-2: #AEB5BF; --ink-3: #8A93A0; --bg: #0B0E13; --line: rgba(232,234,230,.13); --accent: #FF4A3D; --screen: #05070A; } }`;
    document.head.appendChild(st);
  }
  const go = () => { const s = document.createElement('script'); s.src = base + 'pixi.js'; s.defer = true; document.head.appendChild(s); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
  console.log('%c● Pixi%c by Banuka Rajapaksha · prageethbanuka.github.io/pixi.html', 'color:#D62F24;font-weight:600', 'color:inherit');
})();
