import test from 'node:test';
import assert from 'node:assert/strict';
import { slip, duetOffset, phaseRows, STATIONS, NOTE_HZ, renderDuet, chorusOffsets } from '../lib/signals.js';

test('the slip is exactly one pulse, smooth at both ends', () => {
  assert.equal(slip(0), 0);
  assert.equal(slip(0.3), 0);
  assert.ok(Math.abs(slip(0.5) - 0.5) < 1e-12);
  assert.equal(slip(0.7), 1);
  assert.equal(slip(1), 1);
  // no jump at the ends: tiny steps give tiny changes
  assert.ok(slip(0.301) < 1e-5);
  assert.ok(1 - slip(0.699) < 1e-5);
});

test('only Earth hears the duet in step', () => {
  const earth = STATIONS.find((s) => s.id === 'earth');
  for (const s of [0, 0.2, 0.29]) assert.equal(duetOffset(s, earth), 0);
  assert.equal(duetOffset(1, earth), 1); // one pulse ahead after the pass: in step again
  for (const st of STATIONS.filter((s) => s.id !== 'earth')) {
    const rows = phaseRows(20, st);
    assert.ok(rows.some((r) => Math.min(r, 1 - r) > 0.05), `${st.id} should not be in step`);
  }
});

test('the chorus ends in step with the pulsar', () => {
  for (const o of chorusOffsets(0.6)) assert.equal(Math.abs(o), 0);
  assert.ok(chorusOffsets(0).some((o) => o !== 0));
});

test('the missing note is the difference of the two pulsars', () => {
  assert.ok(Math.abs(NOTE_HZ - (1 / 0.002947108 - 1 / 0.005757452)) < 1e-9);
});

test('the duet renders a pulsar intro and a full pass', () => {
  const sig = renderDuet({ intro: 1, pass: 2 });
  assert.equal(sig.duration, 3);
  assert.deepEqual(sig.events.map((e) => e.kind), ['pulsar', 'lock', 'slip', 'lock']);
  assert.ok(sig.samples.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.8 + 1e-6));
});
