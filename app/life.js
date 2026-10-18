// Between Replies: the page. The rules are in lib/life.js; this file draws them and asks the questions.
import { createLife, step, choose, summary, text, exchange, place, WORLDS, job, oneIn, fmtOneIn, inFlight, newSeed } from '../lib/life.js?v=1';
import { Vocabulary, drawWords, rowsSvg } from '../lib/glyph.js';
import { ROSS_128 } from '../lib/light.js';

const lang = document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
const T = lang === 'zh' ? {
  age: (a) => `${a} 岁`, none: '还没有', pause: '暂停', resume: '继续', next: '跳到下一个抉择',
  random: '随便选一个', again: '再活一次', copy: '复制这一生', copied: '已复制', link: '同一个出生的链接',
  people: (n) => `${n} 人`, heard: (n) => `${n} 次`,
  words: '你提过的词', taken: '进了回信', notTaken: '没用上', noWords: '你没来得及提一个词。',
  endTitle: (age) => `${age} 年`,
  inFlight: (n) => `你离开时，还有 ${n} 封信在光里走着。`,
  you: '你', worldOf: (p) => `${WORLDS[p.world].zh} · ${p.zh}`,
  odds: (p) => (oneIn(p) < 1.05 ? '几乎所有人' : `1 / ${fmtOneIn(oneIn(p), 'zh')}`),
  chart: (y) => `光锥图：横向是时间（2208 到 2340），纵向是离太阳系的距离（0 到 ${ROSS_128.distance} 光年）。黄线是我们的信，青线是他们的回答，底部黄色是你的一生，此刻 ${Math.floor(y)} 年。`,
} : {
  age: (a) => `${a}`, none: 'not yet', pause: 'Pause', resume: 'Resume', next: 'Skip to the next choice',
  random: 'Pick for me', again: 'Live again', copy: 'Copy this life', copied: 'Copied', link: 'Link to this same birth',
  people: (n) => `${n}`, heard: (n) => `${n}`,
  words: 'Words you put forward', taken: 'went into a reply', notTaken: 'not used', noWords: 'You did not live to put forward a word.',
  endTitle: (age) => `${age} years`,
  inFlight: (n) => `When you went, ${n} ${n === 1 ? 'letter was' : 'letters were'} still travelling as light.`,
  you: 'you', worldOf: (p) => `${p.en}`,
  odds: (p) => (oneIn(p) < 1.05 ? 'almost everyone' : `1 in ${fmtOneIn(oneIn(p), 'en')}`),
  chart: (y) => `Light-cone chart: time runs across (2208 to 2340), distance from the Solar System up (0 to ${ROSS_128.distance} light years). Yellow lines are our letters, cyan lines their answers, the yellow strip at the bottom your life; now ${Math.floor(y)}.`,
};

const $ = (s, root = document) => root.querySelector(s);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEEDS = [1100, 450, 160]; // ms per year

// ---------- the lexicon, for drawing and glossing words ----------

const LIB = new URL('../lib/', import.meta.url);
let vocab = null, zhGloss = {}, enGloss = {};
const lexicon = Promise.all([
  fetch(new URL('glyph-vocab.json', LIB)).then((r) => r.json()),
  fetch(new URL('glyph-zh.json', LIB)).then((r) => r.json()),
]).then(([data, zh]) => {
  vocab = new Vocabulary(data);
  for (const w of data.words) enGloss[[w.kind, w.which].filter(Boolean).join('.')] = w.gloss;
  for (const [k, v] of Object.entries(zh.words || {})) zhGloss[k] = v.gloss;
}).catch(() => {});

const gloss = (key) => (lang === 'zh' ? zhGloss[key] : enGloss[key]) || key;
function glyphSvg(key, cell = 7) {
  if (!vocab) return '';
  try { return rowsSvg(drawWords(vocab, [vocab.parse(key)], '×'), ['×'], { cell, grid: false }); } catch { return ''; }
}

// ---------- state ----------

let life = null, timer = null, speed = 0, paused = false, choice = null;
const ui = {
  start: $('#start'), game: $('#game'), log: $('#life-log'), choice: $('#choice'), end: $('#end'),
  year: $('#r-year'), age: $('#r-age'), where: $('#r-where'), job: $('#r-job'), people: $('#r-people'), heard: $('#r-heard'),
  pause: $('#btn-pause'), next: $('#btn-next'), speeds: [...document.querySelectorAll('[data-speed]')],
  canvas: $('#lightcone'),
};

function mode() {
  const sel = document.querySelector('[data-mode][aria-selected="true"]');
  return sel ? sel.dataset.mode : 'people';
}

function born(seed) {
  stop();
  life = createLife({ seed, mode: mode() });
  choice = null; paused = false;
  ui.log.replaceChildren();
  ui.end.hidden = true; ui.choice.hidden = true; ui.game.hidden = false;
  for (const e of life.log) addEntry(e);
  const url = new URL(location.href);
  url.searchParams.set('s', life.seed.toString(36));
  url.searchParams.set('m', life.mode);
  history.replaceState(null, '', url);
  render();
  ui.game.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  play();
}

