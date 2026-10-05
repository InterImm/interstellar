// The pulsar ledger, live: the pulsars that keep the MC clock, the ledger nodes, and the timing residuals
// where the Ross 128 beacon keeps showing up. Everything is computed in the browser from the clock,
// so every visitor sees the same numbers at the same moment.
//
// Periods are real (ATNF Pulsar Catalogue, rounded). Pulse phases are illustrative: the count starts at
// the story epoch below with phase 0 and ignores spin-down and the motion of the observer.
import { storyNow } from '../lib/light.js';

const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
const EPOCH = Date.parse('2219-01-01T00:00:00Z'); // story time: the ledger's pulse count starts here
const DETECTED = Date.parse('2219-09-18T03:12:07.218Z');
// Proposed canon: the beacon repeats every 9 h 41 m 13 s (as received) and each pass lasts 22 minutes.
const BEACON_PERIOD = (9 * 3600 + 41 * 60 + 13) * 1000;
const BEACON_LENGTH = 22 * 60 * 1000;

export const PULSARS = [
  { name: 'J0437−4715', p: 0.005757452, note: { en: 'brightest millisecond pulsar', zh: '最亮的毫秒脉冲星' } },
  { name: 'J1909−3744', p: 0.002947108, note: { en: 'the steadiest clock', zh: '最稳的钟' } },
  { name: 'J1713+0747', p: 0.004570137 },
  { name: 'J0030+0451', p: 0.004865453 },
  { name: 'J1744−1134', p: 0.004074546 },
  { name: 'J1012+5307', p: 0.005255749 },
  { name: 'J2145−0750', p: 0.016052424 },
  { name: 'J1022+1001', p: 0.016452930 },
  { name: 'B1937+21', p: 0.001557806, note: { en: 'the first millisecond pulsar', zh: '第一颗毫秒脉冲星' } },
  { name: 'B0531+21', p: 0.033392, note: { en: 'the Crab', zh: '蟹状星云脉冲星' } },
  { name: 'B0329+54', p: 0.714520 },
  { name: 'B1919+21', p: 1.337302, note: { en: 'the first pulsar ever found', zh: '人类发现的第一颗脉冲星' } },
];

// Ledger nodes and their one-way light time to Farside, in seconds (illustrative 2219 geometry).
const NODES = [
  { id: 'farside', name: { en: 'Farside, Moon', zh: '月背' }, light: 0, hue: 0 },
  { id: 'earth', name: { en: 'Earth', zh: '地球' }, light: 1.3, hue: 1 },
  { id: 'isidis', name: { en: 'Isidis, Mars', zh: '火星伊希地' }, light: 1110, hue: 2 },
  { id: 'ceres', name: { en: 'Ceres', zh: '谷神星' }, light: 1720, hue: 3 },
];

const T = zh ? {
  pulses: '次', perSecond: (n) => `每秒 ${n} 次`, tooFast: '太快，眼睛看不出', nextPass: '下一次经过', passing: '正在经过', since: '首次接收以来',
  passes: '次经过', synced: '已同步', delay: (s) => s < 60 ? `光延迟 ${s.toFixed(1)} 秒` : `光延迟 ${(s / 60).toFixed(1)} 分`, hours: '小时前', now: '现在', beacon: '罗斯128信标',
} : {
  pulses: 'pulses', perSecond: (n) => `${n} per second`, tooFast: 'too fast to see', nextPass: 'Next pass', passing: 'Passing now', since: 'since first received',
  passes: 'passes', synced: 'in sync', delay: (s) => s < 60 ? `light delay ${s.toFixed(1)} s` : `light delay ${(s / 60).toFixed(1)} min`, hours: 'h ago', now: 'now', beacon: 'Ross 128 beacon',
};

const $ = (s) => document.querySelector(s);
const nf = (n, d = 0) => n.toLocaleString(zh ? 'zh-CN' : 'en', { maximumFractionDigits: d, minimumFractionDigits: d });
const pad = (n) => String(n).padStart(2, '0');
const hms = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };

// deterministic noise: the same story minute gives the same residual for everyone
function noise(seed) {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296 - 0.5;
}

// ------------------------------------------------------------------ pulsar table

function buildTable() {
  const body = $('#pulsar-rows');
  body.innerHTML = PULSARS.map((ps, i) => `<tr data-i="${i}">
    <td><span class="beat" aria-hidden="true"></span><span class="psr">${ps.name}</span>${ps.note ? `<small>${ps.note[zh ? 'zh' : 'en']}</small>` : ''}</td>
    <td class="num">${ps.p >= 0.1 ? `${nf(ps.p, 4)} s` : `${nf(ps.p * 1000, 3)} ms`}</td>
    <td class="num rate">${ps.p >= 0.25 ? T.perSecond(nf(1 / ps.p, 2)) : T.tooFast}</td>
    <td class="num count">–</td>
  </tr>`).join('');
}

