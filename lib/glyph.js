// The grid script, in the browser: a port of glyph-cli 0.3.0 (https://github.com/InterImm/glyph-cli).
// Parts, words, pages, drawings and the knowledge-graph reading behave exactly as the `glyph` command does,
// and lib/glyph-vocab.json is a copy of its bundled vocabulary; tests/glyph.test.mjs checks the two agree.
// No DOM here, so the same file runs under node for the tests.

// Spacing is structure (grammar v8): 1 empty cell between the parts of a word, 2 between the words
// of a triplet, 4 between triplets. Bands of one line are 1 empty row apart, lines 3.
export const GAP_PART = 1;
export const GAP_WORD = 2;
export const GAP_TRIPLET = 4;
export const BAND_GAP = 1;
export const LINE_GAP = 3;
export const PER_LINE = 2; // triplets per drawn line, unless asked otherwise
export const EMPTY = '_';
export const EMPTY_CELL = '.';
export const MARK = '#';
export const NUMBER = 'COUNT'; // the kind whose which is a number
export const BASE = 512;
export const MAX_DIGIT = BASE - 1;
export const SLOTS = ['subject', 'relation', 'object'];
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
  statement: (n) => `[triplet ${n}]`,
  thatNothing: '[that: nothing before]',
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
// A word is { kind, which }: kind is a part name or null; which is a part name, one base-512 digit,
// an array of digits (a number above 511) or null.

export const word = (kind = null, which = null) => ({ kind, which });
export const isEmpty = (w) => w.kind === null && w.which === null;
export const isNumber = (w) => typeof w.which === 'number' || Array.isArray(w.which);
export const digits = (w) => (Array.isArray(w.which) ? w.which : typeof w.which === 'number' ? [w.which] : []);
export const sameWord = (a, b) => wordStr(a) === wordStr(b);
export const THAT = word('ONE', null);

/** 2219 -> [4, 171]: base-512 digits, most significant first. */
export function toDigits(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new GlyphError(`only whole numbers of zero or more: ${n}`, 'whole', { n });
  const out = [];
  do { out.unshift(n % BASE); n = Math.floor(n / BASE); } while (n);
  return out;
}

export const fromDigits = (ds) => ds.reduce((n, d) => n * BASE + d, 0);

/** The number a COUNT word stands for (COUNT alone is 0); null for other words. */
export function value(w) {
  if (w.kind === NUMBER || (w.kind === null && isNumber(w))) return digits(w).length ? fromDigits(digits(w)) : 0;
  return null;
}

/** The lattice positions a word takes: a one-part word one, a pair two, a number one per digit after COUNT. */
export function positions(w) {
  if (w.which === null) return [w.kind];
  return isNumber(w) ? [w.kind, ...digits(w)] : [w.kind, w.which];
}

