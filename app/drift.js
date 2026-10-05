// Drift: the Sun and Ross 128 relative to each other, from the Bronze Age to 150,000 years from now.
// The physics is in lib/drift.js; this file draws it in the kit's pixel style (square marks, straight
// lines, colours read from CSS) and keeps the slider, the readouts and the charts in step.
import { at, closestApproach, transitZoneCrossings, yearAtDistance, TRANSIT_ZONE } from '../lib/drift.js';
import { storyNow, YEAR_MS } from '../lib/light.js';

const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const nf = (n, d = 0) => n.toLocaleString(zh ? 'zh-CN' : 'en', { maximumFractionDigits: d, minimumFractionDigits: d });

const num = (n) => (n < 10000 ? String(n) : nf(n));

// story "now" as a decimal year; the stars move on real time, the story calendar just runs 193 years ahead
const NOW = (() => { const d = storyNow(); const y = d.getUTCFullYear(); return y + (d - Date.UTC(y, 0, 1)) / YEAR_MS; })();

const NOW_Y = Math.floor(NOW); // the story year we are in

const RANGES = {
  history: { from: -2499, to: 4500, step: 1, tick: 1000, play: 20 },
  deep: { from: -49999, to: 150000, step: 50, tick: 25000, play: 600 },
};

// tick years that read as round calendar years: 2000 BCE is astronomical -1999
function ticks(r) {
  const out = [];
  for (let k = Math.ceil(r.from / r.tick); k * r.tick <= r.to; k++) {
    const t = k > 0 ? k * r.tick : 1 + k * r.tick;
    if (k !== 0 && t >= r.from && t <= r.to) out.push(t);
  }
  return out;
}

const CLOSEST = closestApproach();
const ZONE = transitZoneCrossings(-20000, 20000);
const ZONE_IN = ZONE.find((z) => z.enters)?.year;
const ZONE_OUT = ZONE.find((z) => !z.enters)?.year;
const BACK_TO_NOW = yearAtDistance(at(NOW).dist, CLOSEST.year, 1);