const rows = [];
function tickTable() {
  if (!rows.length) document.querySelectorAll('#pulsar-rows tr').forEach((tr) => rows.push({ tr, count: tr.querySelector('.count'), beat: tr.querySelector('.beat'), ps: PULSARS[tr.dataset.i] }));
  const t = (storyNow().getTime() - EPOCH) / 1000;
  for (const r of rows) {
    const n = t / r.ps.p;
    r.count.textContent = nf(Math.floor(n));
    // flash on each pulse when slow enough to see; otherwise stay lit
    const phase = n - Math.floor(n);
    r.beat.style.opacity = r.ps.p >= 0.25 ? (phase < 0.08 ? 1 : 0.18) : 0.85;
  }
  requestAnimationFrame(tickTable);
}

// ------------------------------------------------------------------ nodes and beacon

function beaconState(now) {
  const since = now - DETECTED;
  const k = Math.floor(since / BEACON_PERIOD);
  const into = since - k * BEACON_PERIOD;
  return { passes: k + 1, passing: into < BEACON_LENGTH, next: BEACON_PERIOD - into, into };
}

function tickNodes() {
  const now = storyNow().getTime();
  const b = beaconState(now);
  $('#beacon-state').textContent = b.passing ? T.passing : T.nextPass;
  $('#beacon-next').textContent = b.passing ? hms(BEACON_LENGTH - b.into) : hms(b.next);
  $('#beacon-passes').textContent = nf(b.passes);
  document.body.classList.toggle('is-passing', b.passing);
  $('#nodes').innerHTML = NODES.map((n) => `<li><span class="node-dot sw-c${n.hue + 1}" aria-hidden="true"></span><b>${n.name[zh ? 'zh' : 'en']}</b><span class="readout">${n.light ? T.delay(n.light) : '0 s'}</span><span class="node-ok">${T.synced}</span></li>`).join('');
}

// ------------------------------------------------------------------ residuals

function drawResiduals() {
  const canvas = $('#residuals');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = getComputedStyle(canvas);
  const col = (v) => s.getPropertyValue(v).trim();
  const hues = [col('--c1'), col('--c2'), col('--c3'), col('--c4')]; // the kit's categorical series
  ctx.clearRect(0, 0, W, H);

  const now = storyNow().getTime();
  const span = 48 * 3600e3, step = 5 * 60e3;
  const x = (t) => ((t - (now - span)) / span) * (W - 48) + 40;
  const y = (v) => H / 2 - v * (H / 2 - 18);

  // beacon passes as red bands
  ctx.fillStyle = col('--accent-soft');
  const first = DETECTED + Math.floor((now - span - DETECTED) / BEACON_PERIOD) * BEACON_PERIOD;
  for (let t = first; t < now; t += BEACON_PERIOD) {
    if (t + BEACON_LENGTH < now - span) continue;
    const a = Math.max(x(t), 40), bnd = Math.min(x(t + BEACON_LENGTH), W - 8);
    ctx.fillRect(a, 8, Math.max(2, bnd - a), H - 16);
  }

  // axes
  ctx.strokeStyle = col('--border'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, H / 2 + 0.5); ctx.lineTo(W - 8, H / 2 + 0.5); ctx.stroke();
  ctx.fillStyle = col('--muted'); ctx.font = `11px ${col('--font-mono') || 'monospace'}`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('+100', 34, y(0.5)); ctx.fillText('0', 34, H / 2); ctx.fillText('−100', 34, y(-0.5));
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (let h = 48; h >= 0; h -= 12) { ctx.textAlign = h ? 'center' : 'right'; ctx.fillText(h ? `−${h} h` : T.now, h ? x(now - h * 3600e3) : W - 8, H - 2); }

  // one residual series per node; the beacon adds a periodic kick while it passes
  NODES.forEach((n, ni) => {
    ctx.strokeStyle = hues[ni]; ctx.globalAlpha = ni ? 0.55 : 0.9; ctx.lineWidth = ni ? 1 : 1.4;
    ctx.beginPath();
    for (let t = Math.floor((now - span) / step) * step, i = 0; t <= now; t += step, i++) {
      const seen = t - n.light * 1000; // each node sees the sky a little later
      const k = Math.floor(seen / step);
      let v = (noise(k * 7 + ni) + noise(k * 13 + ni * 3) * 0.6) * 0.32;
      const into = (seen - DETECTED) % BEACON_PERIOD;
      if (seen > DETECTED && into < BEACON_LENGTH) v += Math.sin((into / BEACON_LENGTH) * Math.PI * 6) * 0.45;
      i ? ctx.lineTo(x(t), y(v)) : ctx.moveTo(x(t), y(v));
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ start

buildTable();
requestAnimationFrame(tickTable);
tickNodes();
setInterval(tickNodes, 1000);
drawResiduals();
setInterval(drawResiduals, 60e3);
addEventListener('resize', drawResiduals);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', drawResiduals);
$('#since-detected').textContent = nf(Math.floor((storyNow().getTime() - DETECTED) / 86400e3));
