// The grid script, in the browser: a port of glyph-cli 0.2.0 (https://github.com/InterImm/glyph-cli).
// Parts, words, pages, drawings and the knowledge-graph reading behave exactly as the `glyph` command does,
// and lib/glyph-vocab.json is a copy of its bundled vocabulary; tests/glyph.test.mjs checks the two agree.
// No DOM here, so the same file runs under node for the tests.

export const POSITIONS = 6;
export const WIDTH = POSITIONS * 4 - 1; // 23 cells
export const BAND_GAP = 1;
export const LINE_GAP = 3;
export const EMPTY = '_';
export const EMPTY_CELL = '.';
export const MARK = '#';
export const NUMBER = 'COUNT'; // the kind whose which is a number
export const MAX_NUMBER = 511;
export const SLOTS = ['subject', 'relation', 'object'];
export const HALVES = ['kind', 'which'];
export const RESERVED_SYMBOLS = new Set([...'.#|:_ \t']);

// Colours of the phase 2 ("137") design: signal blue, white-cyan for them, Sol yellow for us.
export const BACKGROUND = '#0d1457';
export const GRID = '#141d6e';
export const INKS = { '+': '#9ff8ff', '×': '#ffd84a', x: '#ffd84a' };
export const OTHER_INKS = ['#c9b3ff', '#7dffa8', '#ffa45c', '#ffffff'];

// Fixed words of the readings; a translation can replace them (see Vocabulary.labels).
export const LABELS = {
  none: '—',
  notInVocabulary: '(not in vocabulary)',
  statement: (n) => `[statement ${n}]`,
  thatNothing: '[that: nothing above]',
  yes: 'yes', no: 'no', instead: 'instead', 'and also': 'and also',
  to: (s) => ` (to ${s})`,
  quote: (s) => ` "${s}"`,
  noComment: 'present, no comment',
  edges: 'Edges:', nodes: 'Nodes:',
};

/** A problem the reader can fix. `code` and `args` let a page say it in another language. */
export class GlyphError extends Error {
  constructor(message, code = 'error', args = {}) {
    super(message);
    this.name = 'GlyphError';
    this.code = code;
    this.args = args;
  }
}

// ---------- words ----------
// A word is { kind, which }: kind is a part name or null, which is a part name, a number or null.

export const word = (kind = null, which = null) => ({ kind, which });
export const isEmpty = (w) => w.kind === null && w.which === null;
export const isNumber = (w) => typeof w.which === 'number';
export const halves = (w) => [w.kind, w.which];
export const sameWord = (a, b) => a.kind === b.kind && a.which === b.which;
export const THAT = word('ONE', null);

export function wordStr(w) {
  if (isEmpty(w)) return EMPTY;
  return (w.kind ?? EMPTY) + (w.which === null ? '' : `.${w.which}`);
}

// ---------- the vocabulary ----------

export class Vocabulary {
  /** `data` is a vocab.json object; `labels` replaces any of LABELS (for a translation). */
  constructor(data, labels = {}) {
    if (!data || typeof data !== 'object' || !data.parts || !data.words) {
      throw new GlyphError('not a glyph vocabulary file', 'vocabulary');
    }
    this.version = data.version ?? 1;
    this.parts = {};
    for (const [name, p] of Object.entries(data.parts)) {
      this.parts[name] = { name, shape: [...p.shape], thing: p.thing, relation: p.relation ?? null };
    }
    this.markers = { ...(data.markers || {}) };
    this.entries = data.words.map((e) => ({
      word: word(e.kind, e.which), gloss: e.gloss, domain: e.domain ?? 'Unsorted', note: e.note ?? '',
    }));
    this.labels = { ...LABELS, ...labels };
  }

