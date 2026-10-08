// The entrance page: hero readouts, the beacon decoder and the letter outbox.
// Everything runs in the browser; letters are kept in this browser only.
import { ROSS_128 as STAR, YEAR_MS, LY_KM, message, messageProgress, emitted, storyNow, storyFromReal, realFromStory } from '../lib/light.js';
import { BITS, PRIMES, WIDTH, HEIGHT, PARTS } from './beacon.js';

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
  fold: (w) => `每行 ${w} 位`,
  found: `23 × 29 = 667。两个都是质数，只有这一种折法能成图。`,
  notYet: (w) => (667 % w === 0 ? `${w} 能整除 667，但图是斜的。试试另一个因数。` : `${w} 除不尽 667，最后一行是残的。`),
  parts: { count: '数数：1 到 7，用三位二进制', system: '一颗小恒星，只有一颗行星，被圈了起来', dish: '一面天线，向外发出电波', hydrogen: '氢原子的自旋翻转：1420.405 MHz，就是这个频率' },
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
  fold: (w) => `${w} bits per row`,
  found: '23 × 29 = 667. Both are prime, so this is the only fold that makes a picture.',
  notYet: (w) => (667 % w === 0 ? `${w} divides 667, but the picture is skewed. Try the other factor.` : `${w} does not divide 667; the last row is ragged.`),
  parts: { count: 'Counting: 1 to 7, in three-bit binary', system: 'A small star with one planet, circled', dish: 'A dish, sending waves outward', hydrogen: 'The hydrogen spin flip: 1420.405 MHz, the frequency they chose' },
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

// ------------------------------------------------------------------ the beacon

function preamble() {
  const strip = $('#bitstrip');
  if (strip) strip.textContent = BITS.join('');
  const svg = $('#preamble');
  if (!svg) return;
  // pulses separated by gaps of 2, 3, 5, 7, ... units
  const unit = 4, h = 36;
  let x = 6;
  const marks = [];
  const labels = [];
  for (const p of PRIMES) {
    marks.push(`<rect x="${x}" y="6" width="2" height="${h - 12}" rx="1" />`);
    labels.push(`<text x="${x + (p * unit) / 2 + 1}" y="${h + 8}">${p}</text>`);
    x += p * unit;
  }
  marks.push(`<rect x="${x}" y="6" width="2" height="${h - 12}" rx="1" />`);
  svg.setAttribute('viewBox', `0 0 ${x + 8} ${h + 12}`);
  svg.innerHTML = `<g class="pulses">${marks.join('')}</g><g class="gaps">${labels.join('')}</g>`;
}

function decoder() {
  const canvas = $('#fold');
  const range = $('#fold-width');
  if (!canvas || !range) return;
  const out = $('#fold-value');
  const verdict = $('#fold-verdict');
  const legend = $('#fold-legend');
  const ctx = canvas.getContext('2d');

  const draw = () => {
    const w = Number(range.value);
    const rows = Math.ceil(BITS.length / w);
    const cell = Math.max(3, Math.floor(Math.min(560 / w, 560 / rows)));
    canvas.width = w * cell;
    canvas.height = rows * cell;
    const s = getComputedStyle(canvas);
    ctx.fillStyle = s.getPropertyValue('--scope').trim() || '#0d1228';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const solved = w === WIDTH;
    BITS.forEach((b, i) => {
      if (!b) return;
      const x = (i % w) * cell, y = Math.floor(i / w) * cell;
      ctx.fillStyle = solved ? s.getPropertyValue('--signal').trim() : s.getPropertyValue('--noise').trim();
      ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    });
    out.textContent = T.fold(w);
    canvas.setAttribute('aria-label', solved ? Object.values(T.parts).join('. ') : T.fold(w));
    verdict.textContent = solved ? T.found : T.notYet(w);
    verdict.classList.toggle('is-found', solved);
    legend.hidden = !solved;
    if (solved) {
      legend.style.setProperty('--rows', HEIGHT);
      legend.innerHTML = PARTS.map(([a, b, key]) => `<li style="--from:${a};--to:${b + 1}"><span class="readout">${pad(a)}–${pad(b)}</span> ${T.parts[key]}</li>`).join('');
    }
  };
  range.addEventListener('input', draw);
  $('#fold-hint')?.addEventListener('click', () => { range.value = WIDTH; draw(); range.focus(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', draw);
  draw();
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
preamble();
decoder();
sharedFromUrl();
letterForm();
renderOutbox();
setInterval(tickLetters, 1000);
setInterval(readouts, 60e3);

// for the console
window.InterImmSignal = { STAR, DETECTED: new Date(DETECTED), realFromStory, YEAR_MS };
