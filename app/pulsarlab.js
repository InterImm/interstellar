// Pulsar lab: a lighthouse, two kinds of frequency, a simulated observatory and the tools astronomers use
// to find a pulsar in noise. The physics is in lib/pulsarlab.js; this file draws it in the kit's style and
// keeps the controls, readouts and sound in step. Nothing runs on a server.
import {
  rotate, PULSARS, byId, mystery, BANDS, TELESCOPES, telescope as telOf, canSee, setup, stream, foldCube, reduce,
  snr, noise, dmCurve, periodCurve, timeSeries, powerSpectrum, sound, flux, spectralIndex, profileTable, lookup, delay, scatter, tsys,
} from '../lib/pulsarlab.js';

const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const nf = (n, d = 0) => n.toLocaleString(zh ? 'zh-CN' : 'en', { maximumFractionDigits: d, minimumFractionDigits: d });
const sig = (n, k = 3) => { if (!isFinite(n) || n === 0) return '0'; const d = Math.max(0, k - 1 - Math.floor(Math.log10(Math.abs(n)))); return nf(n, Math.min(d, 9)); };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const FLUXES = await fetch(new URL('../lib/pulsar-fluxes.json', import.meta.url)).then((r) => r.json()).then((d) => d.fluxes).catch(() => ({}));

// ------------------------------------------------------------------ words

const NOTES = {
  'J1909-3744': ['计时阵列里最稳的钟之一。罗斯128 b 的二重唱跟的就是它的节拍。它有一颗白矮星伴星，1.53 天绕一圈。', 'One of the steadiest clocks in the pulsar timing arrays, and the beat Ross 128 b\'s duet keeps. A white dwarf circles it every 1.53 days.'],
  'J0835-4510': ['船帆座脉冲星，南天最亮的一颗，约一万一千岁。它偶尔会“自转突变”，一瞬间转快一点点。', 'The Vela pulsar, the brightest in the southern sky, about 11,000 years old. Now and then it glitches: in an instant it spins up a little.'],
  'J0534+2200': ['蟹状星云里的中子星，1054 年那颗超新星留下的。宋代的天文官记下过那颗“客星”。它会发出极亮的巨脉冲。', 'The neutron star in the Crab Nebula, left by the supernova of 1054 that astronomers in Song-dynasty China recorded as a "guest star". It sends giant pulses.'],
  'J1921+2153': ['第一颗被发现的脉冲星。1967 年，研究生乔斯琳·贝尔·伯内尔在剑桥射电望远镜的记录纸上注意到这串“一点点杂音”。', 'The first pulsar ever found. In 1967 the graduate student Jocelyn Bell Burnell noticed this "bit of scruff" on the chart paper of a Cambridge radio telescope.'],
  'J0332+5434': ['北天最亮的脉冲星之一。它的脉冲有三个峰，是从磁极上方不同高度发出的。', 'One of the brightest pulsars in the northern sky. Its pulse has three peaks, emitted from different heights above the magnetic pole.'],
  'J0437-4715': ['离我们最近、最亮的毫秒脉冲星，约 510 光年。每秒转 174 圈，计时精度能到几十纳秒。', 'The nearest and brightest millisecond pulsar, about 510 light-years away. It turns 174 times a second and can be timed to tens of nanoseconds.'],
  'J1939+2134': ['第一颗被发现的毫秒脉冲星（1982 年），每秒转 642 圈。毫秒脉冲星是被伴星“喂”快的老中子星。', 'The first millisecond pulsar found (1982), turning 642 times a second. Millisecond pulsars are old neutron stars spun up by feeding on a companion.'],
  'J0737-3039A': ['双脉冲星：两颗脉冲星互相绕转，2.45 小时一圈。检验广义相对论最精密的实验室之一。这里模拟的是转得快的那颗 A。', 'The double pulsar: two pulsars orbiting each other every 2.45 hours, one of the sharpest tests of general relativity. This is the fast one, A.'],
  'J1915+1606': ['赫尔斯–泰勒脉冲星。它和伴星的轨道一点点缩小，正好是引力波带走能量的预言值。1993 年诺贝尔物理学奖。', 'The Hulse–Taylor pulsar. Its orbit shrinks exactly as gravitational waves carrying energy away predict. Nobel Prize in Physics, 1993.'],
  'J0953+0755': ['很近、很亮、色散极小的一颗，小望远镜也能收到。', 'Close, bright and barely dispersed: even a small dish can hear it.'],
  'J1300+1240': ['第一批被确认的系外行星就绕着它转（1992 年）：死去的恒星身边的行星。', 'The first confirmed exoplanets circle it (1992): planets around a dead star.'],
  'J1713+0747': ['计时阵列的另一块基石，68 天的双星轨道。', 'Another cornerstone of the timing arrays, on a 68-day binary orbit.'],
  'J2144-3933': ['转得极慢：8.5 秒一圈，脉冲只占一圈的千分之几。按理论它本不该还能发出射电。', 'Very slow: one turn every 8.5 seconds, the pulse only a few thousandths of a turn wide. By the textbook it should have gone quiet by now.'],
  mystery: ['没人编过目的一颗：周期和色散量都是随机的，每次重新生成都不一样。用下面的分析工具把它找出来。', 'One nobody has catalogued: a random period and DM, new each time. Use the analysis tools below to find it.'],
};