export function wordStr(w) {
  if (isEmpty(w)) return EMPTY;
  const which = w.which === null ? '' : `.${isNumber(w) ? digits(w).join('.') : w.which}`;
  return (w.kind ?? EMPTY) + which;
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
      word: word(e.kind, Array.isArray(e.which) && e.which.length === 1 ? e.which[0] : e.which), gloss: e.gloss, domain: e.domain ?? 'Unsorted', note: e.note ?? '',
    }));
    this.labels = { ...LABELS, ...labels };
  }

  /**
   * 'BODY.OTHER' -> {kind: 'BODY', which: 'OTHER'}; 'COUNT.137' -> {kind: 'COUNT', which: 137};
   * 'COUNT.4.171' -> {kind: 'COUNT', which: [4, 171]} (2219). A single number above 511 is split into
   * digits for you: 'COUNT.2219' is COUNT.4.171.
   */
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
    } else if (/^[0-9]+(\.[0-9]+)*$/.test(w)) {
      let ds = w.split('.').map((d) => parseInt(d, 10));
      if (ds.length === 1) ds = toDigits(ds[0]);
      else if (ds.some((d) => d > MAX_DIGIT)) throw new GlyphError(`each digit of a number is 0-${MAX_DIGIT} (base ${BASE}): ${s}`, 'digit', { s });
      else if (ds[0] === 0 && kind === NUMBER) throw new GlyphError(`a number does not start with a 0 digit: ${s}`, 'leadingZero', { s });
      if (kind !== NUMBER && kind !== null) {
        throw new GlyphError(`a number needs ${NUMBER} as its kind, e.g. ${NUMBER}.${w} (got ${s})`, 'numberKind', { n: w, s });
      }
      which = ds.length === 1 ? ds[0] : ds;
      if (kind === NUMBER && which === 0) which = null; // COUNT alone is zero: COUNT.0 draws exactly like it
    } else if (w.includes('.')) {
      throw new GlyphError(`only numbers take more than two positions: ${s}`, 'tooLong', { s });
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
    if (Array.isArray(half)) return half.join('.');
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
      const marker = this.markers[String(w.which)] || (isNumber(w) ? this.thing(w.which) : String(w.which));
      return `${base} [${marker}]`;
    }
    if (w.kind === NUMBER) return String(value(w));
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
    for (const p of Object.values(this.parts)) {
      // Spacing is structure: a part moved one cell sideways must not be another part,
      // or a 1-cell gap could read as a 2-cell gap.
      for (const moved of [p.shape.map((r) => r.slice(1) + '.'), p.shape.map((r) => '.' + r.slice(0, 2))]) {
        const other = shapes.get(moved.join('/'));
        if (other && other !== p.name) errors.push(`part ${p.name} moved one cell sideways is ${other}: gaps would be ambiguous`);
      }
    }
    const seen = new Map();
    const glosses = new Map();
    for (const e of this.entries) {
      const ws = wordStr(e.word);
      for (const half of [e.word.kind, e.word.which]) {
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
// A page is { triplets: [{ bands: [{ symbol, words: [w, w, w] }] }] }. The first band of a triplet is
// the statement (one edge of the graph); the bands under it are other voices replying.

export const pageVoices = (page) => page.triplets.reduce((n, t) => Math.max(n, t.bands.length), 0);
/** Positions per slot of a triplet: as many as the longest word any band puts there. */
export const tripletWidths = (t) => [0, 1, 2].map((i) => Math.max(...t.bands.map((b) => positions(b.words[i]).length)));

export function pageSymbols(page) {
  const out = [];
  for (const t of page.triplets) for (const band of t.bands) if (!out.includes(band.symbol)) out.push(band.symbol);
  return out;
}

export function checkSymbol(symbol) {
  if ([...symbol].length !== 1 || RESERVED_SYMBOLS.has(symbol)) {
    throw new GlyphError(`a symbol is one character, not a space or any of # . : _ |: '${symbol}'`, 'symbol', { symbol });
  }
  return symbol;
}

/** Read page source ("SYMBOL: node | relation | node", one band per line, a blank line between triplets). */
export function parsePage(text, vocab) {
  const page = { triplets: [] };
  let current = { bands: [] };
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.split('#', 1)[0].trimEnd();
    if (!line.trim()) {
      if (current.bands.length) { page.triplets.push(current); current = { bands: [] }; }
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
  if (current.bands.length) page.triplets.push(current);
  return page;
}

/** Write a page back as page source. */
export function formatPage(page) {
  const blocks = page.triplets.map((t) => t.bands.map((b) => `${b.symbol}: ${b.words.map(wordStr).join(' | ')}`).join('\n'));
  return blocks.join('\n\n') + (blocks.length ? '\n' : '');
}

// ---------- drawing ----------

/** One base-512 digit: nine bits, 256 ... 1, left to right, top to bottom. */
export function numberShape(n) {
  const bits = n.toString(2).padStart(9, '0');
  return [0, 1, 2].map((r) => [0, 1, 2].map((c) => (bits[r * 3 + c] === '1' ? MARK : EMPTY_CELL)).join(''));
}

export function shape(vocab, half) {
  if (half === null) return [EMPTY_CELL.repeat(3), EMPTY_CELL.repeat(3), EMPTY_CELL.repeat(3)];
  if (typeof half === 'number') return numberShape(half);
  return vocab.parts[half].shape;
}

/** Cells taken by a run of positions inside one word. */
export const width = (n) => (n ? 4 * n - GAP_PART : 0);

/** Three rows of text for the positions of one word drawn in one symbol. */
export function bandRows(vocab, hs, symbol) {
  const rows = ['', '', ''];
  hs.forEach((half, i) => {
    const s = shape(vocab, half);
    for (let r = 0; r < 3; r++) rows[r] += (i ? EMPTY_CELL.repeat(GAP_PART) : '') + s[r].replaceAll(MARK, symbol);
  });
  return rows;
}

/** Words side by side, as a quick look-up drawing (not a page). */
export function drawWords(vocab, words, symbol = '+', spacing = 3) {
  const blocks = words.map((w) => bandRows(vocab, positions(w), symbol));
  return [0, 1, 2].map((r) => blocks.map((b) => b[r]).join(' '.repeat(spacing)));
}

/** One triplet with `voices` bands. Each slot is as wide as its longest word. */
export function tripletRows(vocab, t, voices) {
  const widths = tripletWidths(t);
  const xs = [];
  let x = 0;
  for (const w of widths) { xs.push(x); x += width(w) + GAP_WORD; }
  const total = x - GAP_WORD;
  const out = [];
  for (let k = 0; k < voices; k++) {
    if (k) for (let i = 0; i < BAND_GAP; i++) out.push(EMPTY_CELL.repeat(total));
    const band = [0, 1, 2].map(() => Array(total).fill(EMPTY_CELL));
    if (k < t.bands.length) {
      const b = t.bands[k];
      b.words.forEach((w, slot) => {
        if (isEmpty(w)) return;
        bandRows(vocab, positions(w), b.symbol).forEach((row, r) => {
          [...row].forEach((ch, j) => { if (ch !== EMPTY_CELL) band[r][xs[slot] + j] = ch; });
        });
      });
    }
    out.push(...band.map((r) => r.join('')));
  }
  return out;
}

/**
 * Draw a page as rows of text. Triplets run left to right, `perLine` to a line, 4 empty cells apart.
 * Every triplet gets as many bands as the page has voices. Rows are padded to one width.
 */
export function render(vocab, page, perLine = PER_LINE) {
  if (perLine < 1) throw new GlyphError('per_line must be at least 1', 'perLine');
  const n = pageVoices(page);
  const grids = page.triplets.map((t) => tripletRows(vocab, t, n));
  const out = [];
  for (let i = 0; i < grids.length; i += perLine) {
    if (i) for (let j = 0; j < LINE_GAP; j++) out.push('');
    const row = grids.slice(i, i + perLine);
    for (let r = 0; r < row[0].length; r++) out.push(row.map((g) => g[r]).join(EMPTY_CELL.repeat(GAP_TRIPLET)));
  }
  const w = Math.max(0, ...out.map((r) => [...r].length));
  return out.map((r) => r + EMPTY_CELL.repeat(w - [...r].length));
}

/**
 * Triplets whose last word is a number ending in a 0 digit at the end of a drawn line. A 0 digit is a
 * blank position, so there the reader cannot see where the number ends.
 */
export function hiddenZeros(page, perLine = PER_LINE) {
  const out = [];
  page.triplets.forEach((t, idx) => {
    const i = idx + 1;
    if (i % perLine && i !== page.triplets.length) return;
    if (t.bands.some((b) => { const ds = digits(b.words[2]); return isNumber(b.words[2]) && ds.length > 1 && ds[ds.length - 1] === 0; })) out.push(i);
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
export function rowsSvg(rows, symbols, { cell = 12, pad = 1, grid = true, width: cells } = {}) {
  const w = (cells ?? (rows.length ? [...rows[0]].length : 0)) + 2 * pad, h = rows.length + 2 * pad;
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
  return rowsSvg(render(vocab, page, opts.perLine ?? PER_LINE), pageSymbols(page), opts);
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

const bits = (pattern) => parseInt(pattern.join('').replaceAll(EMPTY_CELL, '0').replaceAll(MARK, '1'), 2);

/**
 * Split one drawn line into triplets and words. The gaps say where everything is: 1 empty column inside
 * a word, 2 between words, 4 between triplets. Number digits can have empty columns of their own, so the
 * reader finds every layout in which each position is a part (or a digit, in a number) and keeps the one
 * whose statements read best against the vocabulary.
 */
class LineReader {
  constructor(vocab, bands) {
    this.vocab = vocab;
    this.bands = bands; // n bands of 3 rows, each row an array of cells
    this.width = bands[0][0].length;
    this.byShape = new Map(Object.values(vocab.parts).map((p) => [p.shape.join('/'), p.name]));
    this.filled = Array.from({ length: this.width }, (_, c) => bands.some((b) => b.some((row) => row[c] !== EMPTY_CELL)));
    this.memo = new Map();
  }

  empty(start, stop) {
    if (stop > this.width) return false;
    for (let c = start; c < stop; c++) if (this.filled[c]) return false;
    return true;
  }

  pattern(k, x) {
    return this.bands[k].map((row) => row.slice(x, x + 3).map((ch) => (ch !== EMPTY_CELL ? MARK : EMPTY_CELL)).join(''));
  }

  slot(x, p) {
    const words = [];
    let numberAbove = false, lastUsed = false;
    for (let k = 0; k < this.bands.length; k++) {
      const pats = Array.from({ length: p }, (_, j) => this.pattern(k, x + 4 * j));
      const drawn = pats.map((pat) => pat.some((r) => r.includes(MARK)));
      if (!drawn.some(Boolean)) { words.push(word()); continue; }
      lastUsed = lastUsed || drawn[p - 1];
      const kind = drawn[0] ? (this.byShape.get(pats[0].join('/')) ?? undefined) : null;
      if (kind === undefined) return null;
      if (kind === NUMBER || (kind === null && numberAbove)) {
        const ds = pats.slice(1).map(bits);
        if (kind === NUMBER) {
          lastUsed = lastUsed || p > 1;
          while (ds.length && ds[0] === 0) ds.shift();
        } else {
          while (ds.length && ds[ds.length - 1] === 0) ds.pop();
        }
        words.push(word(kind, !ds.length ? null : ds.length === 1 ? ds[0] : ds));
        numberAbove = numberAbove || kind === NUMBER;
        continue;
      }
      if (p > 2 && drawn.slice(2).some(Boolean)) return null;
      let which = null;
      if (p > 1 && drawn[1]) {
        which = this.byShape.get(pats[1].join('/')) ?? null;
        if (which === null) return null;
      }
      words.push(word(kind, which));
    }
    if (p > 1 && !lastUsed) return null;
    return words;
  }

  read() {
    const layouts = this.layouts(0, 0);
    if (!layouts.length) return null;
    let best = layouts[0], top = this.score(best);
    for (const l of layouts.slice(1)) { const sc = this.score(l); if (sc > top) { best = l; top = sc; } }
    return best;
  }

  score(layout) {
    let total = 0;
    for (const slots of layout) {
      slots.forEach(([, , words], i) => {
        const w = words.find((x) => !isEmpty(x)) ?? word();
        if (i === 1) {
          const part = w.kind ? this.vocab.parts[w.kind] : null;
          total += Boolean(part && part.relation) && (w.which === null || String(w.which) in this.vocab.markers) ? 1 : 0;
        } else {
          total += w.kind === NUMBER || w.which === null || this.vocab.lookup(w) ? 1 : 0;
        }
      });
    }
    return total;
  }

  layouts(x, slot) {
    const key = `${x}:${slot}`;
    if (!this.memo.has(key)) this.memo.set(key, this.findLayouts(x, slot).slice(0, 64));
    return this.memo.get(key);
  }

  findLayouts(x, slot) {
    const found = [];
    for (let p = 1; x + width(p) <= this.width; p++) {
      if (p > 1 && this.filled[x + width(p - 1)]) break; // a mark where the 1-cell gap inside a word must be
      const words = this.slot(x, p);
      const end = x + width(p);
      if (!words) continue;
      const here = [x, end, words];
      if (slot < 2) {
        if (this.empty(end, end + GAP_WORD)) {
          for (const rest of this.layouts(end + GAP_WORD, slot + 1)) found.push([[here, ...rest[0]], ...rest.slice(1)]);
        }
      } else if (this.empty(end, this.width)) {
        found.push([[here]]);
      } else if (this.empty(end, end + GAP_TRIPLET)) {
        for (const rest of this.layouts(end + GAP_TRIPLET, 0)) found.push([[here], ...rest]);
      }
    }
    return found;
  }
}

/**
 * Read a drawing (as made by render) back into a page. A position after COUNT is read as nine bits,
 * and so is a position with no kind under a number (a reply like _.12); everywhere else it must be a part.
 */
export function decode(vocab, text) {
  let rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  const page = { triplets: [] };
  if (!rows.length) return page;
  const w = Math.max(...rows.map((r) => [...r].length));
  rows = rows.map((r) => r + EMPTY_CELL.repeat(w - [...r].length));
  const grid = rows.map((r) => [...r]);
  const n = structure(rows);
  const period = 4 * n - 1 + LINE_GAP;
  for (let top = 0; top < grid.length; top += period) {
    const bands = Array.from({ length: n }, (_, k) => grid.slice(top + 4 * k, top + 4 * k + 3));
    const layout = new LineReader(vocab, bands).read();
    if (!layout) {
      throw new GlyphError(`rows ${top + 1}-${top + 4 * n - 1}: the marks don't split into 3x3 parts with 1, 2 and 4 cell gaps (a picture rather than text?)`,
        'gaps', { from: top + 1, to: top + 4 * n - 1 });
    }
    for (const slots of layout) {
      const start = slots[0][0], stop = slots[slots.length - 1][1];
      const t = { bands: [] };
      for (let k = 0; k < n; k++) {
        const words = slots.map((s) => s[2][k]);
        if (words.every(isEmpty)) continue;
        const marks = new Set(bands[k].flatMap((row) => row.slice(start, stop)).filter((ch) => ch !== EMPTY_CELL));
        if (marks.size > 1) {
          const r0 = top + 4 * k;
          throw new GlyphError(`rows ${r0 + 1}-${r0 + 3}: one band mixes symbols ${[...marks].sort().join(' ')}`, 'mixed', { from: r0 + 1, to: r0 + 3 });
        }
        t.bands.push({ symbol: checkSymbol([...marks][0]), words });
      }
      if (t.bands.length) page.triplets.push(t);
    }
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

/** kind, which, or "digit n" in a number of several digits. */
export function positionName(w, index) {
  if (index === 0) return 'kind';
  return isNumber(w) && digits(w).length > 1 ? `digit ${index}` : 'which';
}

/**
 * Rule 3: every triplet is one edge, read from its first band. Rule 5: every part in a lower band
 * answers the nearest drawn part above it in the same position of the same slot.
 */
export function readGraph(vocab, page) {
  const g = { edges: [], nodes: {} };
  page.triplets.forEach((line, idx) => {
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
      band.words.forEach((w, slot) => {
        positions(w).forEach((below, pos) => {
          let above = null, by = null;
          for (let j = b - 1; j >= 0; j--) {
            const prev = positions(line.bands[j].words[slot]);
            if (pos < prev.length && prev[pos] !== null) { above = prev[pos]; by = line.bands[j].symbol; break; }
          }
          const meaning = respond(above, below);
          if (meaning) reply.responses.push({ slot: SLOTS[slot], half: positionName(w, pos), meaning, part: vocab.thing(below), to: by });
        });
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
