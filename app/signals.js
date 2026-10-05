// Five transmissions: draw each one, and play it. The signals themselves are built in lib/signals.js;
// this file only draws them in the kit's pixel style and drives the audio (Web Audio, started by a click).
import { BITS, PRIMES, WIDTH, HEIGHT } from './beacon.js';
import {
  RATE, renderPicture, renderShadow, shadowSequence, renderPulsars, pulsarShifts, renderChords, CHORDS, LINES,
  renderAlpha, alphaRounds, ALPHA_INV,
} from '../lib/signals.js';

const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
const $ = (s) => document.querySelector(s);
const nf = (n, d = 0) => n.toLocaleString(zh ? 'zh-CN' : 'en', { maximumFractionDigits: d, minimumFractionDigits: d });
// century years, as the shadow sends them (astronomical -1100 is 1101 BCE; shown as 1100 BCE)
const yr = (y) => { const bce = y <= 0 ? Math.max(1, Math.round((1 - y) / 100) * 100) : 0; return zh ? (bce ? `前${bce}` : `${y}`) : bce ? `${bce} BCE` : `${y}`; };

const T = zh ? {
  listen: '收听', stop: '停止', bit: (i) => `第 ${i + 1} / 667 位`, prime: (p) => `前导 · ${p}`, ready: '点“收听”',
  earth: (y, h) => `地球 · ${yr(y)} · ${h ? `${nf(h, 1)} 小时` : '没有凌日'}`, ross: '罗斯128 b · 1.3 小时 · 深 31 倍',
  pulsar: (p) => `${p.name} · ${p.p < 0.1 ? `${nf(1 / p.p, 0)} Hz` : `每 ${nf(p.p, 2)} 秒一下`}`, all: '十二颗一起',
  chord: (i) => `和弦 ${i + 1} · ${chordName(i)}`, round: (k) => `第 ${k + 1} 轮 · 滑移 ${nf((k * ALPHA_INV) % 1, 3)}`,
} : {
  listen: 'Listen', stop: 'Stop', bit: (i) => `bit ${i + 1} of 667`, prime: (p) => `preamble · ${p}`, ready: 'press Listen',
  earth: (y, h) => `Earth · ${yr(y)} · ${h ? `${nf(h, 1)} h` : 'no transit'}`, ross: 'Ross 128 b · 1.3 h · 31× deeper',
  pulsar: (p) => `${p.name} · ${p.p < 0.1 ? `${nf(1 / p.p, 0)} Hz` : `one tick per ${nf(p.p, 2)} s`}`, all: 'all twelve together',
  chord: (i) => `chord ${i + 1} · ${chordName(i)}`, round: (k) => `round ${k + 1} · slip ${nf((k * ALPHA_INV) % 1, 3)}`,
};
const L = (o) => o[zh ? 'zh' : 'en'];
const chordName = (i) => [...new Set(Object.keys(CHORDS[i].lines).map((k) => L(LINES[k].name)))].join(zh ? '、' : ', ');

// ------------------------------------------------------------------ drawing helpers

function prep(canvas) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = getComputedStyle(canvas);
  const col = (v) => s.getPropertyValue(v).trim();
  ctx.font = `11px ${col('--font-mono') || 'monospace'}`;
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H, col };
}
const px = (v) => Math.round(v) + 0.5;
// the event sounding at time t, or null
const current = (events, t) => (t == null ? null : events.filter((e) => e.t <= t).pop() ?? null);

// ------------------------------------------------------------------ 1. picture

function drawPicture(t) {
  const { ctx, W, H, col } = prep($('#cv-picture'));
  const sig = signal('picture');
  const ev = current(sig.events, t);
  const upto = t == null ? BITS.length : ev?.kind === 'bit' ? ev.i + 1 : 0;
  const cell = Math.floor(Math.min((W - 24) / WIDTH, (H - 24) / HEIGHT));
  const x0 = Math.round((W - cell * WIDTH) / 2), y0 = Math.round((H - cell * HEIGHT) / 2);
  for (let i = 0; i < BITS.length; i++) {
    const x = x0 + (i % WIDTH) * cell, y = y0 + Math.floor(i / WIDTH) * cell;
    ctx.fillStyle = i < upto ? (BITS[i] ? col('--them') : col('--plot-grid')) : col('--plot-grid');
    if (i < upto || !BITS[i]) ctx.fillRect(x, y, cell - 1, cell - 1);
    else { ctx.globalAlpha = 0.25; ctx.fillStyle = col('--plot-dim'); ctx.fillRect(x, y, cell - 1, cell - 1); ctx.globalAlpha = 1; }
  }
  if (ev?.kind === 'bit') { const x = x0 + (ev.i % WIDTH) * cell, y = y0 + Math.floor(ev.i / WIDTH) * cell; ctx.strokeStyle = col('--us'); ctx.strokeRect(px(x - 1), px(y - 1), cell, cell); }
  caption('picture', ev ? (ev.kind === 'bit' ? T.bit(ev.i) : T.prime(ev.p)) : null);
}

