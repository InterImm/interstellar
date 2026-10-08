// The grid script pages: the explainer, the dictionary and the converter (one script for all three).
// Everything about the script itself is in lib/glyph.js (a port of glyph-cli); this file only draws it
// and wires up the controls. The page says which parts it has with data-gs-* attributes.
import {
  Vocabulary, GlyphError, parsePage, formatPage, render, renderSvg, rowsSvg, decode, readGraph, bandRows,
  pageSymbols, wordStr, isEmpty, structure, ink, numberShape, positions, toDigits, hiddenZeros,
  EMPTY_CELL, BACKGROUND, GRID, BASE,
} from '../lib/glyph.js?v=8'; // bump ?v= (here, in the pages and in GLYPH_DATA) whenever the script changes

const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LIB = new URL('../lib/', import.meta.url);
const GLYPH_DATA = '?v=8'; // a phone holding an older cached copy must not mix it with new data
const HERE = new URL('./', location.href);
// the section's pages: CN at script/…/, EN at script/…/en/
const SECTION = new URL('../script/', import.meta.url);
const pageUrl = (name, source) => {
  const url = new URL(`${name ? `${name}/` : ''}${zh ? '' : 'en/'}`, SECTION);
  if (source !== undefined) url.searchParams.set('s', source);
  return url.href;
};

const T = zh ? {
  slots: { subject: '前节点', relation: '关系', object: '后节点' }, halves: { kind: '类', which: '指' }, digit: (n) => `第 ${n} 位`,
  meaning: { yes: '是', no: '不', instead: '换成', 'and also': '还有' },
  to: (s) => `（回应 ${s}）`, quote: (s) => `“${s}”`, noComment: '在场，未表态',
  statement: (n) => `[第 ${n} 个三元组]`, thatNothing: '[“那”：前面没有三元组]', notInVocabulary: '（不在词典中）',
  part: '部件', asThing: '作为事物', asRelation: '作为关系', none: '—',
  results: (n) => `${n} 个词`, noResults: '没有找到。试试别的词，或者直接写出一个词，比如 BODY.STAR。',
  composed: '拼出来的词', inVocab: '词典里的词', notIn: '还不在词典里：这是按部件拼出的读法。', number: '数', numberNote: '数是内置的：COUNT 后面跟着 512 进制的数位，每位九个比特。',
  hiddenZero: (n) => `第 ${n} 个三元组在行尾以 0 数位结尾。0 位画出来是空的，读的人看不出这个数在哪里结束：把它放到前节点，或者在后面再写一个三元组。`,
  all: '全部', draw: '在转换器里画', copied: '已复制', copy: '复制', linkCopied: '链接已复制',
  empty: '空', voice: (s) => `声部 ${s}`, edges: '读出的图', nodes: '节点',
  errLine: (n) => `第 ${n} 行：`,
  err: {
    unknownPart: (a) => `未知的部件：${a.part}`, digit: (a) => `每个数位是 0–511（512 进制）：${a.s}`,
    leadingZero: (a) => `数不以 0 数位开头：${a.s}`, tooLong: (a) => `只有数才会多于两个位置：${a.s}`, whole: (a) => `只能是零或正整数：${a.n}`,
    numberKind: (a) => `数要以 COUNT 为类，比如 COUNT.${a.n}（写的是 ${a.s}）`,
    countWhich: (a) => `COUNT 的“指”只能是数，比如 COUNT.12（写的是 ${a.s}）`,
    symbol: (a) => `符号是一个字符，不能是空格或 # . : _ |（写的是 “${a.symbol}”）`,
    format: () => '应写成“符号: 节点 | 关系 | 节点”', slots: (a) => `要正好三个位置，用 | 分开，现在是 ${a.n} 个`,
    structure: () => '这些排分不成行和声部；这是一幅图，而不是文字吗？',
    gaps: (a) => `第 ${a.from}–${a.to} 排：这些记号按 1、2、4 格的空隙切不成 3 × 3 的部件（是一幅图吗？）`,
    mixed: (a) => `第 ${a.from}–${a.to} 排：一个声部里混用了几种符号`,
  },
} : {
  slots: { subject: 'subject', relation: 'relation', object: 'object' }, halves: { kind: 'kind', which: 'which' }, digit: (n) => `digit ${n}`,
  meaning: { yes: 'yes', no: 'no', instead: 'instead', 'and also': 'and also' },
  to: (s) => ` (to ${s})`, quote: (s) => `"${s}"`, noComment: 'present, no comment',
  statement: (n) => `[triplet ${n}]`, thatNothing: '[that: nothing before]', notInVocabulary: '(not in vocabulary)',
  part: 'part', asThing: 'as a thing', asRelation: 'as a relation', none: '—',
  results: (n) => `${n} word${n === 1 ? '' : 's'}`, noResults: 'Nothing found. Try another word, or write one out, like BODY.STAR.',
  composed: 'A word you built', inVocab: 'In the dictionary', notIn: 'Not in the dictionary yet: this is how its parts read.', number: 'A number', numberNote: 'Numbers are built in: COUNT and base-512 digits, nine bits each.',
  hiddenZero: (n) => `Triplet ${n} ends its line with a number ending in a 0 digit. A 0 digit is drawn blank, so a reader can't see where the number ends: move it to the subject, or put another triplet after it.`,
  all: 'All', draw: 'Draw in the converter', copied: 'Copied', copy: 'Copy', linkCopied: 'Link copied',
  empty: 'empty', voice: (s) => `voice ${s}`, edges: 'The graph it reads', nodes: 'Nodes',
  errLine: () => '', err: {},
};