const T = zh ? {
  year: (y) => (y <= 0 ? `公元前 ${num(1 - y)} 年` : `${num(y)} 年`),
  yearShort: (y) => (y <= 0 ? `前${num(1 - y)}` : num(y)),
  ly: (v, d = 2) => `${nf(v, d)} 光年`, yr: (v, d = 2) => `${nf(v, d)} 年`,
  approaching: (v) => `靠近 ${nf(v, 1)} km/s`, receding: (v) => `远离 ${nf(v, 1)} km/s`,
  mag: (m) => `${nf(m, 2)} 等`, deg: (d) => `${d >= 0 ? '+' : '−'}${nf(Math.abs(d), 3)}°`,
  yes: '能', no: '不能', yearsAgo: (n) => `${nf(n)} 年前`, yearsFrom: (n) => `${nf(n)} 年后`,
  arrives: (y) => `${T.yearShort(Math.floor(y))} 年`,
  tick: (y) => { const n = y <= 0 ? 1 - y : y; const t = n >= 10000 ? `${n / 10000}万` : String(n); return y <= 0 ? `前${t}` : t; },
  top: '俯视 · 黄道面', side: '侧视 · 地球轨道平面成一条线', exag: (n) => `纵向放大 ${n} 倍`,
  sq: (n) => `每格 ${nf(n)} 光年`, now: '现在', closest: '最近', play: '播放', pause: '暂停',
  capMap: (s) => `${T.year(Math.round(s.year))} · ${T.ly(s.dist)}`,
  cap: (r) => `${T.yearShort(r.from)} → ${T.yearShort(r.to)}`,
  zone: '能看到地球凌日',
  moments: [
    [ZONE_IN, '他们开始看到地球凌日', (y) => `罗斯128进入地球凌日带。从那里看，地球每年一次从太阳面前经过，亮度下降约百万分之八十四，最长持续约十三个小时。在他们的天空里，我们第一次有了影子。`],
    [ZONE_OUT, '最后一次凌日', (y) => `罗斯128离开凌日带。那以后，他们再也看不到地球从太阳前经过。他们最后看见的，是${T.year(Math.round(y))}前后的地球。`],
    [NOW_Y, '现在', (y) => `相距 ${T.ly(at(y).dist, 3)}。今天发出的信，${T.arrives(NOW + at(NOW).dist)}到达。`],
    [CLOSEST.year, '最近的时候', (y) => `${T.ly(CLOSEST.dist)}，比今天近四成。一问一答只要 ${T.yr(2 * CLOSEST.dist, 1)}。我们的太阳在他们天空里亮到 ${T.mag(CLOSEST.sunMag)}，和我们看天津四差不多；他们的星从这里看仍然不用望远镜就看不见。`],
    [BACK_TO_NOW, '又回到今天的距离', (y) => `然后它越过我们，远去。到这一年，两颗星又相隔 ${T.ly(at(NOW).dist)}。`],
  ],
} : {
  year: (y) => `${T.yearShort(y)} ${y <= 0 ? '' : 'CE'}`.replace(/ $/, ''),
  yearShort: (y) => { const n = y <= 0 ? 1 - y : y; const t = n < 10000 ? String(n) : nf(n); return y <= 0 ? `${t} BCE` : t; },
  ly: (v, d = 2) => `${nf(v, d)} ly`, yr: (v, d = 2) => `${nf(v, d)} yr`,
  approaching: (v) => `${nf(v, 1)} km/s closer`, receding: (v) => `${nf(v, 1)} km/s apart`,
  mag: (m) => `mag ${nf(m, 2)}`, deg: (d) => `${d >= 0 ? '+' : '−'}${nf(Math.abs(d), 3)}°`,
  yes: 'Yes', no: 'No', yearsAgo: (n) => `${nf(n)} years ago`, yearsFrom: (n) => `${nf(n)} years`,
  arrives: (y) => T.yearShort(Math.floor(y)),
  tick: (y) => { const n = y <= 0 ? 1 - y : y; const t = n >= 10000 ? `${n / 1000}k` : String(n); return y <= 0 ? `${t} BCE` : t; },
  top: 'from above · ecliptic plane', side: 'edge-on · Earth\'s orbit seen as a line', exag: (n) => `height ×${n}`,
  sq: (n) => `1 square = ${nf(n)} ly`, now: 'now', closest: 'closest', play: 'Play', pause: 'Pause',
  capMap: (s) => `${T.year(Math.round(s.year))} · ${T.ly(s.dist)}`,
  cap: (r) => `${T.yearShort(r.from)} → ${T.yearShort(r.to)}`,
  zone: 'Earth transits visible',
  moments: [
    [ZONE_IN, 'They start to see us pass', () => `Ross 128 drifts into the Earth transit zone. From there, Earth crosses the Sun once a year, dimming it by about 84 parts per million for up to thirteen hours. In their sky, we have a shadow.`],
    [ZONE_OUT, 'The last transit', (y) => `Ross 128 drifts out of the zone and Earth's transits stop. The last Earth they saw cross the Sun was the Earth of about ${T.year(Math.round(y))}.`],
    [NOW_Y, 'Now', (y) => `${T.ly(at(y).dist, 3)} apart. A letter sent today arrives in ${T.arrives(NOW + at(NOW).dist)}.`],
    [CLOSEST.year, 'Closest', () => `${T.ly(CLOSEST.dist)}, about 40% nearer than today. A question and its answer take ${T.yr(2 * CLOSEST.dist, 1)}. Our Sun shines at ${T.mag(CLOSEST.sunMag)} in their sky, about as bright as Deneb is to us; their star is still too faint to see from here without a telescope.`],
    [BACK_TO_NOW, 'Back to today\'s distance', () => `Then it passes us by and recedes. In this year the two stars are ${T.ly(at(NOW).dist)} apart again.`],
  ],
};

// ------------------------------------------------------------------ state

let range = 'history';
let year = NOW_Y;
let playing = null;
const slider = $('#year');

function setRange(name) {
  range = name;
  const r = RANGES[name];
  $$('[data-range]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.range === name)));
  slider.min = r.from; slider.max = r.to; slider.step = r.step;
  year = Math.min(r.to, Math.max(r.from, year));
  slider.value = year;
  $$('.drift-range-cap').forEach((el) => { el.textContent = T.cap(r); });
  draw();
}

function setYear(y) {
  const r = RANGES[range];
  if (y < r.from || y > r.to) setRange(y < RANGES.history.from || y > RANGES.history.to ? 'deep' : 'history');
  year = y; slider.value = Math.round(y);
  draw();
}

// ------------------------------------------------------------------ canvas helpers

function prep(canvas) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const s = getComputedStyle(canvas);
  const col = (v) => s.getPropertyValue(v).trim();
  ctx.font = `11px ${col('--font-mono') || 'monospace'}`;
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H, col };
}
const px = (v) => Math.round(v) + 0.5; // crisp 1px lines
const square = (ctx, x, y, size, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size); };