// ------------------------------------------------------------------ 2. shadow

function drawShadow(t) {
  const { ctx, W, H, col } = prep($('#cv-shadow'));
  const sig = signal('shadow');
  const L0 = 12, R0 = 12, top = 22, bot = H - 30;
  const X = (s) => L0 + (s / sig.duration) * (W - L0 - R0);
  const step = Math.max(1, Math.floor(sig.env.length / (W - L0 - R0)));
  // brightness envelope as a staircase; us (Earth's dips) in yellow, them (their own) in white-cyan
  for (const e of sig.events) {
    ctx.fillStyle = e.kind === 'earth' ? col('--us-soft') : col('--them-soft');
    if (e.visible) ctx.fillRect(X(e.t), top, Math.max(1, X(e.end) - X(e.t)), bot - top);
  }
  ctx.strokeStyle = col('--plot-axis'); ctx.beginPath(); ctx.moveTo(L0, px(top)); ctx.lineTo(W - R0, px(top)); ctx.stroke();
  ctx.lineWidth = 2;
  let last = null;
  for (let i = 0; i < sig.env.length; i += step) {
    const s = i / RATE, x = Math.round(X(s)), y = Math.round(top + (1 - sig.env[i]) * (bot - top));
    const e = current(sig.events, s);
    const c = e && s < e.end && e.kind === 'ross' ? col('--them') : col('--us');
    if (!last || last.c !== c) { if (last) ctx.stroke(); ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(last ? last.x : x, last ? last.y : y); }
    ctx.lineTo(x, y); last = { x, y, c };
  }
  ctx.stroke(); ctx.lineWidth = 1;
  // years under every third Earth dip, and "them" under theirs
  ctx.fillStyle = col('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  sig.events.forEach((e, i) => {
    if (e.kind === 'earth' && i % 4 === 0) ctx.fillText(yr(e.year), X((e.t + e.end) / 2), H - 10);
  });
  const firstRoss = sig.events.find((e) => e.kind === 'ross');
  ctx.fillStyle = col('--them'); ctx.fillText(zh ? '他们' : 'them', X(firstRoss.t + 1), H - 10);
  const ev = current(sig.events, t);
  if (t != null) { ctx.strokeStyle = col('--text'); ctx.beginPath(); ctx.moveTo(px(X(t)), top - 6); ctx.lineTo(px(X(t)), bot + 4); ctx.stroke(); }
  caption('shadow', ev ? (ev.kind === 'earth' ? T.earth(ev.year, ev.visible ? ev.hours : 0) : T.ross) : null);
}

// ------------------------------------------------------------------ 3. pulsars