const T = zh ? {
  name: (p) => (p.mystery ? '神秘信号' : p.id.replace('-', '−')),
  label: (p) => (p.mystery ? '？ 神秘信号（随机生成）' : `${p.id.replace('-', '−')}${p.b ? ` · ${p.b}` : ''} · ${rate(p)}`),
  tel: { dish25: '25 米天线（北纬 53°）', parkes: 'Murriyang · 帕克斯 64 米（澳大利亚）', gbt: '绿岸 100 米（美国）', fast: 'FAST · 500 米（中国贵州）' },
  telShort: { dish25: '25 米', parkes: '帕克斯', gbt: '绿岸', fast: 'FAST' },
  band: { p350: '350 MHz', p820: '820 MHz', L: '1.4 GHz', S: '3 GHz' },
  hz: (f) => (f >= 1 ? `${sig(f, 4)} Hz` : `${sig(f, 3)} Hz`),
  per: (p) => (p >= 1 ? `${sig(p, 5)} 秒` : `${sig(p * 1e3, 5)} 毫秒`),
  ms: (s) => (s >= 1 ? `${sig(s, 3)} 秒` : s >= 1e-3 ? `${sig(s * 1e3, 3)} 毫秒` : `${sig(s * 1e6, 3)} 微秒`),
  dist: (kpc) => (kpc == null ? '未知' : `${nf(kpc * 3262, 0)} 光年`),
  mjy: (s) => (s >= 1000 ? `${sig(s / 1000, 3)} Jy` : `${sig(s, 3)} mJy`),
  dmU: (d) => `${sig(d, 4)} pc/cm³`,
  slow: (k) => (k > 1.5 ? `放慢 ${nf(k, 0)} 倍` : '实时'),
  turns: (n) => `${nf(n, 1)} 圈`,
  obsTime: (t) => `${nf(t, 0)} 秒`,
  cantSee: (tel, p) => `${T.tel[tel.id]}看不到这颗：它的赤纬是 ${nf(p.dec, 1)}°，从那里永远升不到够高。换一台望远镜。`,
  noBand: '这台望远镜没有这个频段的接收机，已换成它有的频段。',
  start: '开始观测', pause: '暂停', resume: '继续', again: '重新观测',
  listen: '听', stop: '停',
  sweep: (s, p) => `${T.ms(s)} · ${nf(s / p, s / p < 10 ? 1 : 0)} 个周期`,
  noData: '还没有数据。先在观测台点“开始观测”。',
  fftBest: (b) => `${T.hz(b.f)}（${b.harm} 次谐波相加）`,
  fftSig: (v) => (v > 1e4 ? '> 10000 σ' : `${nf(v, 1)} σ`),
  fftNone: '没有明显的周期信号',
  spectrumNone: '这颗没有实测流量：它是新发现的。曲线按典型的谱指数 −1.6 估计。',
  spectrumPts: (n, k) => `${n} 个实测值，来自 ${k} 篇论文`,
  win: (s) => (s < 1e-6 ? `${sig(s * 1e9, 3)} 纳秒` : s < 1e-3 ? `${sig(s * 1e6, 3)} 微秒` : s < 1 ? `${sig(s * 1e3, 3)} 毫秒` : `${sig(s, 3)} 秒`),
  zoomRows: ['罗斯128 b 的信标 · 1420.55 MHz 的音，按 J1909−3744 的节拍开关', `脉冲星 J1909−3744 本身 · 1.2–1.6 GHz 宽带噪声，按自转开关`],
  envelope: '载波太密，画不出来，只剩包络',
  axisPhase: '相位（一圈）', axisFreq: '频率', axisTime: '时间', axisSub: '时间（子积分）', axisDm: '试验色散量 pc/cm³', axisSnr: '信噪比', axisP: '试验周期偏离', axisHz: '频率 Hz', axisPow: '功率', axisMhz: '频率 MHz', axisMjy: '流量 mJy',
  measured: '实测', fit: '拟合', thisBand: '当前频段',
  found: (what) => `找到了：${what}`, rot: '每秒转',
  search: (max) => `在 0–${max} 的色散量上逐个搜索`, searching: '搜索中…',
} : {
  name: (p) => (p.mystery ? 'Mystery signal' : p.id.replace('-', '−')),
  label: (p) => (p.mystery ? '? Mystery signal (random)' : `${p.id.replace('-', '−')}${p.b ? ` · ${p.b}` : ''} · ${rate(p)}`),
  tel: { dish25: '25 m dish (53° N)', parkes: 'Murriyang · Parkes 64 m (Australia)', gbt: 'Green Bank 100 m (USA)', fast: 'FAST · 500 m (Guizhou, China)' },
  telShort: { dish25: '25 m', parkes: 'Parkes', gbt: 'Green Bank', fast: 'FAST' },
  band: { p350: '350 MHz', p820: '820 MHz', L: '1.4 GHz', S: '3 GHz' },
  hz: (f) => `${sig(f, f >= 1 ? 4 : 3)} Hz`,
  per: (p) => (p >= 1 ? `${sig(p, 5)} s` : `${sig(p * 1e3, 5)} ms`),
  ms: (s) => (s >= 1 ? `${sig(s, 3)} s` : s >= 1e-3 ? `${sig(s * 1e3, 3)} ms` : `${sig(s * 1e6, 3)} µs`),
  dist: (kpc) => (kpc == null ? 'unknown' : `${nf(kpc * 3262, 0)} ly`),
  mjy: (s) => (s >= 1000 ? `${sig(s / 1000, 3)} Jy` : `${sig(s, 3)} mJy`),
  dmU: (d) => `${sig(d, 4)} pc/cm³`,
  slow: (k) => (k > 1.5 ? `slowed ${nf(k, 0)}×` : 'real time'),
  turns: (n) => `${nf(n, 1)} turns`,
  obsTime: (t) => `${nf(t, 0)} s`,
  cantSee: (tel, p) => `${T.tel[tel.id]} can't see this one: at declination ${nf(p.dec, 1)}° it never rises high enough there. Pick another telescope.`,
  noBand: 'This telescope has no receiver for that band, so it switched to one it has.',
  start: 'Start observing', pause: 'Pause', resume: 'Resume', again: 'Observe again',
  listen: 'Listen', stop: 'Stop',
  sweep: (s, p) => `${T.ms(s)} · ${nf(s / p, s / p < 10 ? 1 : 0)} periods`,
  noData: 'No data yet. Press "Start observing" in the observatory first.',
  fftBest: (b) => `${T.hz(b.f)} (${b.harm} harmonics summed)`,
  fftSig: (v) => (v > 1e4 ? '> 10000 σ' : `${nf(v, 1)} σ`),
  fftNone: 'no clear periodic signal',
  spectrumNone: 'No measured fluxes for this one: it is a new find. The curve assumes a typical spectral index of −1.6.',
  spectrumPts: (n, k) => `${n} measurements from ${k} papers`,
  win: (s) => (s < 1e-6 ? `${sig(s * 1e9, 3)} ns` : s < 1e-3 ? `${sig(s * 1e6, 3)} µs` : s < 1 ? `${sig(s * 1e3, 3)} ms` : `${sig(s, 3)} s`),
  zoomRows: ['Ross 128 b\'s beacon · a 1420.55 MHz tone, switched at J1909−3744\'s beat', 'The pulsar J1909−3744 itself · broadband noise at 1.2–1.6 GHz, switched by its spin'],
  envelope: 'the carrier is too dense to draw; only its envelope shows',
  axisPhase: 'phase (one turn)', axisFreq: 'frequency', axisTime: 'time', axisSub: 'time (sub-integrations)', axisDm: 'trial DM pc/cm³', axisSnr: 'S/N', axisP: 'trial period offset', axisHz: 'frequency Hz', axisPow: 'power', axisMhz: 'frequency MHz', axisMjy: 'flux mJy',
  measured: 'measured', fit: 'fit', thisBand: 'this band',
  found: (what) => `Found: ${what}`, rot: 'turns/s',
  search: (max) => `Search DMs 0–${max} one by one`, searching: 'Searching…',
};
function rate(p) { const f = 1 / p.p; return zh ? (f >= 1 ? `每秒 ${sig(f, 3)} 圈` : `${sig(p.p, 3)} 秒一圈`) : (f >= 1 ? `${sig(f, 3)} turns/s` : `one turn per ${sig(p.p, 3)} s`); }

