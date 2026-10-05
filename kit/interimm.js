// InterImm phase 2 kit · Water Hole: shared header, footer and small instruments.
//
// Source of truth: InterImm/interstellar, kit/. Published at
// https://interstellar.interimm.org/kit/interimm.js. See kit/README.md.
//
// Same hooks as the phase 1 kit (https://interimm.org/kit/interimm.js), so a page
// switches era by swapping its stylesheet and script links:
// 1. On a page that marks its header with `data-interimm-header` (and its footer
//    with `data-interimm-footer`), it replaces them with the phase 2 menu and
//    footer, read from nav.<lang>.json next to this script. The page's own
//    markup stays as the fallback if that fails. On the header: data-current names the
//    menu item of this page; data-site="Name" data-site-url="./" adds the site's own name
//    after the era's brand; data-width="full" spans the window (tools); data-lang-cn="" or
//    data-lang-en="" drops that language from the switch when the site has no such version.
//    data-width="full" works on the footer too.
// 2. On every page it wires up the header menu: the mobile toggle and one
//    dropdown open at a time. Without JavaScript the menu is always visible.
// 3. Instruments, phase 2 only:
//    <canvas data-waterfall>          a live waterfall spectrogram drawn in the theme's colours
//                                     (data-line="0.62" puts the signal at that fraction of the band,
//                                     data-line="" leaves only noise)
//    <time data-story-clock>          the story time (real time + 70,491 days), ticking; data-format is
//                                     "time" (default), "date" or "datetime"
//    <span data-days-since="2219-10-05T03:12:07Z">  whole days since a story instant, ticking
//    They are also on window.InterImm for pages that create them later.
(() => {
  document.documentElement.classList.add('js');
  const script = document.currentScript;
  const base = script ? new URL('.', script.src) : new URL('kit/', location.href);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const GITHUB_ICON = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.921.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';
  const MENU_ICON = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // ------------------------------------------------------------ header and footer

  const langUrl = (header, l) => header.getAttribute(`data-lang-${l.lang}`) || l.url;
  // data-lang-cn="" on the header means the site has no Chinese version: the switch is left out
  const hasLang = (header, l) => !(header && header.getAttribute(`data-lang-${l.lang}`) === '');
  const brand = (nav) => `<a class="brand" href="${esc(nav.home)}">${nav.logo ? `<img class="brand-mark" src="${esc(nav.logo)}" alt="" width="32" height="32">` : '<span class="brand-dot" aria-hidden="true"></span>'}<span class="brand-name">${esc(nav.title)}</span>${nav.subtitle ? `<span class="brand-sub">${esc(nav.subtitle)}</span>` : ''}</a>`;
  // a site of the family names itself after the era's brand: data-site="Exoplanet Explorer" data-site-url="./"
  const site = (host) => (host && host.dataset.site ? `<a class="brand-site" href="${esc(host.dataset.siteUrl || './')}">${esc(host.dataset.site)}</a>` : '');
  const wrapClass = (host) => (host && host.dataset.width === 'full' ? 'wrap-full' : 'wrap');

  const renderHeader = (header, nav, current) => {
    const link = (item) => `<a href="${esc(item.url)}"${item.id === current ? ' aria-current="page"' : ''}>${esc(item.name)}</a>`;
    const items = nav.menu.map((item) => {
      if (item.children && item.children.length) {
        const open = item.children.some((c) => c.id === current) ? ' data-current' : '';
        return `<li class="nav-item"><details class="dropdown"${open}><summary>${esc(item.name)}</summary><ul class="dropdown-menu">${item.children.map((c) => `<li>${link(c)}</li>`).join('')}</ul></details></li>`;
      }
      return `<li class="nav-item">${link(item).replace('<a ', '<a class="nav-link" ')}</li>`;
    }).join('');
    const langs = nav.languages.filter((l) => hasLang(header, l)).map((l) => `<a class="nav-link lang-link" href="${esc(langUrl(header, l))}" hreflang="${esc(l.code)}" lang="${esc(l.code)}"><span class="sr-only">${esc(nav.labels.language)}: </span>${esc(l.name)}</a>`).join('');
    return `<div class="${wrapClass(header)} header-inner">
      ${brand(nav)}${site(header)}
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="sr-only">${esc(nav.labels.menu)}</span>${MENU_ICON}</button>
      <nav id="site-nav" class="site-nav" aria-label="${esc(nav.labels.menu)}">
        <ul class="nav-list">${items}</ul>
        <ul class="nav-list nav-tools">
          <li class="nav-item"><a class="nav-link" href="${esc(nav.github)}" rel="noopener">${GITHUB_ICON}<span class="nav-github-label">GitHub</span></a></li>
          ${langs ? `<li class="nav-item">${langs}</li>` : ''}
        </ul>
      </nav>
    </div>`;
  };

  const renderFooter = (nav, footer) => `<div class="${wrapClass(footer)}">
      <div class="footer-brand">
        ${brand(nav)}
        <p class="kicker">${esc(nav.labels.kicker)}</p>
      </div>
      <div class="footer-grid">${nav.footer.map((col) => `<section class="footer-col"><h2>${esc(col.title)}</h2>${col.description ? `<p>${esc(col.description)}</p>` : ''}<ul>${col.links.map((l) => `<li><a href="${esc(l.url)}">${esc(l.title)}</a></li>`).join('')}</ul></section>`).join('')}</div>
      <p class="footer-legal"><span>© ${new Date().getFullYear()} ${esc(nav.author)}</span><a href="#">${esc(nav.labels.backToTop)} ↑</a></p>
    </div>`;

  const initMenu = () => {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    const dropdowns = Array.from(document.querySelectorAll('.dropdown'));

    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };

    if (toggle && nav) {
      toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
      // close the mobile menu after following an in-page link
      nav.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) setMenu(false); });
    }

    const closeDropdowns = (except) => dropdowns.forEach((d) => { if (d !== except) d.open = false; });
    dropdowns.forEach((d) => d.addEventListener('toggle', () => { if (d.open) closeDropdowns(d); }));
    document.addEventListener('click', (e) => { if (!e.target.closest('.dropdown')) closeDropdowns(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = dropdowns.find((d) => d.open);
      closeDropdowns();
      if (open) open.querySelector('summary').focus();
      else if (toggle && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
  };

  // ------------------------------------------------------------ instruments

  const STORY_OFFSET_MS = 70491 * 86400e3; // story time = real time + 70,491 days
  const storyNow = () => new Date(Date.now() + STORY_OFFSET_MS);
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rgb = (value) => {
    const v = value.trim();
    let m = v.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (m) return m.slice(1).map((h) => parseInt(h, 16));
    m = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (m) return m.slice(1).map((h) => parseInt(h + h, 16));
    m = v.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);
    return m ? m.slice(1, 4).map(Number) : [128, 128, 128];
  };

  // A waterfall: each new row is one spectrum, older rows scroll down. Noise in the beam colour,
  // a narrow pulsed line in the signal colour. Colours are read from CSS so it follows the theme.
  const waterfalls = new Set();
  function waterfall(canvas, opts = {}) {
    if (canvas._wf) return canvas._wf;
    const ctx = canvas.getContext('2d');
    const lineAttr = opts.line ?? canvas.dataset.line;
    const line = lineAttr === '' ? null : Number(lineAttr ?? 0.62);
    const period = Number(opts.period ?? canvas.dataset.period ?? 23); // rows per on/off cycle
    const duty = Number(opts.duty ?? canvas.dataset.duty ?? 9);
    let colours, row = 0, timer = null;
    const readColours = () => {
      const s = getComputedStyle(canvas);
      colours = { bg: rgb(s.getPropertyValue('--scope') || '#000'), noise: rgb(s.getPropertyValue('--noise')), hot: rgb(s.getPropertyValue('--signal')) };
    };
    const size = () => {
      const w = Math.max(64, Math.round(canvas.clientWidth / 2));
      const h = Math.max(32, Math.round(canvas.clientHeight / 2));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; for (let i = 0; i < h; i++) step(); }
    };
    const step = () => {
      const W = canvas.width, H = canvas.height;
      const img = ctx.createImageData(W, 1);
      const on = line !== null && (row % period) < duty;
      const drift = Math.sin(row / 40) * 0.6;
      for (let x = 0; x < W; x++) {
        const v = Math.random() ** 3 * 0.5;
        const sig = on ? Math.exp(-(((x - W * line - drift) / 1.6) ** 2)) * 0.95 : 0;
        const col = sig > 0.2 ? colours.hot : colours.noise;
        const t = Math.min(1, v + sig);
        const i = x * 4;
        for (let k = 0; k < 3; k++) img.data[i + k] = colours.bg[k] + (col[k] - colours.bg[k]) * t;
        img.data[i + 3] = 255;
      }
      ctx.drawImage(canvas, 0, 0, W, H - 1, 0, 1, W, H - 1);
      ctx.putImageData(img, 0, 0);
      row++;
    };
    readColours(); size();
    const api = {
      redraw() { readColours(); for (let i = 0; i < canvas.height; i++) step(); },
      start() { if (!timer && !reduceMotion()) timer = setInterval(step, 90); },
      stop() { clearInterval(timer); timer = null; },
      resize: size,
    };
    canvas._wf = api;
    waterfalls.add(api);
    // only animate while visible
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => (e.isIntersecting ? api.start() : api.stop())).observe(canvas);
    else api.start();
    return api;
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => waterfalls.forEach((w) => w.redraw()));
  addEventListener('resize', () => waterfalls.forEach((w) => w.resize()));

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d, format) => {
    const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    return format === 'date' ? date : format === 'datetime' ? `${date} ${time} UTC` : `${time} UTC`;
  };
  const tickers = [];
  function storyClock(el) {
    const f = el.dataset.format || 'time';
    tickers.push(() => { const d = storyNow(); el.textContent = fmt(d, f); if (el.tagName === 'TIME') el.dateTime = d.toISOString(); });
  }
  function daysSince(el) {
    const t0 = Date.parse(el.dataset.daysSince);
    tickers.push(() => { el.textContent = Math.max(0, Math.floor((storyNow() - t0) / 86400e3)).toLocaleString(document.documentElement.lang || undefined); });
  }

  window.InterImm = Object.assign(window.InterImm || {}, { kit: 'phase2', STORY_OFFSET_MS, storyNow, waterfall, storyClock, daysSince });

  const initInstruments = () => {
    document.querySelectorAll('canvas[data-waterfall]').forEach((c) => waterfall(c));
    document.querySelectorAll('[data-story-clock]').forEach(storyClock);
    document.querySelectorAll('[data-days-since]').forEach(daysSince);
    const tick = () => tickers.forEach((t) => t());
    tick();
    if (tickers.length) setInterval(tick, 1000);
  };

  // ------------------------------------------------------------ start

  const start = () => {
    initInstruments();
    const header = document.querySelector('[data-interimm-header]');
    const footer = document.querySelector('[data-interimm-footer]');
    if (!header && !footer) { initMenu(); return; }

    const host = header || footer;
    const lang = host.dataset.lang || (document.documentElement.lang.toLowerCase().startsWith('zh') ? 'cn' : 'en');
    fetch(new URL(`nav.${lang}.json`, base))
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((nav) => {
        if (header) header.innerHTML = renderHeader(header, nav, header.dataset.current);
        if (footer) footer.innerHTML = renderFooter(nav, footer);
      })
      .catch(() => { /* keep the page's own fallback markup */ })
      .finally(initMenu);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