  /** 'BODY.OTHER' -> {kind: 'BODY', which: 'OTHER'}; 'COUNT.137' -> {kind: 'COUNT', which: 137}. */
  parse(text) {
    const s = String(text).trim();
    if (s === '' || s === EMPTY) return word();
    const dot = s.indexOf('.');
    const k = dot < 0 ? s : s.slice(0, dot);
    const w = dot < 0 ? '' : s.slice(dot + 1);
    const kind = k === '' || k === EMPTY ? null : k.toUpperCase();
    let which;
    if (w === '' || w === EMPTY) {
      which = null;
    } else if (/^[0-9]+$/.test(w)) {
      which = parseInt(w, 10);
      if (which > MAX_NUMBER) throw new GlyphError(`number out of range 0-${MAX_NUMBER}: ${which}`, 'range', { n: which });
      if (kind !== NUMBER && kind !== null) {
        throw new GlyphError(`a number needs ${NUMBER} as its kind, e.g. ${NUMBER}.${which} (got ${s})`, 'numberKind', { n: which, s });
      }
      if (kind === NUMBER && which === 0) which = null; // COUNT alone is zero: COUNT.0 draws exactly like it
    } else {
      which = w.toUpperCase();
      if (kind === NUMBER) throw new GlyphError(`${NUMBER} only takes a number as its which, e.g. ${NUMBER}.12 (got ${s})`, 'countWhich', { s });
    }
    for (const half of [kind, which]) {
      if (typeof half === 'string' && !(half in this.parts)) throw new GlyphError(`unknown part: ${half}`, 'unknownPart', { part: half });
    }
    return word(kind, which);
  }

  lookup(w) {
    return this.entries.find((e) => sameWord(e.word, w)) || null;
  }

  /** The meaning of one half on its own. */
  thing(half) {
    if (half === null) return EMPTY;
    if (typeof half === 'number') return String(half);
    return this.parts[half].thing;
  }

  /** The best human reading of a word as a 'node' or as a 'relation'. */
  gloss(w, role = 'node') {
    if (isEmpty(w)) return this.labels.none;
    if (role === 'relation') {
      let base = '';
      if (w.kind) {
        const part = this.parts[w.kind];
        base = part.relation || part.thing;
      }
      if (w.which === null) return base;
      const marker = this.markers[String(w.which)] ?? String(w.which);
      return `${base} [${marker}]`;
    }
    if (w.kind === NUMBER && (isNumber(w) || w.which === null)) return String(w.which || 0);
    const entry = this.lookup(w);
    if (entry) return entry.gloss;
    if (w.which === null) return this.parts[w.kind].thing;
    return `${this.thing(w.kind)} | ${this.thing(w.which)} ${this.labels.notInVocabulary}`;
  }

  search(text) {
    const t = text.toLowerCase();
    const words = this.entries.filter((e) => e.gloss.toLowerCase().includes(t) || e.note.toLowerCase().includes(t));
    const parts = Object.values(this.parts).filter((p) => p.thing.toLowerCase().includes(t) || (p.relation && p.relation.toLowerCase().includes(t)));
    return { words, parts };
  }