// ------------------------------------------------------------------ drawing helpers

function prep(canvas) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.font = `11px ${col('--font-mono') || 'monospace'}`;
  return { ctx, W, H };
}
const css = getComputedStyle(document.documentElement);
function col(v) { return css.getPropertyValue(v).trim(); }
const C = { them: col('--them'), us: col('--us'), text: col('--text'), muted: col('--muted'), grid: col('--plot-grid'), axis: col('--plot-axis'), ctx: col('--plot-context'), dim: col('--plot-dim'), deep: col('--deep'), noise: col('--noise'), c1: col('--c1') };

// colour map for intensity images: deep blue → noise blue → cyan → white
const RAMP = [[7, 11, 56], [26, 40, 150], [58, 75, 214], [159, 248, 255], [255, 255, 255]];
function ramp(v) { // v in 0..1
  const x = Math.max(0, Math.min(0.9999, v)) * (RAMP.length - 1), i = Math.floor(x), f = x - i;
  return RAMP[i].map((c, k) => Math.round(c + (RAMP[i + 1][k] - c) * f));
}

// Draw rows of numbers as an image into a box. `lo`/`hi` set the colour scale.
function image(ctx, rows, x, y, w, h, lo, hi) {
  const nr = rows.length, nc = rows[0].length;
  const img = new ImageData(nc, nr);
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
    const [R, G, B] = ramp((rows[r][c] - lo) / (hi - lo)); const k = 4 * (r * nc + c);
    img.data[k] = R; img.data[k + 1] = G; img.data[k + 2] = B; img.data[k + 3] = 255;
  }
  const off = new OffscreenCanvas(nc, nr); off.getContext('2d').putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, x, y, w, h);
}

function range(rows) {
  const v = []; for (const r of rows) for (let i = 0; i < r.length; i += Math.max(1, r.length >> 6)) v.push(r[i]);
  v.sort((a, b) => a - b);
  return [v[Math.floor(v.length * 0.02)], v[Math.floor(v.length * 0.995)] || 1];
}

function axes(ctx, W, H, pad, { x = '', y = '' } = {}) {
  ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();
  // axis names sit inside the plot's top corners, on a backing so the data never runs through them
  if (y) tag(ctx, y, pad.l + 4, pad.t + 11, 'left');
  if (x) tag(ctx, x, W - pad.r - 2, pad.t + 11, 'right');
}

function tag(ctx, text, x, y, align, color = C.muted) {
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(text).width, x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = C.deep; ctx.fillRect(x0 - 3, y - 11, w + 6, 15);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function line(ctx, pts, color, w = 1.5) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'miter'; ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
}

// ------------------------------------------------------------------ state

const state = {
  psr: byId('J0835-4510'), tel: 'parkes', band: 'L', obs: null, fold: null, upTo: 0, t: 0, running: false, done: false,
  dm: 0, pBase: 0, pOff: 0, pZoom: 0, tab: 'fft', fftCand: null, seed: 1,
};
const NSUB = 30, TSUB = 20, NBIN = 128, SPEED = 20; // 30 × 20 s = 10 minutes, at 20 observed seconds a second

// ------------------------------------------------------------------ 1. lighthouse

const LH = { canvas: $('#lighthouse'), trace: [], last: 0, phase: 0 };
function lighthouse(now) {
  const { ctx, W, H } = prep(LH.canvas);
  const p = state.psr;
  const show = Math.max(p.p, 1.6); // a display period you can follow with your eyes
  const dt = LH.last ? Math.min(0.05, (now - LH.last) / 1000) : 0; LH.last = now;
  LH.phase = (LH.phase + dt / show) % 1;
  const tab = (LH.tab?.psr === p ? LH.tab : (LH.tab = { psr: p, t: profileTable(p, { n: 512, extra: 0.02 }) })).t;
  const peak = Math.max(...tab);
  // seen from above the spin axis: the two beams turn in the page like a lighthouse's; phase 0 points at us
  const ang = -2 * Math.PI * LH.phase;
  const top = H * 0.68, cx = W * 0.3, cy = top * 0.5, R = Math.min(W, top) * 0.05, L = Math.min(W * 0.6, top * 0.9);
  for (const a of [ang, ang + Math.PI]) {
    const half = 0.13;
    const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    g.addColorStop(0, 'rgba(159,248,255,0.75)'); g.addColorStop(1, 'rgba(159,248,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - half) * L, cy + Math.sin(a - half) * L); ctx.lineTo(cx + Math.cos(a + half) * L, cy + Math.sin(a + half) * L); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = C.text; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.fillStyle = C.deep; ctx.fillRect(cx - 2, cy - 2, 4, 4); // the spin axis, pointing out of the page
  // the telescope on the right, and the line of sight to it
  const tx = W - 30, ty = cy;
  ctx.setLineDash([2, 6]); ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(cx + R * 2, cy); ctx.lineTo(tx - 16, ty); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = C.us; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - 12, ty - 14); ctx.lineTo(tx - 4, ty); ctx.lineTo(tx - 12, ty + 14); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx + 8, ty + 18); ctx.stroke();
  tag(ctx, T.name(p), cx, cy + R + 22, 'center', C.muted);
  tag(ctx, zh ? '地球' : 'Earth', tx, ty + 34, 'right', C.us);
  // what the telescope sees: the profile, read at the pulse phase. Phase 0 = beam pointing at us.
  const v = lookup(tab, LH.phase) / peak;
  LH.trace.push(v); if (LH.trace.length > 360) LH.trace.shift();
  if (v > 0.15) { ctx.fillStyle = `rgba(159,248,255,${Math.min(1, v)})`; for (const [dx, dy] of [[-22, -12], [-26, 0], [-22, 12]]) ctx.fillRect(tx + dx, ty + dy - 2, 4, 4); }
  // trace strip
  const y0 = H - 14, hh = H - top - 30;
  ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(14, y0); ctx.lineTo(W - 14, y0); ctx.stroke();
  line(ctx, LH.trace.map((u, i) => [W - 14 - (LH.trace.length - 1 - i) * ((W - 28) / 360), y0 - u * hh]), C.them, 1.5);
  ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText(zh ? '望远镜收到的' : 'what the telescope gets', 14, top + 14);
  ctx.textAlign = 'right'; ctx.fillText(T.slow(show / p.p), W - 14, top + 14);
}

// ------------------------------------------------------------------ 2. carrier and rhythm

