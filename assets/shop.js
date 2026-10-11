/* Shop: quiet ways to support the work. Each offer stays invisible until its link is filled in below. */
(function () {
  /* ======== paste your links here ======== */
  const SHOP = {
    coffee: 'https://ko-fi.com/E7N228L7DQ',      // Ko-fi, Buy Me a Coffee or GitHub Sponsors page, e.g. 'https://ko-fi.com/yourname'
    kits: '',        // Gumroad / Lemon Squeezy product for the campaign templates
    kitsPrice: '',   // shown on the button, e.g. '$12'
    prints: '',      // print-on-demand or download store for the Moon photographs
    pixi: '',        // Gumroad / Lemon Squeezy product for the Pixi licence
    pixiPrice: '',   // e.g. '$19'
    skyPrice: '',    // star map price next to the WhatsApp button, e.g. 'LKR 2,500'; empty shows 'Free for now'
  };
  /* ======================================= */

  const BR = window.BR; if (!BR || window.__shop) return; window.__shop = true; BR.shop = SHOP;
  const ext = (href, text, cls = '') => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const css = document.createElement('style');
  css.textContent = `
  .offer { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px 24px; align-items: center; margin-top: clamp(32px, 5vw, 56px); padding-top: 20px; border-top: 1px solid var(--line); }
  .offer p { margin: 4px 0 0; color: var(--ink-2); max-width: 52ch; }
  @media (max-width: 600px) { .offer { grid-template-columns: 1fr; } .offer .btn { justify-self: start; } }
  .sup-link { color: inherit; text-decoration: none; } .sup-link:hover { color: var(--ink); }`;
  document.head.appendChild(css);

  // coffee: a line in the footer, and an offer in the island after someone pours a refill (once per visit)
  if (SHOP.coffee) {
    document.querySelectorAll('[data-support]').forEach(dd => { dd.innerHTML = ext(SHOP.coffee, '☕ Buy me a real coffee ↗', 'sup-link'); });
    let offered = false; try { offered = !!sessionStorage.getItem('br-offer-coffee'); } catch (e) {}
    new MutationObserver(ms => {
      if (offered) return;
      for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('refill')) {
        offered = true; try { sessionStorage.setItem('br-offer-coffee', '1'); } catch (e) {}
        setTimeout(() => dispatchEvent(new CustomEvent('br-activity', { detail: { id: 'offer', icon: '☕', text: 'Enjoyed that? Buy me a real one', url: SHOP.coffee, cta: 'Buy a coffee' } })), 2600);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // design kits: under the poster wall
  const wall = document.getElementById('wall');
  if (SHOP.kits && wall) {
    const a = document.createElement('aside'); a.className = 'offer';
    a.innerHTML = `<div><span class="label">Campaign kit</span><p>The grid, type system and templates behind these campaigns, as editable files for your own events.</p></div>
      ${ext(SHOP.kits, `Get the kit${SHOP.kitsPrice ? ' · ' + SHOP.kitsPrice : ''} <span class="arr">↗</span>`, 'btn')}`;
    (document.getElementById('index') || wall).after(a);
  }

  // prints: in the Moon photograph's caption
  const cap = document.querySelector('.redphoto figcaption');
  if (SHOP.prints && cap) cap.insertAdjacentHTML('beforeend', ` · ${ext(SHOP.prints, 'Prints ↗', 'sup-link')}`);

  // Pixi: from its chapter on Engineering to the product page
  const src = document.querySelector('a[href*="pixi_eye_animation"]');
  if (SHOP.pixi && src) src.insertAdjacentHTML('afterend', `<a href="pixi.html">Put Pixi on your site →</a>`);
  document.querySelectorAll('[data-buy-pixi]').forEach(b => {
    if (SHOP.pixi) { b.href = SHOP.pixi; b.hidden = false; if (SHOP.pixiPrice) b.querySelector('[data-price]').textContent = ' · ' + SHOP.pixiPrice; }
  });
})();