// ---------- ticking ----------

function play() {
  stop();
  if (paused || choice || life.done) return syncButtons();
  timer = setInterval(tick, SPEEDS[speed]);
  syncButtons();
}
function stop() { clearInterval(timer); timer = null; }

function tick() {
  const { entries, choice: c } = step(life);
  for (const e of entries) addEntry(e);
  render();
  if (c) ask(c);
  if (life.done) finish();
}

function skip() {
  if (choice || life.done) return;
  stop();
  let guard = 200;
  while (guard-- && !choice && !life.done) tick();
  play();
}

// ---------- the log ----------

function addEntry(e) {
  const li = el('li');
  if (e.kind === 'in' || e.kind === 'birth') li.classList.add('is-key');
  if (e.kind === 'out') li.classList.add('is-out');
  if (e.kind === 'end') li.classList.add('is-end');
  const time = el('time', null, `${Math.floor(e.year)} · ${T.age(e.age)}`);
  const h = el('h3', null, text(e.title, lang));
  li.append(time, h);
  const body = text(e.body, lang);
  if (body) li.append(el('p', null, body));
  if (e.word) {
    const fig = el('span', 'life-word');
    fig.innerHTML = glyphSvg(e.word, 5);
    fig.append(el('span', null, gloss(e.word)));
    li.append(fig);
  }
  ui.log.prepend(li);
}

// ---------- choices ----------

function ask(c) {
  choice = c;
  stop();
  ui.choice.replaceChildren();
  ui.choice.append(el('p', 'kicker' + (c.id.startsWith('word:') ? ' kicker-out' : ''), text(c.title, lang)));
  ui.choice.append(el('p', 'choice-body', text(c.body, lang)));
  const list = el('div', 'choice-options');
  for (const o of c.options) {
    const b = el('button', 'choice-option');
    b.type = 'button';
    if (o.word) {
      const g = el('span', 'choice-glyph');
      g.innerHTML = glyphSvg(o.word, 7);
      b.append(g, el('strong', null, gloss(o.word)), el('code', null, o.word));
    } else {
      b.append(el('strong', null, text(o.label, lang)));
      if (o.about) b.append(el('span', null, text(o.about, lang)));
    }
    b.addEventListener('click', () => answer(o.id));
    list.append(b);
  }
  ui.choice.append(list);
  const rnd = el('button', 'btn btn-ghost btn-sm', T.random);
  rnd.type = 'button';
  rnd.addEventListener('click', () => answer(c.options[Math.floor(Math.random() * c.options.length)].id));
  ui.choice.append(rnd);
  ui.choice.hidden = false;
  syncButtons();
  if (!reduced) ui.choice.querySelector('button')?.focus({ preventScroll: true });
}

function answer(id) {
  const c = choice;
  choice = null;
  ui.choice.hidden = true;
  for (const e of choose(life, c, id)) addEntry(e);
  render();
  // a queued choice (two in one year) comes next
  const { entries, choice: c2 } = life.queue.length ? step(life) : { entries: [], choice: null };
  for (const e of entries) addEntry(e);
  if (c2) ask(c2); else play();
}

// ---------- readouts ----------

function render() {
  const p = place(life.place);
  ui.year.textContent = Math.floor(life.year);
  ui.age.textContent = T.age(life.age);
  ui.where.textContent = lang === 'zh' ? p.zh : p.en;
  ui.job.textContent = life.job ? (lang === 'zh' ? job(life.job).zh : job(life.job).en) : T.none;
  ui.people.textContent = T.people(life.people);
  ui.heard.textContent = T.heard(life.heard);
  draw();
}

function syncButtons() {
  ui.pause.textContent = paused ? T.resume : T.pause;
  ui.pause.disabled = !!choice || life?.done;
  ui.next.disabled = !!choice || life?.done;
  ui.speeds.forEach((b, i) => b.setAttribute('aria-pressed', String(i === speed)));
}

// ---------- the light-cone chart ----------