const Z = { canvas: $('#zoom'), input: $('#zoom-win') };
const CARRIER = 1420.55e6, BEAT = byId('J1909-3744');
const BEAT_TAB = profileTable(BEAT, { n: 4096 }), BEAT_PEAK = Math.max(...BEAT_TAB);
const NOISE_WAVES = (() => { let a = 7; const r = () => ((a = (a * 16807) % 2147483647) / 2147483647); return Array.from({ length: 24 }, () => ({ f: 1.2e9 + 0.4e9 * r(), ph: 2 * Math.PI * r(), a: 0.5 + r() })); })();
const NOISE_NORM = Math.sqrt(NOISE_WAVES.reduce((s, w) => s + w.a * w.a / 2, 0)) * 2.2;
function zoom() {
  const { ctx, W, H } = prep(Z.canvas);
  const win = 10 ** Number(Z.input.value);
  const t0 = BEAT.p * 0.5 - win / 2 + (win > BEAT.p ? BEAT.p * 0.5 : 0); // centre the window on a pulse when zoomed in
  const cols = Math.round(W - 20), rowH = (H - 54) / 2;
  const envAt = (t) => lookup(BEAT_TAB, t / BEAT.p - 0.5) / BEAT_PEAK;
  // envelope over a pixel: the brightest point inside it (narrow pulses must not vanish between samples)
  const envPix = (ta, tb) => { if (tb - ta > BEAT.p) return 1; let m = 0; const n = 6; for (let k = 0; k <= n; k++) m = Math.max(m, envAt(ta + ((tb - ta) * k) / n)); return m; };
  const dense = win / cols > 1 / CARRIER / 3;
  [0, 1].forEach((row) => {
    const y = 18 + row * (rowH + 18) + rowH / 2, A = rowH / 2 - 4;
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText(T.zoomRows[row], 10, y - A - 6);
    ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke();
    const colr = row ? C.text : C.them;
    if (dense) {
      ctx.fillStyle = colr;
      for (let x = 0; x < cols; x++) {
        const ta = t0 + (win * x) / cols, tb = t0 + (win * (x + 1)) / cols;
        let e = envPix(ta, tb);
        if (row) e *= 0.55 + 0.45 * Math.abs(Math.sin(x * 12.9898 + Math.floor(ta * 1e7) * 78.233)); // noise: its amplitude wanders
        const h = Math.max(1, e * A); ctx.globalAlpha = row ? 0.75 : 0.9; ctx.fillRect(10 + x, y - h, 1, 2 * h);
      }
      ctx.globalAlpha = 1;
    } else {
      const pts = [];
      for (let x = 0; x <= cols * 2; x++) {
        const t = t0 + (win * x) / (cols * 2), e = envAt(t);
        const v = row ? NOISE_WAVES.reduce((s, w) => s + w.a * Math.sin(2 * Math.PI * w.f * t + w.ph), 0) / NOISE_NORM : Math.sin(2 * Math.PI * CARRIER * t);
        pts.push([10 + x / 2, y - Math.max(-1, Math.min(1, v * e)) * A]);
      }
      line(ctx, pts, colr, 1.5);
    }
  });
  ctx.fillStyle = C.muted; ctx.textAlign = 'right';
  ctx.fillText(dense ? T.envelope : '', W - 10, H - 8);
  $('#zoom-out').textContent = T.win(win);
  $('#z-cycles').textContent = nf(win * CARRIER, win * CARRIER < 10 ? 1 : 0);
  $('#z-pulses').textContent = nf(win / BEAT.p, win / BEAT.p < 10 ? 2 : 0);
}
Z.input.addEventListener('input', zoom);
$$('[data-zoom]').forEach((b) => b.addEventListener('click', () => { Z.input.value = b.dataset.zoom; zoom(); }));

// ------------------------------------------------------------------ 3. observatory

const sel = $('#psr');
const options = [...PULSARS, { id: 'mystery', mystery: true, p: 0 }];
sel.innerHTML = options.map((p) => `<option value="${p.id}">${T.label(p)}</option>`).join('');
$('#tel').innerHTML = TELESCOPES.map((t) => `<option value="${t.id}">${T.tel[t.id]}</option>`).join('');
$('#tel').value = state.tel;
function bandButtons() {
  const tel = telOf(state.tel);
  if (!tel.bands.includes(state.band)) { state.band = tel.bands.includes('L') ? 'L' : tel.bands[0]; }
  $('#band').innerHTML = BANDS.map((b) => `<button type="button" role="tab" data-band="${b.id}" aria-selected="${b.id === state.band}" ${tel.bands.includes(b.id) ? '' : 'disabled'}>${T.band[b.id]}</button>`).join('');
  $$('#band button').forEach((b) => b.addEventListener('click', () => { state.band = b.dataset.band; configure(); }));
}

const WF = { canvas: $('#waterfall'), cols: 480, data: null, sum: null, next: null, acc: 0, last: 0 };

function configure({ keepTrial = false } = {}) {
  stopSound();
  bandButtons();
  const p = state.psr;
  sel.value = p.mystery ? 'mystery' : p.id;
  const tel = telOf(state.tel);
  state.obs = setup(p, state.band, state.tel, FLUXES);
  const o = state.obs;
  // readouts about the pulsar
  $('#h-name').textContent = T.name(p);
  $('#h-rot').textContent = p.mystery ? '?' : sig(1 / p.p, 4);
  $('#h-per').textContent = p.mystery ? '?' : T.per(p.p);
  $('#h-dist').textContent = p.mystery ? '?' : T.dist(p.dist);
  $('#h-dm').textContent = p.mystery ? '?' : T.dmU(p.dm);
  $('#psr-note').textContent = NOTES[p.id][zh ? 0 : 1];
  // readouts about the observation
  const S = flux(p, o.fc, FLUXES);
  const sweep = delay(p.dm, o.band.lo) - delay(p.dm, o.band.hi);
  $('#o-flux').textContent = p.mystery ? '?' : T.mjy(S);
  $('#o-sweep').textContent = p.mystery ? '?' : T.sweep(sweep, p.p);
  $('#o-scatter').textContent = p.mystery ? '?' : T.ms(scatter(p.dm, o.fc));
  $('#o-tsys').textContent = `${nf(tsys(tel, o.fc), 0)} K`;
  const warn = $('#o-warn');
  warn.hidden = o.visible; warn.textContent = o.visible ? '' : T.cantSee(tel, p);
  // the live waterfall: a window wide enough for a few pulses and the whole sweep
  const W = Math.min(Math.max(3 * p.p, 1.25 * sweep, 0.02), 30);
  WF.dt = W / WF.cols; WF.window = W; WF.slow = Math.max(1, 6 / W);
  WF.next = o.visible ? stream(o, { dt: WF.dt, seed: state.seed * 31 + 5 }) : null;
  WF.data = Array.from({ length: o.nchan }, () => new Float32Array(WF.cols));
  WF.sum = new Float32Array(WF.cols);
  if (WF.next) push(WF.cols);
  $('#o-slow').textContent = T.slow(WF.slow);
  // the folded observation, revealed one sub-integration at a time
  state.fold = o.visible ? foldCube(o, { nsub: NSUB, tsub: TSUB, nbin: NBIN, nchan: 32, seed: state.seed * 17 + 3 }) : null;
  state.upTo = 0; state.t = 0; state.done = false; state.running = false; state.fftCand = null;
  if (!keepTrial) { state.dm = 0; state.pBase = p.mystery ? 0 : p.p; state.pOff = 0; state.pZoom = 0; }
  $('#dm').max = Math.max(300, Math.ceil(p.dm * 2 / 50) * 50);
  $('#dm').value = state.dm; $('#poff').value = 0; $('#f-search').textContent = T.search($('#dm').max);
  runButton();
  drawWaterfall(); updateObs(); analyse();
  spectrum();
}