const message = (err) => {
  if (!(err instanceof GlyphError) || !zh || !T.err[err.code]) return err.message;
  return (err.args.line ? T.errLine(err.args.line) : '') + T.err[err.code](err.args);
};

// ------------------------------------------------------------------ data

async function loadVocab() {
  const get = (f) => fetch(new URL(f + GLYPH_DATA, LIB)).then((r) => { if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.json(); });
  const [data, z] = await Promise.all([get('glyph-vocab.json'), get('glyph-zh.json')]);
  const en = new Vocabulary(data);
  if (!zh) return { en, voc: en, z: null };
  const local = structuredClone(data);
  for (const [name, p] of Object.entries(local.parts)) Object.assign(p, z.parts[name] || {});
  local.markers = { ...local.markers, ...z.markers };
  for (const w of local.words) {
    const t = z.words[wordStr({ kind: w.kind, which: w.which })] || {};
    w.gloss = t.gloss ?? w.gloss; w.note = t.note ?? w.note; w.domain = z.domains[w.domain] ?? w.domain;
  }
  const voc = new Vocabulary(local, {
    notInVocabulary: T.notInVocabulary, statement: T.statement, thatNothing: T.thatNothing, quote: T.quote, to: T.to,
  });
  return { en, voc, z };
}

// ------------------------------------------------------------------ drawing helpers

const svgOf = (rows, symbols, cell = 12, width) => rowsSvg(rows, symbols, { cell, width });
const wordSvg = (vocab, w, symbol = '+') => svgOf(bandRows(vocab, positions(w), symbol), [symbol], 12);
const partSvg = (shape, symbol = '+') => svgOf(shape.map((r) => r.replaceAll('#', symbol)), [symbol], 12, 3);

function graphHtml(voc, g, symbols) {
  const label = (n) => (n.statement !== null ? (n.statement ? T.statement(n.statement) : T.thatNothing) : n.gloss);
  const sym = (s) => `<b class="gs-sym" style="--ink:${ink(s, symbols)}">${esc(s)}</b>`;
  return `<ol class="gs-graph">${g.edges.map((e) => `<li>
    <p class="gs-edge">${sym(e.symbol)} <span class="gs-node">${esc(label(e.subject))}</span>
      <span class="gs-rel">${esc(e.relation || T.none)}</span>
      <span class="gs-node">${esc(label(e.object))}</span></p>
    ${e.replies.map((r) => `<p class="gs-reply">${sym(r.symbol)} ${r.responses.length ? r.responses.map((x) =>
      `<span><i>${T.slots[x.slot]}.${T.halves[x.half] ?? T.digit(x.half.split(' ')[1])}</i> ${T.meaning[x.meaning]}${x.meaning === 'yes' || x.meaning === 'no' ? '' : ' ' + esc(T.quote(x.part))}${x.to ? esc(T.to(x.to)) : ''}</span>`).join('') : `<span>${T.noComment}</span>`}</p>`).join('')}
  </li>`).join('')}</ol>`;
}

