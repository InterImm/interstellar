import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLife, step, choose, answerYears, exchange, PLACES, JOBS, WORDS, WORLDS, TOTAL_POP, rng, pickBirthplace, lightDelay, summary, text, GREAT_CONJUNCTION } from '../lib/life.js';

const vocab = JSON.parse(readFileSync(new URL('../lib/glyph-vocab.json', import.meta.url)));
const known = new Set(vocab.words.map((w) => [w.kind, w.which].filter(Boolean).join('.')));
const NOW = Date.UTC(2219, 9, 18);

function live(seed, mode = 'people', pick = 0) {
  const life = createLife({ seed, mode, now: NOW });
  for (let i = 0; i < 400 && !life.done; i++) {
    const { choice } = step(life);
    if (choice) choose(life, choice, choice.options[pick % choice.options.length].id);
  }
  return life;
}

test('every word the game offers is in the grid-script lexicon', () => {
  const all = [...Object.values(WORDS).flat(), ...JOBS.flatMap((j) => j.words)];
  for (const w of all) assert.ok(known.has(w), `${w} is not in lib/glyph-vocab.json`);
});

test('answers come round every 21.96 years after the reply of 5 October 2219', () => {
  const ys = answerYears(2310);
  assert.equal(ys.length, 4);
  assert.equal(Math.floor(ys[0]), 2241);
  for (let i = 1; i < ys.length; i++) assert.ok(Math.abs(ys[i] - ys[i - 1] - 21.96) < 1e-9);
  const first = exchange(2230)[0];
  assert.equal(first.dir, 'in'); // the duet
  assert.equal(Math.floor(first.to), 2219);
});

test('places: Earth holds almost everyone, and every place has a known world', () => {
  assert.ok(PLACES.find((p) => p.id === 'earth').pop / TOTAL_POP > 0.999);
  for (const p of PLACES) assert.ok(WORLDS[p.world], p.id);
  for (const j of JOBS) for (const w of j.worlds || []) assert.ok(WORLDS[w], `${j.id}: ${w}`);
  const r = rng(7);
  const worlds = new Set(Array.from({ length: 400 }, () => pickBirthplace(r, 'worlds').world));
  assert.equal(worlds.size, Object.keys(WORLDS).length);
});

test('light delay to Earth', () => {
  assert.deepEqual(lightDelay('earth'), [0, 0]);
  const [near, far] = lightDelay('mars');
  assert.ok(near > 4 && near < 5 && far > 20 && far < 22);
});

test('the great conjunction follows the real sky (the book has a Jupiter-Saturn tour in 2180)', () => {
  assert.equal(Math.floor(GREAT_CONJUNCTION(2170)), 2179);
  assert.equal(Math.floor(GREAT_CONJUNCTION(2220)), 2239);
});

test('a seed gives the same birth, and every life ends', () => {
  for (let s = 1; s <= 200; s++) {
    const a = createLife({ seed: s, now: NOW }), b = createLife({ seed: s, now: NOW });
    assert.equal(a.birthplace, b.birthplace);
    assert.equal(a.span, b.span);
    const life = live(s, s % 2 ? 'people' : 'worlds', s);
    assert.ok(life.done, `seed ${s} did not end`);
    assert.ok(life.heard <= 5);
    assert.ok(life.words.length <= life.heard && life.words.length >= life.heard - 1); // an answer in the last year comes too late to answer
    assert.ok(text(life.log.at(-1).body, 'zh').length > 0);
    assert.ok(summary(life, 'en').startsWith('I was born'));
  }
});