const PSR = pulsarShifts(2219);
function drawPulsars(t) {
  const { ctx, W, H, col } = prep($('#cv-pulsars'));
  const sig = signal('pulsars');
  const ev = current(sig.events, t);
  const active = ev && t < ev.end ? ev : null;
  const rowH = (H - 16) / PSR.length, name = Math.min(120, W * 0.32), x0 = name + 10, x1 = W - 14;
  PSR.forEach((p, i) => {
    const y = 8 + i * rowH, mid = Math.round(y + rowH / 2);
    const on = active && (active.kind === 'all' || active.i === i);
    ctx.fillStyle = on ? col('--text') : col('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(p.name, 8, mid);
    ctx.fillStyle = on ? col('--them-soft') : col('--plot-grid'); ctx.fillRect(x0, mid - 4, x1 - x0, 8);
    ctx.fillStyle = col('--us'); ctx.fillRect(x0, mid - 6, 3, 12);
    ctx.fillStyle = col('--them'); ctx.fillRect(Math.round(x0 + p.shift * (x1 - x0)) - 1, mid - 6, 3, 12);
  });
  caption('pulsars', active ? (active.kind === 'all' ? T.all : T.pulsar(PSR[active.i])) : null);
}

// ------------------------------------------------------------------ 4. chords

function drawChords(t) {
  const { ctx, W, H, col } = prep($('#cv-chords'));
  const sig = signal('chords');
  const ev = current(sig.events, t);
  const active = ev && t < ev.end ? ev.i : null;
  const lo = Math.log10(1000), hi = Math.log10(130000);
  const left = 12, right = W - 12, top = 8, bot = H - 26;
  const X = (mhz) => left + ((Math.log10(mhz) - lo) / (hi - lo)) * (right - left);
  const rowH = (bot - top) / CHORDS.length;
  // axis
  ctx.fillStyle = col('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (const g of [1, 3, 10, 30, 100]) { ctx.fillText(`${g} GHz`, X(g * 1000), H - 8); ctx.fillStyle = col('--plot-grid'); ctx.fillRect(Math.round(X(g * 1000)), top, 1, bot - top); ctx.fillStyle = col('--muted'); }
  CHORDS.forEach((c, i) => {
    const base = Math.round(top + (i + 1) * rowH - 3);
    const on = active === i || (active == null && t == null);
    ctx.fillStyle = col('--plot-axis'); ctx.fillRect(left, base, right - left, 1);
    for (const [k, loud] of Object.entries(c.lines)) {
      const line = LINES[k], h = Math.max(3, Math.round(loud * (rowH - 8)));
      const x = Math.round(X(line.mhz)) - 2;
      ctx.globalAlpha = on ? 1 : 0.35;
      if (line.unknown) { ctx.strokeStyle = col('--them'); ctx.strokeRect(x + 0.5, base - h + 0.5, 4, h); }
      else { ctx.fillStyle = col('--them'); ctx.fillRect(x, base - h, 5, h); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = active === i ? col('--text') : col('--muted'); ctx.textAlign = 'left';
    ctx.fillText(String(i + 1), left + 2, base - rowH + 14);
  });
  caption('chords', active != null ? T.chord(active) : null);
}

// ------------------------------------------------------------------ 5. the number

const ROUNDS = alphaRounds(29);
function drawNumber(t) {
  const { ctx, W, H, col } = prep($('#cv-number'));
  const sig = signal('number');
  const ev = current(sig.events, t);
  // zoomed in on one gap between two fast clicks: the left edge is the click the pip follows, the right edge
  // the next one. The pip slips 0.036 of the gap per round, so it walks across and wraps after 28 rounds.
  const left = 40, right = W - 40, rh = (H - 16) / ROUNDS.length;
  ROUNDS.forEach((r, k) => {
    const y = Math.round(8 + k * rh), h = Math.max(2, Math.floor(rh) - 1);
    ctx.fillStyle = ev && ev.k === k ? col('--them-soft') : col('--plot-grid');
    ctx.fillRect(left, y, right - left, h);
    ctx.fillStyle = col('--them');
    ctx.fillRect(Math.round(left + r.slip * (right - left)) - 3, y, 6, h);
  });
  ctx.fillStyle = col('--plot-axis');
  ctx.fillRect(left - 2, 4, 2, H - 8); ctx.fillRect(right, 4, 2, H - 8);
  ctx.fillStyle = col('--muted'); ctx.textBaseline = 'top'; ctx.textAlign = 'right';
  ctx.fillText(zh ? '这一下' : 'click', left - 6, 8); ctx.textAlign = 'left'; ctx.fillText(zh ? '下一下' : 'next', right + 6, 8);
  caption('number', ev ? T.round(ev.k) : null);
}

// ------------------------------------------------------------------ signals, built once each

const BUILD = {
  picture: () => renderPicture(BITS, PRIMES),
  shadow: () => renderShadow(shadowSequence()),
  pulsars: () => renderPulsars(PSR),
  chords: () => renderChords(),
  number: () => renderAlpha({ rounds: 6 }),
};
const DRAW = { picture: drawPicture, shadow: drawShadow, pulsars: drawPulsars, chords: drawChords, number: drawNumber };
const cache = {};
const signal = (id) => (cache[id] ??= BUILD[id]());
function caption(id, text) { const el = document.querySelector(`[data-cap="${id}"]`); if (el) el.textContent = text ?? T.ready; }

// ------------------------------------------------------------------ audio

let audio = null;
let playing = null; // { id, source, start, button }

function stop() {
  if (!playing) return;
  const p = playing; playing = null;
  try { p.source.stop(); } catch { /* already ended */ }
  p.button.textContent = p.label; p.button.setAttribute('aria-pressed', 'false');
  DRAW[p.id](null);
}

function play(id, button) {
  const was = playing?.id;
  stop();
  if (was === id) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume?.();
  const sig = signal(id);
  const buf = audio.createBuffer(1, sig.samples.length, RATE);
  buf.copyToChannel ? buf.copyToChannel(sig.samples, 0) : buf.getChannelData(0).set(sig.samples);
  const source = audio.createBufferSource();
  source.buffer = buf; source.connect(audio.destination);
  const label = button.textContent;
  playing = { id, source, start: audio.currentTime + 0.05, button, label };
  source.start(playing.start);
  source.onended = () => { if (playing?.source === source) stop(); };
  button.textContent = T.stop; button.setAttribute('aria-pressed', 'true');
  const tick = () => {
    if (!playing || playing.source !== source) return;
    DRAW[id](Math.max(0, audio.currentTime - playing.start));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

document.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => play(b.dataset.play, b)));

const drawAll = () => Object.keys(DRAW).forEach((id) => { if (playing?.id !== id) DRAW[id](null); });
let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawAll, 100); });
drawAll();