async function copyText(text, btn, done = T.copied) {
  try { await navigator.clipboard.writeText(text); } catch { return; }
  const old = btn.textContent; btn.textContent = done; setTimeout(() => { btn.textContent = old; }, 1400);
}

// ------------------------------------------------------------------ the explainer

function explainer({ en, voc }) {
  for (const el of $$('[data-gs-parts]')) {
    el.innerHTML = Object.values(voc.parts).map((p) => `<li class="gs-part">
      <div class="gs-draw gs-draw-part">${partSvg(p.shape)}</div>
      <div><code>${p.name}</code><strong>${esc(p.thing)}</strong>${p.relation ? `<span>${esc(p.relation)}</span>` : ''}</div></li>`).join('');
  }
  for (const el of $$('[data-gs-words]')) {
    el.innerHTML = el.dataset.gsWords.split(/\s+/).filter(Boolean).map((s) => {
      const w = en.parse(s);
      return `<li class="gs-word"><div class="gs-draw gs-draw-word">${wordSvg(en, w)}</div><code>${wordStr(w)}</code><span>${esc(voc.gloss(w))}</span></li>`;
    }).join('');
  }
  for (const el of $$('[data-gs-example]')) {
    // one example that can't be read must not stop the rest of the page (the number slider comes after them)
    try {
      const source = el.dataset.gsExample.replaceAll('\\n', '\n');
      const page = parsePage(source, en);
      el.innerHTML = `<div class="gs-draw">${renderSvg(en, page, { cell: 14 })}</div>
        <figcaption><pre class="gs-src">${esc(formatPage(page).trim())}</pre>${graphHtml(voc, readGraph(voc, page), pageSymbols(page))}
        <a class="text-link" href="${esc(pageUrl('convert', formatPage(page)))}">${zh ? '在转换器里打开 →' : 'Open in the converter →'}</a></figcaption>`;
    } catch (err) {
      console.error(err);
    }
  }
  for (const el of $$('[data-gs-number]')) {
    const input = $('input[type=range]', el), num = $('input[type=number]', el), out = $('.gs-draw', el), bits = $('.gs-bits', el);
    const show = (n) => {
      n = Math.max(0, Math.min(+num.max || 511, Math.round(+n || 0)));
      num.value = n;
      input.value = Math.min(n, 511);
      const w = en.parse(`COUNT.${n}`);
      out.innerHTML = wordSvg(en, w);
      // the bits of the last digit; a bigger number shows how its digits add up
      const ds = toDigits(n);
      const sh = numberShape(ds[ds.length - 1]);
      const vals = [256, 128, 64, 32, 16, 8, 4, 2, 1];
      bits.innerHTML = sh.join('').split('').map((c, i) => `<span class="${c === '#' ? 'on' : ''}">${vals[i]}</span>`).join('');
      const term = (d, p) => (p === 0 ? `${d}` : p === 1 ? `${d} × ${BASE}` : `${d} × ${BASE}^${p}`);
      const sum = ds.length > 1 ? ` = ${ds.map((d, i) => term(d, ds.length - 1 - i)).join(' + ')}` : '';
      $('.gs-number-word', el).textContent = wordStr(w) + sum;
    };
    input.addEventListener('input', () => show(input.value));
    num.addEventListener('input', () => show(num.value));
    show(137);
  }
}

// ------------------------------------------------------------------ the dictionary