function push(n) {
  const cols = WF.next(n);
  for (let c = 0; c < cols.length; c++) { const row = WF.data[c]; row.copyWithin(0, n); row.set(cols[c], WF.cols - n); }
  WF.sum.copyWithin(0, n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < cols.length; c++) s += cols[c][i]; WF.sum[WF.cols - n + i] = s / Math.sqrt(cols.length); }
}

function drawWaterfall() {
  const { ctx, W, H } = prep(WF.canvas);
  const pad = { l: 46, r: 10, t: 10, b: 22 };
  const imgH = (H - pad.t - pad.b) * 0.68, serH = H - pad.t - pad.b - imgH - 10;
  if (!state.obs.visible) { ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('—', W / 2, H / 2); return; }
  // smooth a little in frequency so the sweep reads when the noise is strong: 4 channels per row
  const rows = []; for (let c = 0; c < WF.data.length; c += 2) { const r = new Float32Array(WF.cols); for (let i = 0; i < WF.cols; i++) r[i] = (WF.data[c][i] + WF.data[c + 1][i]) / Math.SQRT2; rows.push(r); }
  const [lo, hi] = range(rows);
  image(ctx, rows, pad.l, pad.t, W - pad.l - pad.r, imgH, lo, Math.max(hi, lo + 4));
  const b = state.obs.band;
  ctx.fillStyle = C.muted; ctx.textAlign = 'right';
  ctx.fillText(`${b.hi}`, pad.l - 6, pad.t + 9); ctx.fillText(`${b.lo}`, pad.l - 6, pad.t + imgH); ctx.fillText('MHz', pad.l - 6, pad.t + imgH / 2 + 4);
  // the band summed, without removing dispersion
  const y0 = pad.t + imgH + 10 + serH;
  const [slo, shi] = [Math.min(...WF.sum), Math.max(...WF.sum)];
  line(ctx, [...WF.sum].map((v, i) => [pad.l + ((W - pad.l - pad.r) * i) / (WF.cols - 1), y0 - ((v - slo) / (shi - slo || 1)) * serH]), C.them, 1);
  tag(ctx, zh ? '频段相加' : 'band sum', pad.l + 4, y0 - serH + 10, 'left');
  ctx.textAlign = 'left'; ctx.fillText('0', pad.l, H - 6);
  ctx.textAlign = 'right'; ctx.fillText(`${T.axisTime} · ${T.ms(WF.window)}`, W - pad.r, H - 6);
}

function updateObs() {
  $('#o-time').textContent = T.obsTime(state.t);
  const f = state.fold;
  if (!f || !state.upTo) { $('#o-snr').textContent = '–'; return; }
  const p = state.psr;
  $('#o-snr').textContent = nf(snr(reduce(f, { dm: p.dm, pTrial: p.p, upTo: state.upTo }).prof, noise(f, state.upTo)).snr, 1);
}

function runButton() {
  const b = $('#run');
  b.textContent = state.running ? T.pause : state.done ? T.again : state.t ? T.resume : T.start;
  b.setAttribute('aria-pressed', String(state.running));
  b.disabled = !state.obs.visible;
  $('#listen').disabled = !state.obs.visible;
}

$('#run').addEventListener('click', () => {
  if (state.done) { state.seed++; configure({ keepTrial: true }); }
  state.running = !state.running; runButton();
});
sel.addEventListener('change', () => { pick(sel.value); });
$('#tel').addEventListener('change', () => { state.tel = $('#tel').value; configure(); });

function pick(id) {
  state.psr = id === 'mystery' ? mystery((Date.now() & 0xffff) ^ (state.seed++ * 2654435761)) : byId(id);
  sel.value = id;
  if (!canSee(telOf(state.tel), state.psr.dec)) { const t = TELESCOPES.slice().reverse().find((x) => canSee(x, state.psr.dec)); if (t) { state.tel = t.id; $('#tel').value = t.id; } }
  LH.trace = [];
  configure();
}

// ------------------------------------------------------------------ sound

let audio = null, source = null;
function stopSound() { if (source) { try { source.stop(); } catch { /* already stopped */ } source = null; } $('#listen').textContent = T.listen; $('#listen').setAttribute('aria-pressed', 'false'); }
$('#listen').addEventListener('click', () => {
  if (source) { stopSound(); return; }
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  const rate = audio.sampleRate;
  const secs = Math.min(26, Math.max(6, 3.2 * state.psr.p));
  const data = sound(state.obs, { rate, secs, noise: $('#noise').checked, seed: state.seed });
  const buf = audio.createBuffer(1, data.length, rate); buf.copyToChannel(data, 0);
  source = audio.createBufferSource(); source.buffer = buf; source.connect(audio.destination);
  source.onended = () => { if (source && source.buffer === buf) stopSound(); };
  source.start();
  $('#listen').textContent = T.stop; $('#listen').setAttribute('aria-pressed', 'true');
});

// ------------------------------------------------------------------ 4. analysis tools

