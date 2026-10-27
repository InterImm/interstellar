import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PULSARS, byId, mystery, TELESCOPES, telescope, canSee, delay, flux, fitSpectrum, setup, foldCube, reduce, snr, noise,
  dmCurve, periodCurve, timeSeries, powerSpectrum, profileTable, rotate, sound,
} from '../lib/pulsarlab.js';

const FLUXES = JSON.parse(readFileSync(new URL('../lib/pulsar-fluxes.json', import.meta.url))).fluxes;

test('dispersion delay: 4.149 ms per unit DM at 1 GHz', () => {
  assert.ok(Math.abs(delay(1, 1000) - 4.1488e-3) < 1e-6);
  assert.ok(delay(50, 400) > delay(50, 1400));
});

test('every pulsar but one has measured fluxes, and they fall with frequency', () => {
  for (const p of PULSARS) {
    if (p.id === 'J0737-3039A' || p.id === 'J2144-3933') continue;
    assert.ok(FLUXES[p.id]?.length >= 3, p.id);
  }
  for (const p of PULSARS) assert.ok(flux(p, 400, FLUXES) > flux(p, 3000, FLUXES), p.id);
  // the Crab's 4 Jy point at 1435 MHz caught the nebula; the fit drops it
  assert.ok(flux(byId('J0534+2200'), 1400, FLUXES) < 100);
});

test('a power law fits back its own slope', () => {
  const pts = [100, 300, 1000, 3000].map((f) => [f, 10 * (f / 1000) ** -1.6]);
  const fit = fitSpectrum(pts);
  assert.ok(Math.abs(fit.b + 1.6) < 1e-6);
});

test('profiles average to 1', () => {
  for (const p of PULSARS) {
    const t = profileTable(p, { n: 512 });
    assert.ok(Math.abs(t.reduce((a, v) => a + v, 0) / t.length - 1) < 1e-9, p.id);
  }
});

test('telescopes only see what rises high enough', () => {
  assert.equal(canSee(telescope('fast'), byId('J0835-4510').dec), false); // Vela from Guizhou
  assert.equal(canSee(telescope('parkes'), byId('J0835-4510').dec), true);
  assert.equal(canSee(telescope('parkes'), byId('J0332+5434').dec), false);
  for (const p of PULSARS) assert.ok(TELESCOPES.some((t) => canSee(t, p.dec)), p.id);
});

test('rotation by a whole turn is the identity', () => {
  const row = Float32Array.from({ length: 16 }, (_, i) => i);
  assert.deepEqual([...rotate(row, 1)], [...row]);
  assert.equal(rotate(row, 1 / 16)[1], 0);
});

test('dedispersion and folding peak at the true DM and period', () => {
  const o = setup(byId('J1909-3744'), 'L', 'parkes', FLUXES);
  const f = foldCube(o, { nsub: 30, tsub: 20, nbin: 128, nchan: 32 });
  const right = snr(reduce(f, { dm: o.psr.dm, pTrial: o.psr.p }).prof, noise(f)).snr;
  const raw = snr(reduce(f, { dm: 0, pTrial: o.psr.p }).prof, noise(f)).snr;
  assert.ok(right > 20 && right > 3 * raw, `${right} vs ${raw}`);
  const dm = dmCurve(f, { pTrial: o.psr.p, from: 0, to: 30, n: 61 }).reduce((a, b) => (b[1] > a[1] ? b : a));
  assert.ok(Math.abs(dm[0] - o.psr.dm) < 1, `best DM ${dm[0]}`);
  const span = (8 * o.psr.p ** 2) / 600;
  const p = periodCurve(f, { dm: o.psr.dm, center: o.psr.p + span / 5, span, n: 161 }).reduce((a, b) => (b[1] > a[1] ? b : a));
  assert.ok((Math.abs(p[0] - o.psr.p) * 600) / o.psr.p ** 2 < 0.3, 'best period within a third of a turn');
});

test('the periodicity search finds a bright pulsar', () => {
  const o = setup(byId('J0953+0755'), 'L', 'parkes', FLUXES);
  const { best } = powerSpectrum(timeSeries(o, { dt: 1e-3, ns: 1 << 15 }));
  assert.ok(Math.abs(best.f - 1 / o.psr.p) < 0.05, `${best.f}`);
});

test('a mystery pulsar is repeatable from its seed', () => {
  assert.deepEqual(mystery(5), mystery(5));
  assert.notDeepEqual(mystery(5).p, mystery(6).p);
});

test('sound stays within ±1', () => {
  const o = setup(byId('J0835-4510'), 'L', 'parkes', FLUXES);
  const s = sound(o, { rate: 8000, secs: 1 });
  assert.ok(s.every((v) => Math.abs(v) <= 1));
});
