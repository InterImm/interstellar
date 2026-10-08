// The archive page: hero readouts, the duet heard from four stations and the letter outbox.
// Everything runs in the browser; letters are kept in this browser only.
import { ROSS_128 as STAR, YEAR_MS, LY_KM, message, messageProgress, emitted, storyNow, storyFromReal, realFromStory } from '../lib/light.js';
import { RATE, renderDuet, phaseRows, STATIONS } from '../lib/signals.js';

const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
const T = zh ? {
  arrived: '已抵达罗斯128',
  onTheWay: (p) => `已走了 ${p}`,
  arrives: '抵达',
  reply: '最早回音',
  sentOn: '发出',
  empty: '还没有发出的信。',
  remove: '删除',
  share: '复制链接',
  copied: '链接已复制',
  sharedTitle: '有人给罗斯128 b写了一封信',
  tooShort: '先写点什么。',
  saved: '已发出。它会以光速走 10.98 年。',
  unsaved: '已发出，但这个浏览器不能保存它；刷新后就看不到了。',
  listen: '收听 · 16 秒', stop: '停止',
  verdict: {
    earth: '合拍大约七分钟，一次慢慢的拍频，然后又合拍。这是为这里调的。',
    farside: '速率相同，但差着零点几个脉冲，而且慢慢漂移：每次经过多出两次左右的拍频。',
    isidis: '两串脉冲每次经过要相互滑过五十次左右。始终没有合上。',
    ceres: '和火星一样始终合不上，只是朝另一个方向滑，每次经过四十多次。',
  },
  plot: (name) => `${name}看到的相位图：时间向下，横向一个脉冲星周期`,
  km: (n) => `${n} 公里`,
  years: (n) => `${n} 年`,
} : {
  arrived: 'Has reached Ross 128',
  onTheWay: (p) => `${p} of the way`,
  arrives: 'Arrives',
  reply: 'Earliest answer',
  sentOn: 'Sent',
  empty: 'No letters sent yet.',
  remove: 'Delete',
  share: 'Copy link',
  copied: 'Link copied',
  sharedTitle: 'Someone wrote a letter to Ross 128 b',
  tooShort: 'Write something first.',
  saved: 'Sent. It will travel at light speed for 10.98 years.',
  unsaved: 'Sent, but this browser could not keep it; it will be gone after a reload.',
  listen: 'Listen · 16 s', stop: 'Stop',
  verdict: {
    earth: 'In step for about seven minutes, one slow beat, in step again. Tuned for here.',
    farside: 'The same rate, but a fraction of a pulse apart and slowly drifting: about two extra beats per pass.',
    isidis: 'The two trains slide past each other about fifty times a pass. They never settle.',
    ceres: 'Never in step, as at Mars, but sliding the other way, over forty times a pass.',
  },
  plot: (name) => `The phaseogram heard at ${name}: time runs down, one pulsar period across`,
  km: (n) => `${n} km`,
  years: (n) => `${n} yr`,
};

const $ = (s, root = document) => root.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const nf = (n, digits = 0) => n.toLocaleString(zh ? 'zh-CN' : 'en', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (f) => `${nf(f * 100, f < 0.01 ? 4 : 2)}%`;

// ------------------------------------------------------------------ the event, in story time

// Proposed canon. The first detection, at the Farside ledger node.
const DETECTED = Date.parse('2219-09-18T03:12:07.218Z');

function readouts() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('ro-left', ymd(emitted(DETECTED, STAR.distance)));
  const now = storyNow();
  const m = message(now, STAR.distance);
  set('ro-arrives', ymd(m.arrives));
  set('ro-answer', ymd(m.earliestReply));
  set('dist-arrives', ymd(m.arrives));
  set('dist-answer', ymd(m.earliestReply));
  set('dist-km', nf(STAR.distance * LY_KM / 1e12, 1));
}

// ------------------------------------------------------------------ the duet, from four stations

const ROWS = 48, COLS = 31;
let station = STATIONS[0];
let audio = null, playing = null;

// Columns to light in row r: their pulse, joined to the row above by a stepped run when the step is small
// (a slow slip reads as one line; a fast drift stays as scattered dots).
function traceCols(rows, r, cols, mid) {
  const colOf = (ph) => (Math.round(mid + ph * cols) % cols + cols) % cols;
  const c = colOf(rows[r]);
  if (!r) return [c];
  const p = colOf(rows[r - 1]);
  let d = c - p; if (d > cols / 2) d -= cols; if (d < -cols / 2) d += cols;
  if (Math.abs(d) > cols / 4) return [c];
  return Array.from({ length: Math.abs(d) + 1 }, (_, k) => (p + Math.sign(d) * k + cols) % cols);
}

function drawDuet(t = null, sig = null) {
  const canvas = $('#duet');
  if (!canvas) return;
  const W = canvas.clientWidth || 300, H = canvas.clientHeight || 360;
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = getComputedStyle(canvas), col = (v) => s.getPropertyValue(v).trim();
  const cell = Math.floor(Math.min((W - 16) / COLS, (H - 16) / ROWS));
  const x0 = Math.round((W - cell * COLS) / 2), y0 = Math.round((H - cell * ROWS) / 2), mid = (COLS - 1) / 2;
  const rows = phaseRows(ROWS, station);
  const upto = t == null || !sig ? ROWS : Math.round(Math.max(0, Math.min(1, (t - sig.intro) / sig.pass)) * ROWS);
  const sq = (c, r, colour) => { ctx.fillStyle = colour; ctx.fillRect(x0 + c * cell, y0 + r * cell, cell - 1, cell - 1); };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) sq(c, r, col('--plot-grid'));
    sq(mid, r, col('--plot-dim'));
    if (r < upto) for (const c of traceCols(rows, r, COLS, mid)) sq(c, r, col('--them'));
  }
  canvas.setAttribute('aria-label', T.plot(station.name[zh ? 'zh' : 'en']));
}