$$('#tools [role="tab"]').forEach((b) => b.addEventListener('click', () => {
  state.tab = b.dataset.tool;
  $$('#tools [role="tab"]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  $$('#tools [data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== state.tab; });
  analyse();
}));

const pTrial = () => (state.pBase || 0) * (1 + state.pOff);
// the fine period slider is in turns of drift over the whole observation
const offFromTurns = (turns) => (state.pBase ? (turns * state.pBase) / (NSUB * TSUB) : 0);

function analyse() {
  if (state.tab === 'fft') fftTool();
  if (state.tab === 'dm') dmTool();
  if (state.tab === 'fold') foldTool();
  if (state.tab === 'spec') spectrum();
}

function empty(canvas, msg) {
  const { ctx, W, H } = prep(canvas);
  ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(msg, W / 2, H / 2);
}

// --- periodicity search
const FFT_N = 1 << 18, FFT_MIN = 16; // a candidate must stand 16 σ above the noise: with ~10⁵ frequencies, noise alone reaches ~10
const fftDt = (p) => Math.min(1e-3, Math.max(5e-5, p / 64)); // fine enough for the fastest, long enough for many turns of the slowest
function spectrumAt(dm, n = FFT_N) {
  const o = state.obs;
  // a mystery pulsar's sampling must not give its period away: use the millisecond setting for all of them
  const dt = o.psr.mystery ? 2.5e-4 : fftDt(o.psr.p);
  return powerSpectrum(timeSeries(o, { dt, ns: n, dmTrial: dm, seed: state.seed * 13 + Math.round(dm * 10) }));
}
function fftTool() {
  const cv = $('#fft');
  $('#f-dm').textContent = T.dmU(state.dm);
  if (!state.upTo) { empty(cv, T.noData); ['#f-best', '#f-per', '#f-sig'].forEach((s) => ($(s).textContent = '–')); $('#use-fft').disabled = true; $('#f-search').disabled = true; return; }
  $('#f-search').disabled = false;
  const o = state.obs;
  const key = `${o.psr.id}|${o.psr.p}|${state.band}|${state.tel}|${state.dm}|${state.seed}`;
  if (state.fftKey !== key) { state.fftRes = spectrumAt(state.dm); state.fftKey = key; }
  const { pow, df, best } = state.fftRes;
  const found = best.power > FFT_MIN;
  const { ctx, W, H } = prep(cv);
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  // linear frequency axis: every pixel column holds the same number of bins, so the noise floor is flat.
  // Zoomed onto the candidate's first harmonics when there is one.
  const fmax = found && $('#f-zoom').checked ? Math.min(df * pow.length, best.f * 16.5) : df * pow.length;
  const X = (f) => pad.l + (f / fmax) * (W - pad.l - pad.r);
  const ncol = Math.ceil(W - pad.l - pad.r), colMax = new Float32Array(ncol);
  for (let i = 2; i < pow.length && i * df <= fmax; i++) { const x = Math.min(ncol - 1, Math.floor(X(i * df) - pad.l)); if (pow[i] > colMax[x]) colMax[x] = pow[i]; }
  const top = Math.max(30, ...colMax);
  const Y = (v) => H - pad.b - (Math.log10(1 + v) / Math.log10(1 + top)) * (H - pad.t - pad.b);
  const raw = fmax / 6, mag = 10 ** Math.floor(Math.log10(raw)), m = raw / mag;
  const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * mag;
  ctx.fillStyle = C.muted; ctx.textAlign = 'center';
  for (let f = step; f < fmax * 0.97; f += step) { ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(X(f), pad.t); ctx.lineTo(X(f), H - pad.b); ctx.stroke(); ctx.fillText(nf(f, f < 1 ? 1 : 0), X(f), H - pad.b + 14); }
  // the noise threshold
  ctx.setLineDash([3, 4]); ctx.strokeStyle = C.dim; ctx.beginPath(); ctx.moveTo(pad.l, Y(FFT_MIN)); ctx.lineTo(W - pad.r, Y(FFT_MIN)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = C.text;
  colMax.forEach((v, x) => { if (v) { const y = Y(v); ctx.fillRect(pad.l + x, y, 1, H - pad.b - y); } });
  axes(ctx, W, H, pad, { x: T.axisHz, y: T.axisPow });
  if (found) {
    for (let h = 1; h <= 16; h++) { const f = best.f * h; if (f > fmax) break; ctx.fillStyle = C.them; ctx.fillRect(X(f) - 2, H - pad.b - 6, 4, 4); }
    tag(ctx, `f₀ ${T.hz(best.f)}`, Math.min(W - pad.r - 2, X(best.f) + 6), pad.t + 28, X(best.f) > W * 0.7 ? 'right' : 'left', C.them);
  }
  state.fftCand = found ? best : null;
  $('#f-best').textContent = found ? T.fftBest(best) : T.fftNone;
  $('#f-per').textContent = found ? T.per(1 / best.f) : '–';
  $('#f-sig').textContent = T.fftSig(best.power);
  $('#use-fft').disabled = !found;
}
$('#f-zoom').addEventListener('change', fftTool);
$('#use-fft').addEventListener('click', () => {
  if (!state.fftCand) return;
  state.pBase = 1 / state.fftCand.f; state.pOff = 0; state.pZoom = 0; $('#poff').value = 0;
  $('[data-tool="fold"]').click();
});
// A real search: the same periodicity search at a ladder of trial DMs, keeping the strongest.
$('#f-search').addEventListener('click', () => {
  const btn = $('#f-search'); btn.disabled = true; btn.textContent = T.searching;
  setTimeout(() => {
    const max = Number($('#dm').max), n = 24;
    let best = { dm: 0, power: -1 };
    for (let k = 0; k < n; k++) {
      const dm = Math.round(((max * k) / (n - 1)) * 100) / 100;
      const r = spectrumAt(dm, FFT_N >> 1);
      if (r.best.power > best.power) best = { dm, power: r.best.power };
    }
    state.dm = best.dm; $('#dm').value = best.dm;
    btn.disabled = false; btn.textContent = T.search(max);
    fftTool();
  }, 30);
});

// --- dedispersion
$('#dm').addEventListener('input', () => { state.dm = Number($('#dm').value); dmTool(); });
$('#dm-best').addEventListener('click', () => { if (state.dmBest != null) { state.dm = state.dmBest; $('#dm').value = state.dm; dmTool(); } });
function dmTool() {
  $('#dm-out').textContent = T.dmU(state.dm);
  const a = $('#dd-chan'), b = $('#dd-curve');
  if (!state.upTo || !state.pBase) { empty(a, state.upTo ? (zh ? '先在“周期搜索”里找到周期' : 'find the period first, in "Period search"') : T.noData); empty(b, ''); ['#d-snr', '#d-best'].forEach((s) => ($(s).textContent = '–')); return; }
  const f = state.fold, pt = pTrial();
  const r = reduce(f, { dm: state.dm, pTrial: pt, upTo: state.upTo });
  // channels against phase, two turns wide so a pulse near the edge stays whole
  {
    const { ctx, W, H } = prep(a);
    const pad = { l: 46, r: 10, t: 10, b: 50 };
    const rows = r.chan.map((row) => { const two = new Float32Array(row.length * 2); two.set(row); two.set(row, row.length); return two; });
    const [lo, hi] = range(rows);
    const ih = H - pad.t - pad.b;
    image(ctx, rows, pad.l, pad.t, W - pad.l - pad.r, ih, lo, Math.max(hi, lo + 3));
    const bnd = state.obs.band;
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(`${bnd.hi}`, pad.l - 6, pad.t + 9); ctx.fillText(`${bnd.lo}`, pad.l - 6, pad.t + ih); ctx.fillText('MHz', pad.l - 6, pad.t + ih / 2 + 4);
    // the summed profile under it
    const prof = [...r.prof, ...r.prof]; const mn = Math.min(...prof), mx = Math.max(...prof);
    line(ctx, prof.map((v, i) => [pad.l + ((W - pad.l - pad.r) * (i + 0.5)) / prof.length, H - 16 - ((v - mn) / (mx - mn || 1)) * (pad.b - 24)]), C.them, 1.5);
    ctx.textAlign = 'right'; ctx.fillText(T.axisPhase + ' ×2', W - pad.r, H - 4);
  }
  const cur = snr(r.prof, noise(f, state.upTo)).snr;
  const key = `${state.fftKey}|${pt}|${state.upTo}|${$('#dm').max}`;
  if (state.dmKey !== key) { state.dmCurve = dmCurve(f, { pTrial: pt, from: 0, to: Number($('#dm').max), n: 150, upTo: state.upTo }); state.dmKey = key; }
  const curve = state.dmCurve;
  const best = curve.reduce((m, v) => (v[1] > m[1] ? v : m));
  state.dmBest = Math.round(best[0] * 100) / 100;
  {
    const { ctx, W, H } = prep(b);
    const pad = { l: 40, r: 12, t: 12, b: 26 };
    const mx = Math.max(...curve.map((v) => v[1]), 5);
    const X = (dm) => pad.l + (dm / Number($('#dm').max)) * (W - pad.l - pad.r), Y = (s) => H - pad.b - (s / mx) * (H - pad.t - pad.b);
    line(ctx, curve.map(([d, s]) => [X(d), Y(Math.max(0, s))]), C.text, 1.5);
    ctx.fillStyle = C.them; ctx.fillRect(X(state.dm) - 1, pad.t, 2, H - pad.t - pad.b);
    ctx.fillRect(X(state.dm) - 3, Y(Math.max(0, cur)) - 3, 6, 6);
    axes(ctx, W, H, pad, { x: T.axisDm, y: T.axisSnr });
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('0', pad.l, H - pad.b + 13); ctx.textAlign = 'center'; ctx.fillText($('#dm').max, W - pad.r - 10, H - pad.b + 13);
  }
  $('#d-snr').textContent = nf(cur, 1);
  $('#d-best').textContent = best[1] > 6 ? T.dmU(best[0]) : '–';
}

// --- folding
$('#poff').addEventListener('input', () => { state.pOff = offFromTurns(Number($('#poff').value)) / (state.pBase || 1); foldTool(); });
$('#p-best').addEventListener('click', () => {
  if (state.pBestOff == null) return;
  // re-centre on the best period, so the slider can fine-tune around it
  state.pBase = state.pBase * (1 + state.pBestOff); state.pOff = 0; $('#poff').value = 0; state.pZoom = Math.min(5, state.pZoom + 1); state.pKey = null; foldTool();
});
function foldTool() {
  const a = $('#fold-sub'), b = $('#fold-prof'), c = $('#fold-curve');
  const turns = Number($('#poff').value);
  $('#poff-out').textContent = T.turns(turns);
  if (!state.upTo || !state.pBase) { [a, b, c].forEach((x, i) => empty(x, i ? '' : state.upTo ? (zh ? '先在“周期搜索”里找到周期' : 'find the period first, in "Period search"') : T.noData)); ['#p-trial', '#p-snr', '#p-bestv'].forEach((s) => ($(s).textContent = '–')); return; }
  const f = state.fold, pt = pTrial();
  const r = reduce(f, { dm: state.dm, pTrial: pt, upTo: state.upTo });
  // drawn a quarter turn later, so a pulse near phase 0 does not split across the edges
  const show = (row) => rotate(row, 0.25);
  {
    const { ctx, W, H } = prep(a);
    const pad = { l: 46, r: 10, t: 10, b: 22 };
    const rows = Array.from({ length: NSUB }, (_, s) => (r.sub[s] ? show(r.sub[s]) : new Float32Array(NBIN).fill(NaN)));
    const [lo, hi] = range(r.sub);
    image(ctx, rows.map((x) => x.map((v) => (isNaN(v) ? lo - 1e9 : v))), pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b, lo, Math.max(hi, lo + 3));
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('0', pad.l - 6, pad.t + 9); ctx.fillText(zh ? '10 分' : '10 min', pad.l - 6, H - pad.b); ctx.fillText(T.axisPhase, W - pad.r, H - 6);
  }
  {
    const { ctx, W, H } = prep(b);
    const prof = show(r.prof), mn = Math.min(...prof), mx = Math.max(...prof);
    line(ctx, [...prof].map((v, i) => [10 + ((W - 20) * (i + 0.5)) / NBIN, H - 10 - ((v - mn) / (mx - mn || 1)) * (H - 24)]), C.them, 2);
    tag(ctx, T.axisPhase, W - 10, 14, 'right');
  }
  const cur = snr(r.prof, noise(f, state.upTo)).snr;
  // S/N against trial period: ±32 turns of drift over the whole observation, halved each time you jump to the best
  const half = 32 / 2 ** state.pZoom;
  const span = (2 * half * state.pBase * state.pBase) / (NSUB * TSUB);
  const key = `${state.pBase}|${state.dm}|${state.upTo}|${half}`;
  if (state.pKey !== key) { state.pCurve = periodCurve(f, { dm: state.dm, center: state.pBase, span, n: 321, upTo: state.upTo }); state.pKey = key; }
  const curve = state.pCurve, best = curve.reduce((m, v) => (v[1] > m[1] ? v : m));
  state.pBestOff = best[0] / state.pBase - 1;
  {
    const { ctx, W, H } = prep(c);
    const pad = { l: 40, r: 12, t: 12, b: 26 };
    const mx = Math.max(...curve.map((v) => v[1]), 5);
    const X = (p) => pad.l + ((p - (state.pBase - span / 2)) / span) * (W - pad.l - pad.r), Y = (s) => H - pad.b - (Math.max(0, s) / mx) * (H - pad.t - pad.b);
    line(ctx, curve.map(([p, s]) => [X(p), Y(s)]), C.text, 1.5);
    ctx.fillStyle = C.them; ctx.fillRect(X(pt) - 1, pad.t, 2, H - pad.t - pad.b); ctx.fillRect(X(pt) - 3, Y(cur) - 3, 6, 6);
    axes(ctx, W, H, pad, { x: T.axisP, y: T.axisSnr });
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText(`−${T.turns(half)}`, pad.l, H - pad.b + 13); ctx.textAlign = 'right'; ctx.fillText(`+${T.turns(half)}`, W - pad.r, H - pad.b + 13);
  }
  $('#p-trial').textContent = pt >= 1 ? `${nf(pt, 7)} ${zh ? '秒' : 's'}` : `${nf(pt * 1e3, 7)} ${zh ? '毫秒' : 'ms'}`;
  $('#p-snr').textContent = nf(cur, 1);
  $('#p-bestv').textContent = best[1] > 6 ? (best[0] >= 1 ? `${nf(best[0], 7)} ${zh ? '秒' : 's'}` : `${nf(best[0] * 1e3, 7)} ${zh ? '毫秒' : 'ms'}`) : '–';
  const p = state.psr;
  // close enough: under a sixth of a turn of drift over the observation, and a DM error whose leftover sweep
  // is narrower than the pulse
  const band = state.obs.band, perDm = delay(1, band.lo) - delay(1, band.hi), width = 2.355 * p.prof[0].w * p.p;
  const ok = Math.abs(pt / p.p - 1) * NSUB * TSUB / p.p < 0.15 && Math.abs(state.dm - p.dm) * perDm < width && cur > 8;
  const msg = $('#found');
  msg.hidden = !ok;
  if (ok) msg.textContent = T.found(`${T.per(p.p)} · ${T.dmU(p.dm)}${p.mystery ? '' : ` · ${T.name(p)}`}`);
}

// --- spectrum: real measurements
function spectrum() {
  const cv = $('#spec');
  const p = state.psr, pts = FLUXES[p.id] ?? [];
  const { ctx, W, H } = prep(cv);
  const pad = { l: 46, r: 14, t: 14, b: 28 };
  const fmin = 20, fmax = 50000;
  const ys = pts.map((x) => x[1]).concat([flux(p, 100, FLUXES), flux(p, 10000, FLUXES)]);
  const smin = 10 ** Math.floor(Math.log10(Math.min(...ys) * 0.7)), smax = 10 ** Math.ceil(Math.log10(Math.max(...ys) * 1.4));
  const X = (f) => pad.l + ((Math.log10(f) - Math.log10(fmin)) / (Math.log10(fmax) - Math.log10(fmin))) * (W - pad.l - pad.r);
  const Y = (s) => H - pad.b - ((Math.log10(s) - Math.log10(smin)) / (Math.log10(smax) - Math.log10(smin))) * (H - pad.t - pad.b);
  // the bands, the current one brighter
  for (const b of BANDS) { ctx.fillStyle = b.id === state.band ? 'rgba(159,248,255,0.22)' : C.ctx.replace(/[\d.]+\)$/, '0.06)'); ctx.fillRect(X(b.lo), pad.t, X(b.hi) - X(b.lo), H - pad.t - pad.b); }
  for (let e = Math.log10(smin); e <= Math.log10(smax); e++) { const y = Y(10 ** e); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(10 ** e >= 1 ? String(10 ** e) : (10 ** e).toPrecision(1), pad.l - 6, y + 4); }
  for (const f of [100, 1000, 10000]) { ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(f >= 1000 ? `${f / 1000} GHz` : `${f} MHz`, X(f), H - pad.b + 14); }
  // fit
  const fitPts = []; for (let k = 0; k <= 80; k++) { const f = fmin * (fmax / fmin) ** (k / 80); fitPts.push([X(f), Y(flux(p, f, FLUXES))]); }
  ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b); ctx.clip();
  line(ctx, fitPts, C.them, 1.5);
  ctx.restore();
  // measurements: square points
  ctx.fillStyle = C.text;
  for (const [f, s] of pts) if (f >= fmin && f <= fmax) ctx.fillRect(X(f) - 2, Y(s) - 2, 4, 4);
  axes(ctx, W, H, pad, { y: T.axisMjy });
  const papers = new Set(pts.map((x) => x[2])).size;
  $('#s-pts').textContent = pts.length ? T.spectrumPts(pts.length, papers) : T.spectrumNone;
  $('#s-flux').textContent = T.mjy(flux(p, state.obs.fc, FLUXES));
  $('#s-alpha').textContent = nf(spectralIndex(p, state.obs.fc, FLUXES), 2);
  $('#s-band').textContent = T.band[state.band];
}