  /** A list of problems; empty means the vocabulary is sound. */
  validate() {
    const errors = [];
    const shapes = new Map();
    for (const p of Object.values(this.parts)) {
      if (p.shape.length !== 3 || p.shape.some((r) => r.length !== 3 || /[^#.]/.test(r))) errors.push(`part ${p.name}: shape must be 3 rows of 3 "#"/"."`);
      const key = p.shape.join('/');
      if (shapes.has(key)) errors.push(`parts ${shapes.get(key)} and ${p.name} have the same shape`);
      shapes.set(key, p.name);
      if (!p.shape.some((r) => r.includes(MARK))) errors.push(`part ${p.name}: shape is empty`);
    }
    const seen = new Map();
    const glosses = new Map();
    for (const e of this.entries) {
      const ws = wordStr(e.word);
      for (const half of halves(e.word)) {
        if (typeof half === 'string' && !(half in this.parts)) errors.push(`${ws}: unknown part ${half}`);
      }
      if (e.word.kind === NUMBER) errors.push(`${ws}: ${NUMBER} words are numbers and are built in`);
      if (seen.has(ws)) errors.push(`${ws} defined twice ("${seen.get(ws)}" and "${e.gloss}")`);
      seen.set(ws, e.gloss);
      const g = e.gloss.toLowerCase();
      if (glosses.has(g)) errors.push(`meaning "${e.gloss}" used by ${glosses.get(g)} and ${ws}`);
      glosses.set(g, ws);
    }
    return errors;
  }

  domains() {
    const out = [];
    for (const e of this.entries) if (!out.includes(e.domain)) out.push(e.domain);
    return out;
  }
}

// ---------- pages ----------
// A page is { lines: [{ bands: [{ symbol, words: [w, w, w] }] }] }. The first band of a line is the statement.

export const bandHalves = (band) => band.words.flatMap(halves);
export const pageVoices = (page) => page.lines.reduce((n, line) => Math.max(n, line.bands.length), 0);

export function pageSymbols(page) {
  const out = [];
  for (const line of page.lines) for (const band of line.bands) if (!out.includes(band.symbol)) out.push(band.symbol);
  return out;
}

export function checkSymbol(symbol) {
  if ([...symbol].length !== 1 || RESERVED_SYMBOLS.has(symbol)) {
    throw new GlyphError(`a symbol is one character, not a space or any of # . : _ |: '${symbol}'`, 'symbol', { symbol });
  }
  return symbol;
}

/** Read page source ("SYMBOL: node | relation | node", one band per line) into a page. */
export function parsePage(text, vocab) {
  const page = { lines: [] };
  let current = { bands: [] };
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.split('#', 1)[0].trimEnd();
    if (!line.trim()) {
      if (current.bands.length) { page.lines.push(current); current = { bands: [] }; }
      return;
    }
    const at = (err) => new GlyphError(`line ${i + 1}: ${err.message}`, err.code, { ...err.args, line: i + 1 });
    const colon = line.indexOf(':');
    if (colon < 0) {
      throw new GlyphError(`line ${i + 1}: expected "SYMBOL: node | relation | node", got '${raw.trim()}'`, 'format', { line: i + 1 });
    }
    const symbol = line.slice(0, colon).trim();
    try { checkSymbol(symbol); } catch (err) { throw at(err); }
    const cells = line.slice(colon + 1).split('|');
    if (cells.length !== 3) {
      throw new GlyphError(`line ${i + 1}: need exactly three slots separated by |, got ${cells.length}`, 'slots', { line: i + 1, n: cells.length });
    }
    let words;
    try { words = cells.map((c) => vocab.parse(c)); } catch (err) { throw at(err); }
    current.bands.push({ symbol, words });
  });
  if (current.bands.length) page.lines.push(current);
  return page;
}

/** Write a page back as page source. */
export function formatPage(page) {
  const blocks = page.lines.map((line) => line.bands.map((b) => `${b.symbol}: ${b.words.map(wordStr).join(' | ')}`).join('\n'));
  return blocks.join('\n\n') + (blocks.length ? '\n' : '');
}

// ---------- drawing ----------

/** Nine bits, 256 ... 1, left to right, top to bottom. */
export function numberShape(n) {
  const bits = n.toString(2).padStart(9, '0');
  return [0, 1, 2].map((r) => [0, 1, 2].map((c) => (bits[r * 3 + c] === '1' ? MARK : EMPTY_CELL)).join(''));
}

export function shape(vocab, half) {
  if (half === null) return [EMPTY_CELL.repeat(3), EMPTY_CELL.repeat(3), EMPTY_CELL.repeat(3)];
  if (typeof half === 'number') return numberShape(half);
  return vocab.parts[half].shape;
}

/** Three rows of text for a run of positions drawn in one symbol. */
export function bandRows(vocab, hs, symbol) {
  const rows = ['', '', ''];
  hs.forEach((half, i) => {
    const s = shape(vocab, half);
    for (let r = 0; r < 3; r++) rows[r] += (i ? EMPTY_CELL : '') + s[r].replaceAll(MARK, symbol);
  });
  return rows;
}

/** Words side by side, as a quick look-up drawing (not a page). */
export function drawWords(vocab, words, symbol = '+', spacing = 3) {
  const blocks = words.map((w) => bandRows(vocab, halves(w), symbol));
  return [0, 1, 2].map((r) => blocks.map((b) => b[r]).join(' '.repeat(spacing)));
}

/** Draw a page as rows of text. Every line gets as many bands as the page has voices. */
export function render(vocab, page) {
  const blank = EMPTY_CELL.repeat(WIDTH);
  const n = pageVoices(page);
  const out = [];
  page.lines.forEach((line, li) => {
    if (li) for (let i = 0; i < LINE_GAP; i++) out.push(blank);
    for (let k = 0; k < n; k++) {
      if (k) for (let i = 0; i < BAND_GAP; i++) out.push(blank);
      if (k < line.bands.length) out.push(...bandRows(vocab, bandHalves(line.bands[k]), line.bands[k].symbol));
      else out.push(blank, blank, blank);
    }
  });
  return out;
}

export function ink(symbol, symbols) {
  if (symbol in INKS) return INKS[symbol];
  const others = symbols.filter((s) => !(s in INKS));
  return OTHER_INKS[Math.max(0, others.indexOf(symbol)) % OTHER_INKS.length];
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Draw rows of text as SVG: square pixels on signal blue, no curves. */
export function rowsSvg(rows, symbols, { cell = 12, pad = 1, grid = true, width = WIDTH } = {}) {
  const w = width + 2 * pad, h = rows.length + 2 * pad;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * cell} ${h * cell}" width="${w * cell}" height="${h * cell}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="${BACKGROUND}"/>`,
  ];
  const inset = Math.max(1, Math.floor(cell / 12));
  const size = cell - 2 * inset;
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      const box = `x="${(c + pad) * cell + inset}" y="${(r + pad) * cell + inset}" width="${size}" height="${size}"`;
      if (ch !== EMPTY_CELL && ch !== ' ') out.push(`<rect ${box} fill="${ink(ch, symbols)}"><title>${esc(ch)}</title></rect>`);
      else if (grid && ch === EMPTY_CELL) out.push(`<rect ${box} fill="${GRID}"/>`);
    });
  });
  out.push('</svg>');
  return out.join('\n') + '\n';
}

/** Draw a page as SVG, as `glyph render --svg` does. */
export function renderSvg(vocab, page, opts = {}) {
  return rowsSvg(render(vocab, page), pageSymbols(page), opts);
}

// ---------- reading a drawing back ----------

/** How many bands each line of a drawing has, from where its empty rows fall (throws if they don't fit). */
export function structure(rows) {
  const empty = rows.map((row) => !row.replaceAll(EMPTY_CELL, ''));
  const total = rows.length;
  for (let n = 1; n <= total; n++) {
    const lineH = 4 * n - 1;
    const period = lineH + LINE_GAP;
    if ((total + LINE_GAP) % period) continue;
    let ok = true;
    for (let i = 0; i < total; i++) {
      const at = i % period;
      const gap = at >= lineH || at % 4 === 3;
      if (gap && !empty[i]) { ok = false; break; }
    }
    if (ok) return n;
  }
  throw new GlyphError("the rows don't fall into lines and bands; is this a picture rather than text?", 'structure');
}

/**
 * Read a drawing (as made by render) back into a page. A which is read as nine bits only after COUNT,
 * or with no kind under a line whose word there is a COUNT word (a reply like _.12); everywhere else
 * it must be a part.
 */
export function decode(vocab, text) {
  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  const page = { lines: [] };
  if (!rows.length) return page;
  rows.forEach((row, i) => {
    const len = [...row].length;
    if (len !== WIDTH) {
      throw new GlyphError(`row ${i + 1} is ${len} cells wide; text is always ${WIDTH} (off the lattice: a picture?)`, 'width', { row: i + 1, len });
    }
    const cells = [...row];
    for (let c = 3; c < WIDTH; c += 4) {
      if (cells[c] !== EMPTY_CELL) throw new GlyphError(`row ${i + 1}, column ${c + 1}: a mark between lattice positions (a picture?)`, 'between', { row: i + 1, col: c + 1 });
    }
  });
  const grid = rows.map((r) => [...r]);
  const n = structure(rows);
  const period = 4 * n - 1 + LINE_GAP;
  const byShape = new Map(Object.values(vocab.parts).map((p) => [p.shape.join('/'), p.name]));
  for (let top = 0; top < grid.length; top += period) {
    const line = { bands: [] };
    for (let k = 0; k < n; k++) {
      const r0 = top + 4 * k;
      const band = grid.slice(r0, r0 + 3);
      const marks = new Set(band.flat().filter((ch) => ch !== EMPTY_CELL));
      if (!marks.size) continue;
      const where = `rows ${r0 + 1}-${r0 + 3}`;
      if (marks.size > 1) throw new GlyphError(`${where}: one band mixes symbols ${[...marks].sort().join(' ')}`, 'mixed', { from: r0 + 1, to: r0 + 3 });
      const symbol = checkSymbol([...marks][0]);
      const hs = [];
      for (let pos = 0; pos < POSITIONS; pos++) {
        const pattern = band.map((row) => row.slice(pos * 4, pos * 4 + 3).map((ch) => (ch !== EMPTY_CELL ? MARK : EMPTY_CELL)).join(''));
        if (!pattern.some((p) => p.includes(MARK))) { hs.push(null); continue; }
        const slot = Math.floor(pos / 2);
        if (pos % 2 === 0) {
          const name = byShape.get(pattern.join('/'));
          if (name === undefined) throw new GlyphError(`${where}, position ${pos + 1}: not a part`, 'notPart', { from: r0 + 1, to: r0 + 3, pos: pos + 1 });
          hs.push(name);
        } else {
          const above = line.bands.length ? line.bands[0].words[slot] : null;
          const kind = hs[hs.length - 1];
          let which;
          if (kind === NUMBER || (kind === null && above !== null && (above.kind === NUMBER || above.which === NUMBER))) {
            which = parseInt(pattern.join('').replaceAll(EMPTY_CELL, '0').replaceAll(MARK, '1'), 2);
          } else {
            which = byShape.get(pattern.join('/')) ?? null;
          }
          if (which === null) throw new GlyphError(`${where}, position ${pos + 1}: not a part or a number here`, 'notWhich', { from: r0 + 1, to: r0 + 3, pos: pos + 1 });
          hs.push(which);
        }
      }
      line.bands.push({ symbol, words: [0, 2, 4].map((i) => word(hs[i], hs[i + 1])) });
    }
    if (line.bands.length) page.lines.push(line);
  }
  return page;
}

// ---------- reading a page as a knowledge graph (grammar rules 3 and 5) ----------

export function respond(above, below) {
  if (below === null) return null;
  if (above === null) return 'and also';
  if (below === above) return 'yes';
  if (below === 'NOT') return 'no';
  return 'instead';
}

export function nodeLabel(node, labels = LABELS) {
  if (node.statement !== null) return node.statement ? labels.statement(node.statement) : labels.thatNothing;
  return node.gloss;
}

export function responseText(r, labels = LABELS) {
  const tail = r.meaning === 'yes' || r.meaning === 'no' ? '' : labels.quote(r.part);
  const to = r.to ? labels.to(r.to) : '';
  return `${r.slot}.${r.half}: ${labels[r.meaning]}${tail}${to}`;
}

/**
 * Rule 3: the first band of every line is one edge. Rule 5: every part in a lower band answers the
 * nearest drawn part above it in the same position.
 */
export function readGraph(vocab, page) {
  const g = { edges: [], nodes: {} };
  page.lines.forEach((line, idx) => {
    const i = idx + 1;
    const st = line.bands[0];
    const [subjectW, relationW, objectW] = st.words;
    const node = (w) => {
      if (sameWord(w, THAT)) return { word: null, gloss: '', statement: i - 1 };
      const gloss = vocab.gloss(w);
      if (!isEmpty(w) && !(wordStr(w) in g.nodes)) g.nodes[wordStr(w)] = gloss;
      return { word: isEmpty(w) ? null : wordStr(w), gloss, statement: null };
    };
    const subject = node(subjectW);
    const relation = vocab.gloss(relationW, 'relation');
    const edge = { number: i, symbol: st.symbol, subject, relation, relationWord: wordStr(relationW), object: node(objectW), replies: [] };
    line.bands.slice(1).forEach((band, b0) => {
      const b = b0 + 1;
      const reply = { symbol: band.symbol, responses: [] };
      bandHalves(band).forEach((below, pos) => {
        let above = null, by = null;
        for (let j = b - 1; j >= 0; j--) {
          const prev = bandHalves(line.bands[j])[pos];
          if (prev !== null) { above = prev; by = line.bands[j].symbol; break; }
        }
        const meaning = respond(above, below);
        if (meaning) reply.responses.push({ slot: SLOTS[Math.floor(pos / 2)], half: HALVES[pos % 2], meaning, part: vocab.thing(below), to: by });
      });
      edge.replies.push(reply);
    });
    g.edges.push(edge);
  });
  return g;
}

/** The graph as text lines, exactly as `glyph graph` prints it (in the vocabulary's own language). */
export function formatGraph(vocab, g) {
  const L = vocab.labels;
  const out = [L.edges];
  for (const e of g.edges) {
    out.push(`${e.number}. (${e.symbol}) ${nodeLabel(e.subject, L)} --${e.relation}--> ${nodeLabel(e.object, L)}`);
    for (const r of e.replies) {
      const text = r.responses.map((x) => responseText(x, L)).join('; ') || L.noComment;
      out.push(`   (${r.symbol}) ${text}`);
    }
  }
  out.push('', L.nodes);
  for (const [w, gloss] of Object.entries(g.nodes)) out.push(`  ${w.padEnd(14)} ${gloss}`);
  return out;
}