function dictionary({ en, voc }) {
  const q = $('#gs-q'), list = $('#gs-results'), count = $('#gs-count'), chips = $('#gs-domains'), built = $('#gs-built');
  const parts = $('#gs-parts-table');
  if (parts) {
    parts.innerHTML = Object.values(voc.parts).map((p) => `<tr id="p-${p.name}"><td><div class="gs-draw gs-draw-part">${partSvg(p.shape)}</div></td>
      <td><code>${p.name}</code></td><td>${esc(p.thing)}</td><td>${esc(p.relation || T.none)}</td></tr>`).join('');
  }
  const entries = voc.entries.map((e, i) => ({ e, en: en.entries[i] }));
  const domains = voc.domains();
  let domain = '';
  chips.innerHTML = [`<button type="button" aria-pressed="true" data-d="">${T.all}</button>`,
    ...domains.map((d) => `<button type="button" aria-pressed="false" data-d="${esc(d)}">${esc(d)}</button>`)].join('');
  chips.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    domain = b.dataset.d;
    $$('button', chips).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  });
  const card = ({ e, en: ee }) => {
    const code = wordStr(e.word);
    return `<li class="gs-entry" id="w-${code}">
      <div class="gs-draw gs-draw-word">${wordSvg(en, e.word)}</div>
      <div class="gs-entry-text">
        <p class="gs-entry-head"><strong>${esc(e.gloss)}</strong><code>${code}</code></p>
        ${zh ? `<p class="gs-entry-en" lang="en">${esc(ee.gloss)}</p>` : ''}
        ${e.note ? `<p class="gs-entry-note">${esc(e.note)}</p>` : ''}
        <p class="gs-entry-meta"><span>${esc(e.domain)}</span><a href="${esc(pageUrl('convert', `+: ${code} | _ | _\n`))}">${T.draw}</a></p>
      </div></li>`;
  };
  const update = () => {
    const t = q.value.trim().toLowerCase();
    // a word written out (BODY.STAR, count.42): show how it draws and reads, in the dictionary or not
    built.hidden = true;
    if (t && /^[a-z_]+(\.[a-z0-9_]*)*$/i.test(t)) {
      try {
        const w = en.parse(t);
        if (!isEmpty(w)) {
          const known = en.lookup(w);
          const num = w.kind === 'COUNT';
          built.hidden = false;
          built.innerHTML = `<div class="gs-draw gs-draw-word">${wordSvg(en, w)}</div><div>
            <p class="kicker">${num ? T.number : known ? T.inVocab : T.composed}</p>
            <p class="gs-entry-head"><strong>${esc(voc.gloss(w))}</strong><code>${wordStr(w)}</code></p>
            ${known ? '' : `<p class="note">${num ? T.numberNote : T.notIn}</p>`}
            <p class="gs-entry-meta"><a href="${esc(pageUrl('convert', `+: ${wordStr(w)} | _ | _\n`))}">${T.draw}</a></p></div>`;
        }
      } catch { /* not a word: search the meanings instead */ }
    }
    const hits = entries.filter(({ e, en: ee }) => (!domain || e.domain === domain) && (!t || [
      wordStr(e.word), e.gloss, e.note, ee.gloss, ee.note,
    ].some((s) => s.toLowerCase().includes(t))));
    list.innerHTML = hits.map(card).join('') || `<li class="gs-none">${T.noResults}</li>`;
    count.textContent = T.results(hits.length);
  };
  q.addEventListener('input', update);
  const initial = new URLSearchParams(location.search).get('q');
  if (initial) q.value = initial;
  update();
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

// ------------------------------------------------------------------ the converter

const SYMBOLS = ['+', '×', '*'];