// ------------------------------------------------------------------ roster

$('#roster').innerHTML = PULSARS.map((p) => `<tr>
  <th scope="row"><button type="button" class="text-link" data-pick="${p.id}">${p.id.replace('-', '−')}</button>${p.b ? `<br><span class="muted">${p.b}</span>` : ''}</th>
  <td class="num">${T.per(p.p)}</td><td class="num">${sig(1 / p.p, 4)}</td><td class="num">${sig(p.dm, 4)}</td><td class="num">${T.dist(p.dist)}</td>
  <td>${NOTES[p.id][zh ? 0 : 1]}</td></tr>`).join('');
$$('[data-pick]').forEach((b) => b.addEventListener('click', () => { pick(b.dataset.pick); $('#observe').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }));

// ------------------------------------------------------------------ the loop

let lastTick = 0;
function frame(now) {
  if (!reduceMotion || !LH.drawn) { lighthouse(now); LH.drawn = true; }
  const dt = lastTick ? Math.min(0.1, (now - lastTick) / 1000) : 0; lastTick = now;
  if (state.obs?.visible && WF.next && !document.hidden) {
    // the waterfall scrolls whether or not we are recording; recording only adds to the folded data
    WF.acc += (dt * WF.cols) / (WF.window * WF.slow);
    const n = Math.floor(WF.acc);
    if (n > 0) { WF.acc -= n; push(Math.min(n, WF.cols)); drawWaterfall(); }
  }
  if (state.running) {
    state.t = Math.min(NSUB * TSUB, state.t + dt * SPEED);
    const k = Math.floor(state.t / TSUB);
    if (k !== state.upTo) { state.upTo = k; updateObs(); analyse(); }
    $('#o-time').textContent = T.obsTime(state.t);
    if (state.t >= NSUB * TSUB) { state.running = false; state.done = true; runButton(); }
  }
  requestAnimationFrame(frame);
}

let resizeT = 0;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { zoom(); drawWaterfall(); analyse(); spectrum(); }, 120); });

const want = new URLSearchParams(location.search).get('psr');
if (want && (byId(want) || want === 'mystery')) pick(want); else configure();
zoom();
requestAnimationFrame(frame);