// ------------------------------------------------------------------ map, seen from above the ecliptic

function drawMap() {
  const canvas = $('#map');
  const { ctx, W, H, col } = prep(canvas);
  const r = RANGES[range];
  const a = at(r.from), b = at(r.to), s = at(year);
  // fit the Sun and the whole path, with a margin
  const xs = [0, a.pos[0], b.pos[0]], ys = [0, a.pos[1], b.pos[1]];
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.25 || 1;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const k = Math.min(W, H) / span;
  const X = (x) => W / 2 + (x - cx) * k, Y = (y) => H / 2 - (y - cy) * k; // y up

  // grid: 1 ly, or 5 ly when that gets too dense
  const cell = k >= 14 ? 1 : 5;
  ctx.strokeStyle = col('--plot-grid'); ctx.lineWidth = 1; ctx.beginPath();
  for (let g = Math.floor((cx - W / 2 / k) / cell) * cell; X(g) < W; g += cell) { ctx.moveTo(px(X(g)), 0); ctx.lineTo(px(X(g)), H); }
  for (let g = Math.floor((cy - H / 2 / k) / cell) * cell; Y(g) > 0; g += cell) { ctx.moveTo(0, px(Y(g))); ctx.lineTo(W, px(Y(g))); }
  ctx.stroke();
  $('#map-cap').textContent = T.sq(cell);

  // the path, with a tick every r.tick years
  ctx.strokeStyle = col('--plot-axis'); ctx.beginPath(); ctx.moveTo(X(a.pos[0]), Y(a.pos[1])); ctx.lineTo(X(b.pos[0]), Y(b.pos[1])); ctx.stroke();
  ctx.fillStyle = col('--muted'); ctx.textBaseline = 'middle';
  const tk = ticks(r);
  tk.forEach((t, i) => {
    const p = at(t).pos;
    square(ctx, X(p[0]), Y(p[1]), 3, col('--plot-axis'));
    // label every tick only when they are far enough apart; otherwise just the two ends
    const far = Math.hypot(...[0, 1].map((j) => (at(tk[1] ?? t).pos[j] - at(tk[0]).pos[j]) * k)) > 48;
    if (!far && i !== 0 && i !== tk.length - 1) return;
    ctx.fillStyle = col('--muted'); ctx.textAlign = 'left';
    ctx.fillText(T.yearShort(t), X(p[0]) + 6, Y(p[1]) + (i === 0 && !far ? -10 : 16));
  });

  // line of sight, dashed, and the two stars
  ctx.setLineDash([4, 4]); ctx.strokeStyle = col('--them'); ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(s.pos[0]), Y(s.pos[1])); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  square(ctx, X(0), Y(0), 10, col('--us'));
  square(ctx, X(s.pos[0]), Y(s.pos[1]), 8, col('--them'));
  if (CLOSEST.year >= r.from && CLOSEST.year <= r.to) {
    const c = CLOSEST.pos; ctx.strokeStyle = col('--them'); ctx.strokeRect(px(X(c[0]) - 6), px(Y(c[1]) - 6), 12, 12);
  }
  ctx.fillStyle = col('--us'); ctx.textAlign = 'left'; ctx.fillText(zh ? '太阳' : 'Sun', X(0) + 10, Y(0) + 14);
  ctx.fillStyle = col('--them'); ctx.fillText(zh ? '罗斯128' : 'Ross 128', X(s.pos[0]) + 10, Y(s.pos[1]) + 14);
  $('#map-title').textContent = T.top;
  $('#map').setAttribute('aria-label', `${T.top}: ${T.capMap(s)}`);
}

// ------------------------------------------------------------------ side view, for recorded history
// Seen edge-on, Earth's orbit is a line and the transit zone is a thin wedge opening from the Sun. Over a few
// thousand years Ross 128 barely moves on the map above, but it crosses that wedge, so history gets this view.