function stopDuet() {
  if (!playing) return;
  const p = playing; playing = null;
  try { p.source.stop(); } catch { /* already ended */ }
  $('#duet-play').textContent = T.listen;
  drawDuet();
}

function playDuet() {
  if (playing) { stopDuet(); return; }
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume?.();
  const sig = renderDuet({ station });
  const buf = audio.createBuffer(1, sig.samples.length, RATE);
  buf.getChannelData(0).set(sig.samples);
  const source = audio.createBufferSource();
  source.buffer = buf; source.connect(audio.destination);
  const start = audio.currentTime + 0.05;
  source.start(start);
  playing = { source };
  source.onended = () => { if (playing?.source === source) stopDuet(); };
  $('#duet-play').textContent = T.stop;
  const tick = () => { if (playing?.source !== source) return; drawDuet(audio.currentTime - start, sig); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

function duetDemo() {
  if (!$('#duet')) return;
  const pick = (id) => {
    station = STATIONS.find((x) => x.id === id) || STATIONS[0];
    document.querySelectorAll('[data-station]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.station === station.id)));
    $('#duet-verdict').textContent = T.verdict[station.id];
    $('#duet-verdict').classList.toggle('is-found', station.id === 'earth');
    stopDuet();
    drawDuet();
  };
  document.querySelectorAll('[data-station]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.station)));
  $('#duet-play').addEventListener('click', playDuet);
  addEventListener('resize', () => { if (!playing) drawDuet(); });
  pick('earth');
}

// ------------------------------------------------------------------ letters

const KEY = 'interimm-signal-letters';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } };
let letters = load();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function letterCard(l, { shared = false } = {}) {
  const sentStory = storyFromReal(l.sent);
  const m = message(sentStory, STAR.distance);
  return `<article class="letter${shared ? ' letter-shared' : ''}" data-id="${esc(l.id)}">
    <p class="letter-body">${esc(l.text)}</p>
    <div class="letter-track" aria-hidden="true"><span class="letter-bar"></span><span class="letter-dot"></span></div>
    <p class="letter-progress readout"></p>
    <dl class="letter-meta readout">
      <div><dt>${T.sentOn}</dt><dd>${ymd(sentStory)}</dd></div>
      <div><dt>${T.arrives}</dt><dd>${ymd(m.arrives)}</dd></div>
      <div><dt>${T.reply}</dt><dd>${ymd(m.earliestReply)}</dd></div>
    </dl>
    ${shared ? '' : `<div class="letter-actions"><button class="btn btn-ghost" type="button" data-share>${T.share}</button><button class="btn btn-ghost" type="button" data-remove>${T.remove}</button></div>`}
  </article>`;
}

function renderOutbox() {
  const box = $('#outbox');
  if (!box) return;
  box.innerHTML = letters.length ? letters.slice().reverse().map((l) => letterCard(l)).join('') : `<p class="note">${T.empty}</p>`;
  tickLetters();
}

function tickLetters() {
  document.querySelectorAll('.letter').forEach((el) => {
    const l = letters.find((x) => x.id === el.dataset.id) || sharedLetter;
    if (!l) return;
    const p = messageProgress(l.sent, STAR.distance, Date.now());
    el.style.setProperty('--progress', p.fraction);
    el.querySelector('.letter-progress').textContent = p.arrived ? T.arrived : `${T.onTheWay(pct(p.fraction))} · ${T.km(nf(p.travelled * LY_KM, 0))}`;
  });
}

function shareUrl(l) {
  const u = new URL(location.href);
  u.hash = 'write';
  u.searchParams.set('letter', l.text);
  u.searchParams.set('sent', String(l.sent));
  return u.toString();
}

let sharedLetter = null;
function sharedFromUrl() {
  const q = new URLSearchParams(location.search);
  const text = q.get('letter');
  const sent = Number(q.get('sent'));
  if (!text || !Number.isFinite(sent)) return;
  sharedLetter = { id: 'shared', text: text.slice(0, 1000), sent };
  const box = $('#shared');
  box.hidden = false;
  box.innerHTML = `<h3 class="card-title">${T.sharedTitle}</h3>${letterCard(sharedLetter, { shared: true })}`;
}

function letterForm() {
  const form = $('#write-form');
  if (!form) return;
  const note = $('#write-note');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('#letter').value.trim();
    if (!text) { note.textContent = T.tooShort; return; }
    letters.push({ id: Math.random().toString(36).slice(2, 10), text: text.slice(0, 1000), sent: Date.now() });
    note.textContent = save(letters) ? T.saved : T.unsaved;
    $('#letter').value = '';
    renderOutbox();
  });
  $('#outbox').addEventListener('click', async (e) => {
    const card = e.target.closest('.letter');
    if (!card) return;
    const l = letters.find((x) => x.id === card.dataset.id);
    if (e.target.closest('[data-remove]')) {
      letters = letters.filter((x) => x !== l);
      save(letters);
      renderOutbox();
    } else if (e.target.closest('[data-share]')) {
      const url = shareUrl(l);
      try { await navigator.clipboard.writeText(url); note.textContent = T.copied; } catch { prompt(T.share, url); }
    }
  });
}

// ------------------------------------------------------------------ start

readouts();
duetDemo();
sharedFromUrl();
letterForm();
renderOutbox();
setInterval(tickLetters, 1000);
setInterval(readouts, 60e3);

// for the console
window.InterImmSignal = { STAR, DETECTED: new Date(DETECTED), realFromStory, YEAR_MS };