const Y0 = 2208, Y1 = 2340, ROWS = 23; // half a light year per row
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function draw() {
  const cv = ui.canvas;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const cols = Y1 - Y0;
  const cell = Math.max(2, Math.floor((cv.clientWidth * dpr) / cols));
  cv.width = cols * cell; cv.height = ROWS * cell;
  cv.style.height = `${(ROWS * cell) / dpr}px`;
  const g = cv.getContext('2d');
  const C = { bg: css('--scope'), grid: css('--plot-grid'), dim: css('--plot-dim'), axis: css('--plot-axis'), them: css('--them'), us: css('--us'), text: css('--text') };
  g.fillStyle = C.bg; g.fillRect(0, 0, cv.width, cv.height);
  const px = (c, r, color, inset = 0) => { g.fillStyle = color; g.fillRect(c * cell + inset, (ROWS - 1 - r) * cell + inset, cell - 2 * inset, cell - 2 * inset); };
  const rowOf = (d) => Math.max(0, Math.min(ROWS - 1, Math.round(d * 2)));
  // grid: a dot every ten years and every two light years
  for (let c = 0; c < cols; c++) for (let r = 0; r < ROWS; r++) if ((Y0 + c) % 10 === 0 && r % 4 === 0) px(c, r, C.grid, Math.floor(cell / 3));
  // the two ends
  for (let c = 0; c < cols; c += 2) { px(c, ROWS - 1, C.axis, Math.floor(cell / 3)); px(c, 0, C.axis, Math.floor(cell / 3)); }
  const now = life ? life.year : Y0;
  const death = life ? life.birth + life.span : Y1;
  const birth = life ? life.birth : Y1;
  // the exchange
  // A line moves one light year a year, two rows per column, so walk it in quarter-year steps for no gaps.
  for (const l of exchange(Y1 + 30)) {
    for (let t = 0; t <= l.to - l.from + 1e-9; t += 0.25) {
      const y = l.from + t;
      const c = Math.floor(y - Y0);
      if (c < 0 || c >= cols) continue;
      const d = l.dir === 'in' ? ROSS_128.distance - t : t;
      const seen = y <= now;
      const color = !seen ? C.dim : l.dir === 'in' ? C.them : C.us;
      px(c, rowOf(d), color, seen ? 0 : Math.floor(cell / 4));
    }
  }
  // your life along the bottom
  for (let c = 0; c < cols; c++) {
    const y = Y0 + c + 0.5;
    if (y >= birth && y <= Math.min(now, death) + 0.5) { px(c, 0, C.us); px(c, 1, C.us, Math.floor(cell / 4)); }
  }
  // now
  if (life && !life.done) { const c = Math.floor(now - Y0); for (let r = 2; r < ROWS - 1; r += 2) px(c, r, C.text, Math.floor(cell / 2.5)); }
  cv.setAttribute('aria-label', T.chart(now));
}

// ---------- the end ----------

function finish() {
  stop();
  syncButtons();
  const b = place(life.birthplace);
  const age = Math.floor(life.span);
  ui.end.replaceChildren();
  const head = el('div', 'end-head');
  head.append(el('p', 'kicker', lang === 'zh' ? `${Math.floor(life.birth)}–${Math.floor(life.birth + life.span)}` : `${Math.floor(life.birth)}–${Math.floor(life.birth + life.span)}`));
  head.append(el('h2', 'end-title', T.endTitle(age)));
  head.append(el('p', 'end-sum', summary(life, lang)));
  const fly = inFlight(life).length;
  if (fly) head.append(el('p', 'note', T.inFlight(fly)));
  ui.end.append(head);
  const dl = el('dl', 'readouts');
  const add = (k, v) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); dl.append(d); };
  add(lang === 'zh' ? '出生地' : 'Born', lang === 'zh' ? b.zh : b.en);
  add(lang === 'zh' ? '概率' : 'Odds', T.odds(b));
  add(lang === 'zh' ? '回音' : 'Replies heard', String(life.heard));
  add(lang === 'zh' ? '身边的人' : 'People close', String(life.people));
  ui.end.append(dl);
  const words = el('div', 'end-words');
  words.append(el('p', 'eyebrow', T.words));
  if (!life.words.length) words.append(el('p', 'note', T.noWords));
  for (const w of life.words) {
    const f = el('figure', 'end-word' + (w.taken ? ' is-taken' : ''));
    const g = el('span', 'choice-glyph'); g.innerHTML = glyphSvg(w.word, 8);
    const cap = el('figcaption');
    cap.append(el('strong', null, gloss(w.word)), el('span', null, w.taken ? T.taken : T.notTaken));
    f.append(g, cap);
    words.append(f);
  }
  ui.end.append(words);
  const actions = el('div', 'hero-actions');
  const again = el('button', 'btn btn-primary', T.again); again.type = 'button';
  again.addEventListener('click', () => born(newSeed()));
  const copy = el('button', 'btn btn-ghost', T.copy); copy.type = 'button';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`${summary(life, lang)}\n${location.href}`); copy.textContent = T.copied; } catch { /* clipboard blocked */ }
  });
  actions.append(again, copy);
  ui.end.append(actions);
  ui.end.hidden = false;
}

// ---------- wiring ----------

document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
}));
$('#btn-born').addEventListener('click', () => born(newSeed()));
ui.pause.addEventListener('click', () => { paused = !paused; play(); });
ui.next.addEventListener('click', skip);
ui.speeds.forEach((b, i) => b.addEventListener('click', () => { speed = i; play(); }));
addEventListener('resize', () => life && draw());

// A shared link (?s=seed&m=mode) offers the same birth.
const params = new URLSearchParams(location.search);
if (params.get('m') === 'worlds') document.querySelector('[data-mode="worlds"]')?.click();
const shared = params.get('s');
await lexicon;
if (shared && /^[0-9a-z]{1,8}$/.test(shared)) {
  const btn = $('#btn-shared');
  btn.hidden = false;
  btn.addEventListener('click', () => born(parseInt(shared, 36)));
}
