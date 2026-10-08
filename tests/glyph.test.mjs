// lib/glyph.js against glyph-cli: run with `node --test tests/`.
// The fixtures come from the CLI itself (scripts/glyph_fixtures.py); the other cases are ported from its own tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  Vocabulary, GlyphError, parsePage, formatPage, render, renderSvg, decode, readGraph, formatGraph, drawWords,
  numberShape, wordStr, word, bandRows, WIDTH, responseText,
} from '../lib/glyph.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const DATA = JSON.parse(read('../lib/glyph-vocab.json'));
const ZH = JSON.parse(read('../lib/glyph-zh.json'));
const CLI = JSON.parse(read('./glyph-cli-fixtures.json'));
const vocab = new Vocabulary(DATA);
const page = (text) => parsePage(text, vocab);

test('the bundled vocabulary is sound', () => {
  assert.equal(Object.keys(vocab.parts).length, 16);
  assert.deepEqual(vocab.validate(), []);
});

for (const [name, ex] of Object.entries(CLI.examples)) {
  test(`example ${name} matches glyph-cli`, () => {
    const p = page(ex.source);
    assert.equal(formatPage(p), ex.formatted);
    assert.deepEqual(render(vocab, p), ex.rows);
    assert.deepEqual(formatGraph(vocab, readGraph(vocab, p)), ex.graph);
    assert.equal(renderSvg(vocab, p), ex.svg);
    assert.equal(formatPage(decode(vocab, ex.rows.join('\n'))), ex.decoded);
    assert.deepEqual(decode(vocab, ex.rows.join('\n')), p);
  });
}

test('every vocabulary word draws and reads as in glyph-cli', () => {
  assert.equal(vocab.entries.length, Object.keys(CLI.words).length);
  for (const e of vocab.entries) {
    const want = CLI.words[wordStr(e.word)];
    assert.deepEqual(drawWords(vocab, [e.word]), want.rows, wordStr(e.word));
    assert.equal(vocab.gloss(e.word), want.gloss);
  }
});

test('parsing words matches glyph-cli', () => {
  for (const [text, want] of Object.entries(CLI.parse)) {
    if (want.error) {
      assert.throws(() => vocab.parse(text), (err) => err instanceof GlyphError && want.error.startsWith(err.message), text);
    } else {
      const w = vocab.parse(text);
      assert.equal(wordStr(w), want.word, text);
      assert.equal(vocab.gloss(w), want.node, text);
      assert.equal(vocab.gloss(w, 'relation'), want.relation, text);
    }
  }
});

test('numbers are nine bits, as in glyph-cli', () => {
  assert.deepEqual(numberShape(137), ['.#.', '..#', '..#']);
  assert.deepEqual(numberShape(12), ['...', '..#', '#..']);
  for (const [n, rows] of Object.entries(CLI.numbers)) assert.deepEqual(drawWords(vocab, [vocab.parse(`COUNT.${n}`)]), rows);
});

test('no number draws like a word', () => {
  const words = new Set(vocab.entries.map((e) => bandRows(vocab, [e.word.kind, e.word.which], '#').join('/')));
  for (let n = 1; n < 512; n++) assert.ok(!words.has(bandRows(vocab, ['COUNT', n], '#').join('/')), String(n));
});

test('lines are padded to the page voices', () => {
  const rows = render(vocab, page('+: SELF | ONE | OTHER\n×: _ | _ | _.NOT\n\n+: SELF | ONE | SELF'));
  assert.equal(rows.length, 7 + 3 + 7);
  assert.ok(rows.every((r) => [...r].length === WIDTH));
});

test('numbers read back as numbers', () => {
  for (const n of [0, 1, 12, 16, 137, 170, 273, 487, 495, 511]) {
    const back = decode(vocab, render(vocab, page(`+: STAR.TIME | ONE | COUNT.${n}`)).join('\n'));
    assert.equal(wordStr(back.lines[0].bands[0].words[2]), n === 0 ? 'COUNT' : `COUNT.${n}`);
  }
  const p = page('+: STAR.TIME | ONE | COUNT.12\n×: _ | _ | _.495');
  assert.deepEqual(decode(vocab, render(vocab, p).join('\n')), p);
  const q = page('+: ONE.SELF | ONE | ONE.OTHER');
  assert.deepEqual(decode(vocab, render(vocab, q).join('\n')), q);
});

test('pictures are refused', () => {
  const dots = '.'.repeat(23) + '\n';
  assert.throws(() => decode(vocab, '+++\n...\n'), /wide/);
  assert.throws(() => decode(vocab, '...+...................\n' + dots + dots), /between lattice/);
  assert.throws(() => decode(vocab, '+++.×××................\n+.+.×.×................\n+++.×××................\n'), /mixes symbols/);
  assert.throws(() => decode(vocab, '+.+....................\n' + dots + dots), /not a part/);
  assert.equal(decode(vocab, '').lines.length, 0);
});

test('parse errors name the line', () => {
  assert.throws(() => page('+: SELF | ONE | OTHER\n+ SELF | ONE | OTHER'), /line 2/);
  assert.throws(() => page('+: SELF | ONE'), /three slots/);
  assert.throws(() => page('+: SELF | ONE | WIND'), /unknown part/);
  assert.throws(() => page('.: SELF | ONE | OTHER'), /symbol/);
});

test('rule five', () => {
  const cases = [
    ['×: _ | _ | BODY.AIR', ['object.kind: yes (to +)', 'object.which: yes (to +)']],
    ['×: _ | _ | _.NOT', ['object.which: no (to +)']],
    ['×: _ | _ | _.WATER', ['object.which: instead "water" (to +)']],
    ['×: _ | ONE.PATH | _', ['relation.kind: yes (to +)', 'relation.which: and also "way, between"']],
    ['×: _ | _ | _', []],
  ];
  for (const [reply, want] of cases) {
    const g = readGraph(vocab, page('+: BODY.OTHER | ONE | BODY.AIR\n' + reply));
    assert.deepEqual(g.edges[0].replies[0].responses.map((r) => responseText(r)), want);
  }
  const g = readGraph(vocab, page('+: SELF | LIGHT.BEFORE | ONE'));
  assert.equal(formatGraph(vocab, g)[1], '1. (+) we --see [past]--> [that: nothing above]');
});

test('the Chinese glosses cover the whole vocabulary', () => {
  for (const name of Object.keys(vocab.parts)) assert.ok(ZH.parts[name]?.thing, name);
  for (const m of Object.keys(vocab.markers)) assert.ok(ZH.markers[m], m);
  for (const d of vocab.domains()) assert.ok(ZH.domains[d], d);
  const seen = new Set();
  for (const e of vocab.entries) {
    const z = ZH.words[wordStr(e.word)];
    assert.ok(z?.gloss, wordStr(e.word));
    assert.ok(!seen.has(z.gloss), `duplicate Chinese gloss ${z.gloss}`);
    seen.add(z.gloss);
  }
  assert.deepEqual(Object.keys(ZH.words).sort(), vocab.entries.map((e) => wordStr(e.word)).sort());
});

test('a word built by hand', () => {
  assert.deepEqual(vocab.parse('body.star'), word('BODY', 'STAR'));
  assert.equal(vocab.gloss(word('BODY', 'STAR')), 'world, matter | star (not in vocabulary)');
});