function converter({ en, voc }) {
  const src = $('#gs-src'), out = $('#gs-out'), rowsOut = $('#gs-rows'), graphOut = $('#gs-graph'), errOut = $('#gs-src-err');
  const examples = $('#gs-examples'), perLineIn = $('#gs-per-line');
  let lastRows = [];
  const perLine = () => +perLineIn.value || 2;

  // ---- source -> drawing
  const fromSource = () => {
    try {
      const page = parsePage(src.value, en);
      lastRows = render(en, page, perLine());
      out.innerHTML = page.triplets.length ? renderSvg(en, page, { cell: 16, perLine: perLine() }) : '';
      rowsOut.textContent = lastRows.join('\n');
      graphOut.innerHTML = page.triplets.length ? graphHtml(voc, readGraph(voc, page), pageSymbols(page)) : '';
      const hidden = hiddenZeros(page, perLine());
      errOut.textContent = hidden.map(T.hiddenZero).join(' ');
      errOut.hidden = !hidden.length;
      src.removeAttribute('aria-invalid');
    } catch (err) {
      errOut.textContent = message(err); errOut.hidden = false;
      src.setAttribute('aria-invalid', 'true');
    }
  };
  src.addEventListener('input', fromSource);
  perLineIn.addEventListener('change', fromSource);
  examples.addEventListener('change', () => {
    const opt = examples.selectedOptions[0];
    if (!opt.value) return;
    src.value = opt.value.replaceAll('\\n', '\n'); fromSource();
  });
  $('#gs-copy-rows').addEventListener('click', (ev) => copyText(lastRows.join('\n') + '\n', ev.currentTarget));
  $('#gs-svg').addEventListener('click', () => {
    try {
      const blob = new Blob([renderSvg(en, parsePage(src.value, en), { perLine: perLine() })], { type: 'image/svg+xml' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'grid-script.svg' });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { /* the error is already on screen */ }
  });
  $('#gs-link').addEventListener('click', (ev) => {
    const url = new URL(HERE); url.search = ''; url.searchParams.set('s', src.value);
    history.replaceState(null, '', url);
    copyText(url.href, ev.currentTarget, T.linkCopied);
  });
  $('#gs-to-editor').addEventListener('click', () => {
    if (!lastRows.length) return;
    drawing.value = lastRows.join('\n'); fromDrawing(true);
    $('#reverse').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  // ---- drawing -> source: an editor grid, mirrored in a text area
  const drawing = $('#gs-drawing'), editor = $('#gs-editor'), back = $('#gs-back'), backGraph = $('#gs-back-graph'), backErr = $('#gs-back-err');
  const linesIn = $('#gs-lines'), voicesIn = $('#gs-voices'), palette = $('#gs-palette'), numIn = $('#gs-num'), widthIn = $('#gs-width');
  let grid = [];            // rows of characters
  let symbol = '+';
  let tool = 'BODY';        // a part name, 'NUMBER', 'CELL' or 'ERASE'
  const CELL = 18;

  const heightFor = (lines, voices) => lines * (4 * voices - 1) + LINE_GAP_ROWS * (lines - 1);
  const LINE_GAP_ROWS = 3;
  const cols = () => Math.max(7, Math.min(120, Math.round(+widthIn.value || 45)));
  const resize = (h) => {
    const w = cols();
    grid = Array.from({ length: h }, (_, r) => {
      const row = (grid[r] || []).slice(0, w);
      while (row.length < w) row.push(EMPTY_CELL);
      return row;
    });
  };
  const drawEditor = () => {
    const symbols = [...new Set(SYMBOLS.concat(grid.flat().filter((c) => c !== EMPTY_CELL)))];
    // the rows where bands go are a shade lighter, so the grid shows where parts can sit
    const voices = +voicesIn.value, period = 4 * voices - 1 + LINE_GAP_ROWS;
    const w = (cols() + 2) * CELL, h = (grid.length + 2) * CELL, size = CELL - 2;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${BACKGROUND}"/>`];
    grid.forEach((row, r) => {
      const at = r % period;
      const onRow = at < 4 * voices - 1 && at % 4 !== 3;
      row.forEach((ch, c) => {
        const fill = ch !== EMPTY_CELL ? ink(ch, symbols) : onRow ? '#26339a' : GRID;
        out.push(`<rect x="${(c + 1) * CELL + 1}" y="${(r + 1) * CELL + 1}" width="${size}" height="${size}" fill="${fill}"/>`);
      });
    });
    editor.innerHTML = out.join('') + '</svg>';
    drawing.value = grid.map((r) => r.join('')).join('\n');
  };
  const fromDrawing = (load = false) => {
    if (load) {
      const rows = drawing.value.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
      if (rows.length) {
        const w = Math.max(...rows.map((r) => [...r].length));
        grid = rows.map((r) => { const row = [...r]; while (row.length < w) row.push(EMPTY_CELL); return row; });
        widthIn.value = w;
        // the voices per line as the machine reads them, so the editor shades the right positions
        try {
          const v = structure(rows);
          if (v <= 3) { voicesIn.value = v; linesIn.value = (rows.length + LINE_GAP_ROWS) / (4 * v - 1 + LINE_GAP_ROWS); }
        } catch { /* not text (yet): keep the layout */ }
        drawEditor();
      }
    }
    try {
      const page = decode(en, drawing.value);
      back.textContent = formatPage(page);
      backGraph.innerHTML = page.triplets.length ? graphHtml(voc, readGraph(voc, page), pageSymbols(page)) : '';
      backErr.hidden = true;
    } catch (err) {
      back.textContent = ''; backGraph.innerHTML = '';
      backErr.textContent = message(err); backErr.hidden = false;
    }
  };
  const relayout = () => { resize(heightFor(+linesIn.value, +voicesIn.value)); drawEditor(); fromDrawing(); };
  linesIn.addEventListener('change', () => { linesIn.value = Math.max(1, Math.min(12, Math.round(+linesIn.value || 1))); relayout(); });
  voicesIn.addEventListener('change', relayout);
  widthIn.addEventListener('change', () => { widthIn.value = cols(); relayout(); });
  drawing.addEventListener('input', () => fromDrawing(true));
  $('#gs-clear').addEventListener('click', () => { grid = []; relayout(); });

  // the palette: one button per part, a number, a single cell, the eraser
  const tools = [...Object.values(en.parts).map((p) => ({ id: p.name, label: p.name, shape: p.shape })),
    { id: 'NUMBER', label: zh ? '数位' : 'digit', shape: numberShape(5) },
    { id: 'CELL', label: zh ? '单格' : 'one cell', shape: ['...', '.#.', '...'] },
    { id: 'ERASE', label: zh ? '擦除' : 'erase', shape: ['...', '...', '...'] }];
  palette.innerHTML = tools.map((t) => `<button type="button" data-tool="${t.id}" aria-pressed="${t.id === tool}" title="${t.label}">
    <span class="gs-draw gs-draw-part" aria-hidden="true">${partSvg(t.shape)}</span><span>${t.label}</span></button>`).join('');
  palette.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    tool = b.dataset.tool;
    $$('button', palette).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    numIn.closest('.field').hidden = tool !== 'NUMBER';
  });
  numIn.closest('.field').hidden = true;
  for (const r of $$('input[name=gs-symbol]')) r.addEventListener('change', () => { symbol = r.value === 'other' ? ($('#gs-own').value || '*') : r.value; });
  $('#gs-own').addEventListener('input', (ev) => {
    const v = [...ev.target.value].pop();
    if (!v || '.#|:_ '.includes(v)) return;
    ev.target.value = v;
    $('input[name=gs-symbol][value=other]').checked = true; symbol = v;
  });

  const paint = (ev, dragging) => {
    const box = editor.firstElementChild.getBoundingClientRect();
    const scale = box.width / ((cols() + 2) * CELL);
    const c = Math.floor((ev.clientX - box.left) / scale / CELL) - 1;
    const r = Math.floor((ev.clientY - box.top) / scale / CELL) - 1;
    if (r < 0 || c < 0 || r >= grid.length || c >= cols()) return;
    if (tool === 'CELL') {
      if (dragging) grid[r][c] = paint.mode;
      else { paint.mode = grid[r][c] === EMPTY_CELL ? symbol : EMPTY_CELL; grid[r][c] = paint.mode; }
    } else {
      if (dragging) return;
      // stamp a whole part with its left edge on the cell under the pointer (kept inside the grid)
      const left = Math.min(c, cols() - 3);
      const voices = +voicesIn.value, period = 4 * voices - 1 + LINE_GAP_ROWS;
      const at = r % period;
      if (at >= 4 * voices - 1) return;
      const top = r - (at % 4);
      const shape = tool === 'ERASE' ? ['...', '...', '...'] : tool === 'NUMBER'
        ? numberShape(Math.max(0, Math.min(511, Math.round(+numIn.value || 0)))) : en.parts[tool].shape;
      const ch = tool === 'ERASE' ? EMPTY_CELL : symbol;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        if (top + i < grid.length) grid[top + i][left + j] = shape[i][j] === '#' ? ch : EMPTY_CELL;
      }
    }
    drawEditor(); fromDrawing();
  };
  editor.addEventListener('pointerdown', (ev) => { ev.preventDefault(); editor.setPointerCapture(ev.pointerId); paint(ev, false); });
  editor.addEventListener('pointermove', (ev) => { if (ev.buttons && tool === 'CELL') paint(ev, true); });
  $('#gs-to-source').addEventListener('click', () => {
    if (!back.textContent) return;
    src.value = back.textContent; fromSource();
    $('#forward').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  // start: a shared link, or the first example; the editor starts from its drawing
  const shared = new URLSearchParams(location.search).get('s');
  src.value = shared ?? examples.options[1].value.replaceAll('\\n', '\n');
  fromSource();
  drawing.value = lastRows.join('\n');
  fromDrawing(true);
  if (!grid.length) relayout();
}

// ------------------------------------------------------------------ start

const main = $('main[data-gs]');
loadVocab().then((v) => {
  const page = main?.dataset.gs;
  if (page === 'explainer') explainer(v);
  if (page === 'dictionary') dictionary(v);
  if (page === 'converter') converter(v);
}).catch((err) => {
  console.error(err);
  const box = $('[data-gs-fail]');
  if (box) box.hidden = false;
});
