// Draw the link-preview card (1200×630) of every page from its own <title> and description, and write
// images/og/<page>.png. Needs Playwright with Chromium:  node scripts/og_cards.cjs
// Re-run after changing a page title or description, then commit the PNGs.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const pages = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === 'kit') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name === 'index.html') pages.push(path.relative(ROOT, p));
  }
})(ROOT);

const slug = (rel) => ({ '.': 'home', en: 'home-en' })[path.dirname(rel)] || path.dirname(rel).replace(/\//g, '-');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const font = (f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'kit/fonts', f)).toString('base64')})`;

// the duet: their pulse train in ice, ours in gold, in step, one slow slip, in step again
function duet() {
  let s = '';
  for (let i = 0; i < 46; i++) {
    const x = 60 + i * 24;
    const slip = Math.max(0, Math.min(1, (i - 16) / 14)) * 24;
    s += `<rect x="${x}" y="16" width="6" height="22" fill="#9ff8ff"/><rect x="${x + slip}" y="50" width="6" height="22" fill="#ffd84a"/>`;
  }
  return `<svg width="1200" height="90" viewBox="0 0 1200 90">${s}</svg>`;
}

function card(rel) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const en = /<html lang="en"/.test(html);
  const [title, site] = html.match(/<title>([^<]+)<\/title>/)[1].split(' | ');
  const desc = (html.match(/name="description" content="([^"]+)"/) || [])[1] || '';
  const url = 'interstellar.interimm.org/' + (path.dirname(rel) === '.' ? '' : path.dirname(rel) + '/');
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Pixelify; src: ${font('pixelify-sans.woff2')}; }
    @font-face { font-family: Instrument; src: ${font('instrument-sans.woff2')}; font-weight: 400 700; }
    @font-face { font-family: Mono; src: ${font('jetbrains-mono.woff2')}; }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: #0d1457; color: #fff; font-family: Instrument, "WenQuanYi Zen Hei", sans-serif; position: relative; overflow: hidden; }
    .top { position: absolute; left: 0; right: 0; top: 0; height: 120px; background: #070b38; border-bottom: 4px solid #fff; display: flex; align-items: center; padding: 0 64px; gap: 22px; }
    .mark { display: flex; gap: 10px; align-items: center; } .mark i { display: block; }
    .site { font: 700 40px Instrument, "WenQuanYi Zen Hei", sans-serif; } .year { font: 28px Mono, monospace; color: #d0d5f7; }
    h1 { position: absolute; left: 64px; right: 64px; top: 170px; font: 700 ${en ? 74 : 72}px/1.12 ${en ? 'Instrument' : '"WenQuanYi Zen Hei"'}, sans-serif; }
    p { position: absolute; left: 64px; right: 64px; top: ${en ? 270 : 268}px; font-size: 30px; line-height: 1.5; color: #d0d5f7; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .duet { position: absolute; left: 0; bottom: 70px; } .url { position: absolute; left: 64px; bottom: 26px; font: 24px Mono, monospace; color: #9ff8ff; }
  </style><div class="top"><span class="mark"><i style="width:34px;height:34px;background:#ffd84a"></i><i style="width:10px;height:10px;background:#d0d5f7"></i><i style="width:34px;height:34px;background:#9ff8ff"></i></span>
  <span class="site">${esc(en ? 'The Contact Era' : '通联纪')}</span><span class="year">2219</span></div>
  <h1>${esc(title === site ? (en ? 'The Contact Era' : '通联纪') : title)}</h1><p>${esc(desc)}</p><div class="duet">${duet()}</div><div class="url">${esc(url)}</div>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const rel of pages) {
    await page.setContent(card(rel), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(ROOT, 'images/og', `${slug(rel)}.png`) });
    console.log(slug(rel));
  }
  await browser.close();
})();