function drawSide() {
  const canvas = $('#map');
  const { ctx, W, H, col } = prep(canvas);
  const r = RANGES[range];
  const rho = (p) => Math.hypot(p[0], p[1]);
  const pts = [at(r.from), at(r.to)];
  const zMax = Math.max(...pts.map((q) => Math.abs(q.pos[2]))) * 1.3;
  const rMax = Math.max(...pts.map((q) => rho(q.pos))) * 1.08;
  const L = 24, R = 16;
  const kx = (W - L - R) / rMax, ky = (H / 2 - 24) / zMax;
  const X = (v) => L + v * kx, Y = (z) => H / 2 - z * ky;

  // grid every ly across, and the plane of Earth's orbit
  ctx.strokeStyle = col('--plot-grid'); ctx.lineWidth = 1; ctx.beginPath();
  for (let g = 1; g < rMax; g++) { ctx.moveTo(px(X(g)), 0); ctx.lineTo(px(X(g)), H); }
  ctx.stroke();
  ctx.strokeStyle = col('--plot-axis'); ctx.beginPath(); ctx.moveTo(L, px(Y(0))); ctx.lineTo(W, px(Y(0))); ctx.stroke();

  // the transit zone: from inside it, Earth crosses the Sun
  const t = Math.tan(TRANSIT_ZONE * Math.PI / 180);
  ctx.fillStyle = col('--us-soft'); ctx.beginPath();
  ctx.moveTo(X(0), Y(0)); ctx.lineTo(W, Y(t * (W - L) / kx)); ctx.lineTo(W, Y(-t * (W - L) / kx)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col('--us'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(T.zone, X(rMax * 0.12), Y(-t * rMax * 0.5) + 6);

  // the path through history, ticked, and the chosen year
  const a = pts[0].pos, b = pts[1].pos;
  ctx.strokeStyle = col('--them'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(rho(a)), Y(a[2])); ctx.lineTo(X(rho(b)), Y(b[2])); ctx.stroke(); ctx.lineWidth = 1;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const ty of ticks(r)) {
    const p = at(ty).pos;
    square(ctx, X(rho(p)), Y(p[2]), 4, col('--them'));
    ctx.fillStyle = col('--muted'); ctx.fillText(T.yearShort(ty), X(rho(p)) - 10, Y(p[2]));
  }
  const s = at(year);
  square(ctx, X(0), Y(0), 10, col('--us'));
  square(ctx, X(rho(s.pos)), Y(s.pos[2]), 10, col('--text'));
  ctx.textAlign = 'left'; ctx.fillStyle = col('--us'); ctx.textBaseline = 'top'; ctx.fillText(zh ? '太阳' : 'Sun', X(0) - 4, Y(0) + 10);
  ctx.fillStyle = col('--text'); ctx.textBaseline = 'middle'; ctx.fillText(T.year(Math.round(year)), Math.min(W - 90, X(rho(s.pos)) + 10), Y(s.pos[2]) - 14);
  $('#map-cap').textContent = T.exag(Math.round(ky / kx));
  $('#map-title').textContent = T.side;
  $('#map').setAttribute('aria-label', `${T.side}: ${T.capMap(s)}`);
}

// ------------------------------------------------------------------ charts against time

function chart(canvas, f, { band, floor0 = false, fmt = (v) => nf(v, 1), marks = [] }) {
  const { ctx, W, H, col } = prep(canvas);
  const r = RANGES[range];
  const L = 58, R = 10, Tp = 12, B = 22;
  const N = Math.max(60, Math.floor(W - L - R));
  const vals = Array.from({ length: N + 1 }, (_, i) => f(r.from + ((r.to - r.from) * i) / N));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (band) { lo = Math.min(lo, -band * 1.6); hi = Math.max(hi, band * 1.6); }
  if (floor0) lo = 0;
  const pad = (hi - lo) * 0.08 || 1; lo -= floor0 ? 0 : pad; hi += pad;
  const X = (t) => L + ((t - r.from) / (r.to - r.from)) * (W - L - R);
  const Y = (v) => Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B);

  // the transit zone band, in our colour: it is about seeing us
  if (band) {
    ctx.fillStyle = col('--us-soft'); ctx.fillRect(L, Y(band), W - L - R, Y(-band) - Y(band));
    ctx.fillStyle = col('--us'); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(T.zone, L + 4, Y(-band) + 3);
  }
  // axes and labels
  ctx.strokeStyle = col('--plot-axis'); ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(px(L), Tp); ctx.lineTo(px(L), H - B); ctx.lineTo(W - R, px(H - B)); ctx.stroke();
  ctx.fillStyle = col('--muted'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [hi - pad, (hi + lo) / 2, lo + (floor0 ? 0 : pad)].forEach((v) => ctx.fillText(fmt(v).replace('-', '−'), L - 6, Y(v)));
  ctx.textBaseline = 'alphabetic';
  const every = (W - L - R) * r.tick / (r.to - r.from) < 70 ? 2 : 1; // thin the labels on narrow screens
  for (const [i, t] of ticks(r).entries()) {
    if (i % every) continue;
    ctx.textAlign = 'center'; ctx.fillText(T.tick(t), Math.min(W - 24, Math.max(L + 20, X(t))), H - 6);
  }
  // the curve, drawn as a staircase of pixels
  ctx.strokeStyle = col('--them'); ctx.lineWidth = 2; ctx.beginPath();
  vals.forEach((v, i) => { const x = L + i, y = Math.round(Y(v)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke(); ctx.lineWidth = 1;
  // marks: now, closest, and the chosen year
  for (const m of marks) {
    if (m.t < r.from || m.t > r.to) continue;
    square(ctx, X(m.t), Y(f(m.t)), 6, col(m.color));
    ctx.fillStyle = col(m.color); ctx.textAlign = X(m.t) > W - 60 ? 'right' : 'left'; ctx.fillText(m.label, X(m.t) + (X(m.t) > W - 60 ? -6 : 6), Y(f(m.t)) - 8);
  }
  ctx.strokeStyle = col('--plot-dim'); ctx.beginPath(); ctx.moveTo(px(X(year)), Tp); ctx.lineTo(px(X(year)), H - B); ctx.stroke();
  square(ctx, X(year), Y(f(year)), 8, col('--text'));
}

// ------------------------------------------------------------------ readouts

function readouts() {
  const s = at(year);
  $('#year-out').textContent = T.year(Math.round(year));
  $('#r-dist').textContent = T.ly(s.dist, 3);
  $('#r-delay').textContent = T.yr(s.dist);
  $('#r-round').textContent = T.arrives(year + 2 * s.dist);
  $('#r-rv').textContent = s.radialKms < 0 ? T.approaching(-s.radialKms) : T.receding(s.radialKms);
  $('#r-sun').textContent = T.mag(s.sunMag);
  $('#r-star').textContent = T.mag(s.starMag);
  $('#r-lat').textContent = T.deg(s.lat);
  const tr = $('#r-transit'); tr.textContent = s.seesEarthTransit ? T.yes : T.no; tr.classList.toggle('is-yes', s.seesEarthTransit);
}

function draw() {
  readouts();
  range === 'history' ? drawSide() : drawMap();
  const marks = [{ t: NOW, label: T.now, color: '--us' }, { t: CLOSEST.year, label: T.closest, color: '--them' }];
  chart($('#chart-dist'), (t) => at(t).dist, { floor0: range === 'deep', fmt: (v) => nf(v, range === 'deep' ? 1 : 2), marks });
  chart($('#chart-lat'), (t) => at(t).lat, { band: TRANSIT_ZONE, fmt: (v) => `${nf(v, 2)}°`, marks });
}

// ------------------------------------------------------------------ hero and moments

function hero() {
  const s = at(NOW);
  $('#now-dist').textContent = T.ly(s.dist, 3);
  $('#now-rv').textContent = `${nf(-s.radialKms, 1)} km/s`;
  $('#now-closest').textContent = T.yearsFrom(Math.round((CLOSEST.year - NOW) / 100) * 100);
  $('#now-lost').textContent = T.yearsAgo(Math.round((NOW - ZONE_OUT) / 10) * 10);
  $('#moments-list').innerHTML = T.moments.filter(([y]) => y != null).map(([y, title, text], i) => `
    <li class="${y === NOW_Y ? 'is-out' : i === 1 || i === 3 ? 'is-key' : ''}">
      <time>${T.year(Math.round(y))}</time>
      <h3><a href="#model" data-jump="${y}">${title}</a></h3>
      <p>${text(y)}</p>
    </li>`).join('');
}

// ------------------------------------------------------------------ wiring

slider.addEventListener('input', () => { year = Number(slider.value); draw(); });
$$('[data-range]').forEach((b) => b.addEventListener('click', () => setRange(b.dataset.range)));
$('#to-now').addEventListener('click', () => setYear(NOW_Y));
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-jump]');
  if (a) setYear(Math.round(Number(a.dataset.jump)));
});

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function stop() { clearInterval(playing); playing = null; $('#play').textContent = T.play; $('#play').setAttribute('aria-pressed', 'false'); }
$('#play').addEventListener('click', () => {
  if (playing) return stop();
  const r = RANGES[range];
  if (year >= r.to) year = r.from;
  $('#play').textContent = T.pause; $('#play').setAttribute('aria-pressed', 'true');
  // steps, not easing: about 12 frames a second, like the rest of the kit
  playing = setInterval(() => {
    year = Math.min(r.to, year + r.play * (reduced ? 10 : 1));
    slider.value = year; draw();
    if (year >= r.to) stop();
  }, reduced ? 1000 : 83);
});

let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(draw, 100); });

hero();
setRange('history');
