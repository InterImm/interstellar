// Pulsar lab: the physics behind /pulsar-lab/. No live public pulsar feed exists, so everything here is a
// simulation built from real numbers: periods, dispersion measures, distances and positions from the ATNF
// Pulsar Catalogue (rounded), and flux densities measured at many radio frequencies (lib/pulsar-fluxes.json,
// gathered from the literature by pulsar_spectra). The noise follows the radiometer equation for real
// telescopes, so what is easy or hard to see here is easy or hard for astronomers too.
//
// Units: seconds, MHz, mJy, pc cm^-3. Pulse phase runs 0..1 over one turn.

// Dispersion constant: a pulse at f MHz is late by KDM * DM / f^2 seconds (relative to infinite frequency).
export const KDM = 4.148808e3;
export const delay = (dm, fMHz) => (KDM * dm) / (fMHz * fMHz);

// Profiles are schematic: one to three Gaussian components {at, w (sigma, phase), a}. ATNF gives the width W50
// for each; the shapes follow published profiles at 1.4 GHz loosely. tau1 is the scattering time at 1 GHz,
// from the Bhat et al. (2004) fit to DM unless noted; it grows as f^-4 toward low frequencies.
export const PULSARS = [
  { id: 'J1909-3744', b: '', p: 0.002947108, dm: 10.39, dist: 1.14, dec: -37.74, pb: 1.533,
    prof: [{ at: 0, w: 0.006, a: 1 }, { at: 0.47, w: 0.02, a: 0.06 }] },
  { id: 'J0835-4510', b: 'B0833−45', p: 0.0893284, dm: 67.97, dist: 0.28, dec: -45.18,
    prof: [{ at: 0, w: 0.0095, a: 1 }, { at: 0.012, w: 0.008, a: 0.35 }] },
  { id: 'J0534+2200', b: 'B0531+21', p: 0.0333924, dm: 56.77, dist: 2.0, dec: 22.01,
    prof: [{ at: 0, w: 0.008, a: 1 }, { at: 0.4, w: 0.01, a: 0.45 }] },
  { id: 'J1921+2153', b: 'B1919+21', p: 1.3373022, dm: 12.44, dist: 0.3, dec: 21.88,
    prof: [{ at: -0.005, w: 0.0045, a: 1 }, { at: 0.006, w: 0.0045, a: 0.8 }] },
  { id: 'J0332+5434', b: 'B0329+54', p: 0.7145197, dm: 26.76, dist: 1.0, dec: 54.58,
    prof: [{ at: -0.011, w: 0.003, a: 0.35 }, { at: 0, w: 0.0028, a: 1 }, { at: 0.012, w: 0.0035, a: 0.45 }] },
  { id: 'J0437-4715', b: '', p: 0.005757452, dm: 2.644, dist: 0.157, dec: -47.25, pb: 5.741,
    prof: [{ at: -0.03, w: 0.025, a: 0.25 }, { at: 0, w: 0.012, a: 1 }, { at: 0.035, w: 0.03, a: 0.2 }] },
  { id: 'J1939+2134', b: 'B1937+21', p: 0.0015578, dm: 71.02, dist: 2.9, dec: 21.58,
    prof: [{ at: 0, w: 0.012, a: 1 }, { at: 0.52, w: 0.014, a: 0.45 }] },
  { id: 'J0737-3039A', b: '', p: 0.0226994, dm: 48.92, dist: 0.74, dec: -30.66, pb: 0.10225,
    prof: [{ at: -0.04, w: 0.018, a: 0.8 }, { at: 0.03, w: 0.02, a: 1 }, { at: 0.5, w: 0.03, a: 0.35 }] },
  { id: 'J1915+1606', b: 'B1913+16', p: 0.0590300, dm: 168.77, dist: 5.2, dec: 16.11, pb: 0.322997,
    prof: [{ at: -0.04, w: 0.015, a: 0.7 }, { at: 0.035, w: 0.015, a: 1 }] },
  { id: 'J0953+0755', b: 'B0950+08', p: 0.2530651, dm: 2.97, dist: 0.26, dec: 7.93,
    prof: [{ at: 0, w: 0.016, a: 1 }, { at: 0.47, w: 0.03, a: 0.04 }] },
  { id: 'J1300+1240', b: 'B1257+12', p: 0.0062185, dm: 10.17, dist: 0.7, dec: 12.68,
    prof: [{ at: -0.02, w: 0.012, a: 0.6 }, { at: 0.015, w: 0.012, a: 1 }] },
  { id: 'J1713+0747', b: '', p: 0.004570137, dm: 15.99, dist: 1.18, dec: 7.79, pb: 67.83,
    prof: [{ at: 0, w: 0.011, a: 1 }, { at: 0.02, w: 0.015, a: 0.25 }] },
  { id: 'J2144-3933', b: '', p: 8.5098, dm: 3.35, dist: 0.17, dec: -39.57,
    prof: [{ at: 0, w: 0.0009, a: 1 }], s1400: 0.8 },
];

export const byId = (id) => PULSARS.find((p) => p.id === id);

// A pulsar nobody has catalogued: a random period and DM, so the tools have something to find.
export function mystery(seed) {
  const r = rng(seed);
  const slow = r() < 0.5;
  const p = slow ? 0.15 * Math.exp(r() * Math.log(20)) : 0.0018 * Math.exp(r() * Math.log(12));
  const dm = Math.round((8 + r() * 140) * 100) / 100;
  const w = slow ? 0.008 + r() * 0.01 : 0.012 + r() * 0.02;
  return {
    id: 'mystery', b: '', p: Math.round(p * 1e9) / 1e9, dm, dist: null, dec: 10 + r() * 30, mystery: true,
    prof: [{ at: 0, w, a: 1 }, ...(r() < 0.5 ? [{ at: 1.8 * w, w: w * 0.8, a: 0.5 }] : [])],
    s1400: slow ? 8 + r() * 16 : 3 + r() * 5, alpha: -1.4 - r() * 0.6,
  };
}

// ------------------------------------------------------------------ bands and telescopes

// Observing bands: what a receiver takes in. Low bands show more dispersion, scattering and sky noise.
export const BANDS = [
  { id: 'p350', lo: 300, hi: 400 },
  { id: 'p820', lo: 720, hi: 920 },
  { id: 'L', lo: 1200, hi: 1600 },
  { id: 'S', lo: 2500, hi: 3500 },
];
export const band = (id) => BANDS.find((b) => b.id === id);

// Telescopes: gain (K/Jy), receiver temperature (K), latitude (deg) and how far from the zenith they can point.
// Values are typical published figures, rounded.
export const TELESCOPES = [
  { id: 'dish25', g: 0.11, trx: 35, lat: 52.8, maxZa: 80, bands: ['L'] },
  { id: 'parkes', g: 0.73, trx: 22, lat: -33.0, maxZa: 59.5, bands: ['p820', 'L', 'S'] },
  { id: 'gbt', g: 2.0, trx: 22, lat: 38.4, maxZa: 85, bands: ['p350', 'p820', 'L', 'S'] },
  { id: 'fast', g: 16, trx: 22, lat: 25.65, maxZa: 40, bands: ['L'] },
];
export const telescope = (id) => TELESCOPES.find((t) => t.id === id);

// Can this telescope see that declination at all? The highest it gets is at transit: zenith angle |lat - dec|.
export const canSee = (tel, dec) => Math.abs(tel.lat - dec) <= tel.maxZa;

// Sky temperature away from the Milky Way's plane, a rough average: 25 K at 408 MHz, falling as f^-2.55.
export const tsky = (fMHz) => 25 * Math.pow(fMHz / 408, -2.55);
export const tsys = (tel, fMHz) => tel.trx + tsky(fMHz);

// ------------------------------------------------------------------ flux densities

// Fit log S = a + b x + c x^2 with x = log10(f / 1 GHz), dropping wild points (a measurement that caught the
// Crab Nebula too, say). A curve only when the data spread wide enough to bend; otherwise a straight power law.
export function fitSpectrum(points) {
  let pts = points.map(([f, s]) => [Math.log10(f / 1000), Math.log10(s)]);
  if (!pts.length) return null;
  let fit = null;
  for (let round = 0; round < 3; round++) {
    const xs = pts.map((p) => p[0]);
    const span = Math.max(...xs) - Math.min(...xs);
    const order = pts.length >= 8 && span > 1.2 ? 2 : pts.length >= 2 && span > 0.15 ? 1 : 0;
    fit = { ...polyfit(pts, order), lo: Math.min(...xs), hi: Math.max(...xs) };
    const keep = pts.filter(([x, y]) => Math.abs(y - evalFit(fit, x)) < 0.6);
    if (keep.length === pts.length || keep.length < 3) break;
    pts = keep;
  }
  return fit;
}

function polyfit(pts, order) {
  const n = order + 1;
  const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (const [x, y] of pts) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) A[i][j] += x ** (i + j);
      A[i][n] += y * x ** i;
    }
  }
  for (let i = 0; i < n; i++) { // Gauss-Jordan; the systems are 3x3 at most
    let m = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
    [A[i], A[m]] = [A[m], A[i]];
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const r = A[k][i] / A[i][i];
      for (let j = i; j <= n; j++) A[k][j] -= r * A[i][j];
    }
  }
  const c = A.map((row, i) => row[n] / row[i]);
  return { a: c[0], b: c[1] ?? 0, c: c[2] ?? 0 };
}

// Outside the measured range a curved fit would run away, so it continues along its tangent.
function evalFit(fit, x) {
  const xc = Math.min(fit.hi, Math.max(fit.lo, x));
  const y = fit.a + fit.b * xc + fit.c * xc * xc;
  return y + (fit.b + 2 * fit.c * xc) * (x - xc);
}

// Period-averaged flux density in mJy at f MHz.
export function flux(psr, fMHz, fluxes) {
  const pts = fluxes?.[psr.id];
  if (pts?.length) { psr._fit ??= fitSpectrum(pts); return 10 ** evalFit(psr._fit, Math.log10(fMHz / 1000)); }
  return (psr.s1400 ?? 1) * (fMHz / 1400) ** (psr.alpha ?? -1.6);
}

// Spectral index at f: the local slope of log S against log f.
export function spectralIndex(psr, fMHz, fluxes) {
  const d = 0.01;
  return (Math.log10(flux(psr, fMHz * 10 ** d, fluxes)) - Math.log10(flux(psr, fMHz, fluxes))) / d;
}

// ------------------------------------------------------------------ the signal

// Scattering time (s) at f MHz. Bhat et al. (2004): log tau_ms = -6.46 + 0.154 log DM + 1.07 (log DM)^2 - 3.86 log f_GHz.
export function scatter(dm, fMHz) {
  const l = Math.log10(dm);
  return 1e-3 * 10 ** (-6.46 + 0.154 * l + 1.07 * l * l - 3.86 * Math.log10(fMHz / 1000));
}

// complementary error function, Numerical Recipes erfcc (fractional error < 1.2e-7)
function erfc(x) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

// One component: a Gaussian of width s, smeared by extra width `smear` (sigma, added in quadrature) and by an
// exponential scattering tail of length tau. Phase x is relative to the component's centre, wrapped.
function component(x, s, tau) {
  if (tau < s * 0.05) return Math.exp(-0.5 * (x / s) ** 2);
  // exponentially modified Gaussian, scaled so the unscattered peak would be 1
  const k = s / tau;
  const arg = (k - x / s) / Math.SQRT2;
  if (arg > 25) return Math.exp(-0.5 * (x / s) ** 2); // the tail term underflows; it is the plain Gaussian here
  return Math.sqrt(Math.PI / 2) * k * Math.exp(0.5 * k * k - x / tau) * erfc(arg);
}

// The pulse profile at phase ph, normalised so its mean over one turn is 1. `extra` widens it (sigma, phase
// units): sampling, smearing inside a channel, a wrong DM or period. `tau` is scattering in phase units.
// Returns a lookup table of n bins for speed.
export function profileTable(psr, { n = 1024, extra = 0, tau = 0 } = {}) {
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const ph = i / n;
    let v = 0;
    for (const c of psr.prof) {
      const s = Math.hypot(c.w, extra);
      let x = ph - c.at; x -= Math.round(x); // nearest image of the component
      v += (c.a * c.w) / s * (component(x, s, tau) + component(x - 1, s, tau) + component(x + 1, s, tau));
    }
    t[i] = v;
  }
  let mean = 0; for (const v of t) mean += v; mean /= n;
  for (let i = 0; i < n; i++) t[i] /= mean;
  return t;
}

export const lookup = (table, ph) => { const n = table.length; ph -= Math.floor(ph); const x = ph * n; const i = Math.floor(x); const f = x - i; return table[i % n] * (1 - f) + table[(i + 1) % n] * f; };

// Signal-to-noise per unit of flux: what one mJy is worth in noise sigmas for bandwidth bw (MHz) and
// integration t (s), two polarisations. The radiometer equation.
export const snrPerMjy = (tel, fMHz, bw, t) => (1e-3 * tel.g * Math.sqrt(2 * bw * 1e6 * t)) / tsys(tel, fMHz);

// Seeded random numbers (mulberry32) and Gaussian noise (Box-Muller).
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function gauss(r) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = r();
    const m = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * r();
    spare = m * Math.sin(th); return m * Math.cos(th);
  };
}

// An observation setup: pulsar, band, telescope, number of channels.
export function setup(psr, bandId, telId, fluxes, nchan = 64) {
  const b = band(bandId), tel = telescope(telId);
  const bw = (b.hi - b.lo) / nchan;
  const chans = Array.from({ length: nchan }, (_, c) => {
    const f = b.hi - (c + 0.5) * bw; // channel 0 at the top of the band, as on a waterfall
    return { f, s: flux(psr, f, fluxes), delay: delay(psr.dm, f), tau: scatter(psr.dm, f), smear: 8.3e-6 * psr.dm * bw / (f / 1000) ** 3 };
  });
  return { psr, band: b, tel, nchan, bw, chans, fc: (b.lo + b.hi) / 2, visible: canSee(tel, psr.dec) };
}

// Raw filterbank data, as the receiver records it: nchan rows of total power over time, samples of `dt`
// seconds, in noise sigmas. Dispersion, scattering and smearing all included. Returns next(ns), which hands
// back the following ns samples of every channel each time it is called.
export function stream(obs, { dt, seed = 1, t0 = 0 }) {
  const { psr, chans, bw, tel } = obs;
  const g = gauss(rng(seed));
  const rows = chans.map((ch) => ({
    tab: profileTable(psr, { n: 1024, extra: Math.hypot(ch.smear, dt) / psr.p / 2.355, tau: ch.tau / psr.p }),
    k: ch.s * snrPerMjy(tel, ch.f, bw, dt), delay: ch.delay,
  }));
  let i0 = 0;
  return (ns) => {
    const out = rows.map((r) => { const row = new Float32Array(ns); for (let i = 0; i < ns; i++) row[i] = r.k * lookup(r.tab, (t0 + (i0 + i) * dt - r.delay) / psr.p) + g(); return row; });
    i0 += ns;
    return out;
  };
}
export const filterbank = (obs, { t0 = 0, dt, ns, seed = 1 }) => stream(obs, { dt, seed, t0 })(ns);

// The folded observation, as astronomers keep it: `nsub` sub-integrations of tsub seconds each, every channel
// folded into nbin phase bins at the pulsar's true period, with no dispersion removed (DM 0). Everything
// the tools do (dedisperse at a trial DM, refold at a trial period) is done to this cube by rotating rows.
// The noise in each bin follows the radiometer equation for tsub/nbin seconds.
export function foldCube(obs, { nsub, tsub, nbin = 128, seed = 7, nchan } = {}) {
  const { psr, tel } = obs;
  const sub = nchan && nchan < obs.nchan ? obs.nchan / nchan : 1; // optionally fewer, wider channels
  const nc = obs.nchan / sub, bw = obs.bw * sub;
  const g = gauss(rng(seed));
  const cube = Array.from({ length: nsub }, () => Array.from({ length: nc }, () => new Float32Array(nbin)));
  for (let c = 0; c < nc; c++) {
    const chs = obs.chans.slice(c * sub, (c + 1) * sub);
    const f = chs.reduce((a, ch) => a + ch.f, 0) / sub;
    const ch = { f, s: chs.reduce((a, x) => a + x.s, 0) / sub, delay: chs.reduce((a, x) => a + x.delay, 0) / sub, tau: scatter(psr.dm, f), smear: chs[0].smear * sub };
    const dSpan = sub > 1 ? Math.abs(chs[0].delay - chs[sub - 1].delay) : 0;
    const tab = profileTable(psr, { n: 1024, extra: Math.hypot(ch.smear, dSpan, psr.p / nbin) / psr.p / 2.355, tau: ch.tau / psr.p });
    const k = ch.s * snrPerMjy(tel, f, bw, tsub / nbin);
    const shift = ch.delay / psr.p;
    for (let s = 0; s < nsub; s++) {
      const row = cube[s][c];
      for (let i = 0; i < nbin; i++) row[i] = k * lookup(tab, (i + 0.5) / nbin - shift) + g();
    }
  }
  return { cube, nsub, nchan: nc, nbin, tsub, freqs: Array.from({ length: nc }, (_, c) => obs.chans.slice(c * sub, (c + 1) * sub).reduce((a, x) => a + x.f, 0) / sub), p: psr.p };
}

// Rotate a row by `turns` of phase (positive = later), linear interpolation.
export function rotate(row, turns, out = new Float32Array(row.length)) {
  const n = row.length;
  let sh = (turns * n) % n; if (sh < 0) sh += n;
  const i0 = Math.floor(sh), f = sh - i0;
  for (let i = 0; i < n; i++) {
    const j = i - i0; // out[i] = row[i - sh]
    out[i] = row[((j % n) + n) % n] * (1 - f) + row[(((j - 1) % n) + n) % n] * f;
  }
  return out;
}

// A boxcar of `w` bins, wrapping around the turn: the smearing a wrong period causes inside one sub-integration.
export function smooth(row, w) {
  const n = row.length;
  if (w <= 1) return row;
  if (w >= n) { const m = row.reduce((a, v) => a + v, 0) / n; return row.fill(m); }
  const src = Float32Array.from(row), k = Math.round(w), h = k >> 1;
  let s = 0; for (let i = -h; i < k - h; i++) s += src[((i % n) + n) % n];
  for (let i = 0; i < n; i++) { row[i] = s / k; s += src[(i + k - h) % n] - src[((i - h) % n + n) % n]; }
  return row;
}

// How far (turns) the pulse has wandered by time t when folding at pTrial instead of the true period p.
const drift = (t, p, pTrial) => t * (1 / pTrial - 1 / p);
// Dispersion delay of channel c, in turns, relative to the top of the band.
const dispTurns = (fold, dm, c) => (delay(dm, fold.freqs[c]) - delay(dm, fold.freqs[0])) / fold.p;

// Sub-integrations refolded at pTrial, each summed over all channels after removing dispersion at dm.
export function subints(fold, { dm, pTrial, upTo = fold.nsub }) {
  const { cube, nchan, nbin, tsub, p } = fold;
  const tmp = new Float32Array(nbin);
  const smear = Math.abs(drift(tsub, p, pTrial)) * nbin;
  return Array.from({ length: upTo }, (_, s) => {
    const row = new Float32Array(nbin);
    const d = drift((s + 0.5) * tsub, p, pTrial);
    for (let c = 0; c < nchan; c++) {
      rotate(cube[s][c], d - dispTurns(fold, dm, c), tmp);
      for (let i = 0; i < nbin; i++) row[i] += tmp[i];
    }
    return smooth(row, smear);
  });
}

// Each channel summed over the sub-integrations (refolded at pTrial), with dispersion still in.
export function channels(fold, { pTrial, upTo = fold.nsub }) {
  const { cube, nchan, nbin, tsub, p } = fold;
  const tmp = new Float32Array(nbin);
  const smear = Math.abs(drift(tsub, p, pTrial)) * nbin;
  return Array.from({ length: nchan }, (_, c) => {
    const row = new Float32Array(nbin);
    for (let s = 0; s < upTo; s++) {
      rotate(cube[s][c], drift((s + 0.5) * tsub, p, pTrial), tmp);
      for (let i = 0; i < nbin; i++) row[i] += tmp[i];
    }
    return smooth(row, smear);
  });
}

// Remove dispersion at dm from channel profiles, in place; returns them and their sum.
export function dedisperse(fold, chans, dm) {
  const nbin = fold.nbin, prof = new Float32Array(nbin), tmp = new Float32Array(nbin);
  const out = chans.map((row, c) => { rotate(row, -dispTurns(fold, dm, c), tmp); const r = Float32Array.from(tmp); for (let i = 0; i < nbin; i++) prof[i] += r[i]; return r; });
  return { chan: out, prof };
}

const sumRows = (rows, nbin) => { const p = new Float32Array(nbin); for (const r of rows) for (let i = 0; i < nbin; i++) p[i] += r[i]; return p; };

// Everything the tools draw: sub-integrations against phase, channels against phase, and the profile.
export function reduce(fold, { dm, pTrial, upTo = fold.nsub }) {
  const sub = subints(fold, { dm, pTrial, upTo });
  const { chan } = dedisperse(fold, channels(fold, { pTrial, upTo }), dm);
  return { sub, chan, prof: sumRows(sub, fold.nbin) };
}

// Signal-to-noise of a folded profile: the best boxcar over the peak. The baseline is the quietest quarter
// of the turn; the noise is `sd` per bin when known (it is for our folded data: one sigma per cell added up),
// else estimated from the quieter bins.
export function snr(prof, sd) {
  const n = prof.length;
  let best = { snr: 0, at: 0, w: 1 };
  const sorted = [...prof].sort((a, b) => a - b);
  const q = sorted.slice(0, Math.max(2, n >> 2));
  const base = q.reduce((a, v) => a + v, 0) / q.length;
  if (!sd) {
    const low = sorted.slice(0, Math.floor(n * 0.7));
    const m = low.reduce((a, v) => a + v, 0) / low.length;
    sd = Math.sqrt(low.reduce((a, v) => a + (v - m) ** 2, 0) / low.length) / 0.6 || 1;
  }
  for (const w of [1, 2, 4, 8, 16, 32]) {
    for (let i = 0; i < n; i++) {
      let s = 0; for (let k = 0; k < w; k++) s += prof[(i + k) % n] - base;
      const v = s / (sd * Math.sqrt(w));
      if (v > best.snr) best = { snr: v, at: (i + w / 2) / n, w };
    }
  }
  return best;
}

// The noise per bin of a profile summed over `upTo` sub-integrations and every channel. Smearing by a wrong
// period lowers it per bin but correlates neighbours, so the boxcar in snr() is held to this unsmeared value.
export const noise = (fold, upTo = fold.nsub) => Math.sqrt(upTo * fold.nchan);

// Signal-to-noise over a range of trial DMs (channels collapsed once, then shifted) or trial periods
// (sub-integrations collapsed once, then shifted and smeared).
export function dmCurve(fold, { pTrial, from, to, n = 120, upTo = fold.nsub }) {
  const ch = channels(fold, { pTrial, upTo });
  return Array.from({ length: n }, (_, i) => { const dm = from + ((to - from) * i) / (n - 1); return [dm, snr(dedisperse(fold, ch, dm).prof, noise(fold, upTo)).snr]; });
}
export function periodCurve(fold, { dm, center, span, n = 120, upTo = fold.nsub }) {
  const base = subints(fold, { dm, pTrial: fold.p, upTo });
  const { nbin, tsub, p } = fold, tmp = new Float32Array(nbin);
  return Array.from({ length: n }, (_, i) => {
    const pt = center + span * (i / (n - 1) - 0.5);
    const prof = new Float32Array(nbin);
    base.forEach((row, s) => { rotate(row, drift((s + 0.5) * tsub, p, pt), tmp); for (let k = 0; k < nbin; k++) prof[k] += tmp[k]; });
    const w = Math.abs(drift(tsub, p, pt)) * nbin;
    return [pt, snr(smooth(prof, w), noise(fold, upTo)).snr];
  });
}

// A dedispersed time series for the periodicity search: ns samples of dt seconds, the band summed after
// removing dispersion at dmTrial. Any DM error smears the pulse by the residual sweep across the band.
export function timeSeries(obs, { dt, ns, dmTrial = obs.psr.dm, seed = 3, ideal = false }) {
  const { psr, band: b, tel, fc } = obs;
  const resid = Math.abs(delay(psr.dm - dmTrial, b.lo) - delay(psr.dm - dmTrial, b.hi));
  const tab = profileTable(psr, { n: 2048, extra: Math.hypot(dt, resid / 2, obs.chans[obs.nchan >> 1].smear) / psr.p / 2.355, tau: scatter(psr.dm, fc) / psr.p });
  const S = obs.chans.reduce((a, c) => a + c.s, 0) / obs.nchan;
  const k = S * snrPerMjy(tel, fc, b.hi - b.lo, dt);
  const g = gauss(rng(seed));
  const x = new Float32Array(ns);
  for (let i = 0; i < ns; i++) x[i] = k * lookup(tab, (i * dt) / psr.p) + (ideal ? 0 : g());
  return { x, dt, k };
}

// In-place radix-2 FFT on (re, im). n must be a power of two.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

// Power spectrum normalised to mean 1 in noise, and the best candidate after summing 1, 2, 4, 8 harmonics.
export function powerSpectrum(series) {
  const { x, dt } = series;
  const n = x.length;
  let mean = 0; for (const v of x) mean += v; mean /= n;
  const re = Float64Array.from(x, (v) => v - mean), im = new Float64Array(n);
  fft(re, im);
  const half = n / 2;
  const pow = new Float32Array(half);
  for (let i = 0; i < half; i++) pow[i] = re[i] * re[i] + im[i] * im[i];
  const norm = [...pow.slice(Math.floor(half / 4))].sort((a, b) => a - b)[Math.floor(half * 0.375)] / Math.LN2 || 1; // median of exp(1) is ln 2
  for (let i = 0; i < half; i++) pow[i] /= norm;
  const df = 1 / (n * dt);
  // incoherent harmonic sum of h harmonics starting at bin i, in noise sigmas
  const sum = (i, h) => { let s = 0; for (let k = 1; k <= h; k++) { const j = Math.round(i * k); if (j + 1 >= half) return -1; s += Math.max(pow[j - 1], pow[j], pow[j + 1]); } return (s - h) / Math.sqrt(h); };
  let best = { f: 0, power: 0, harm: 1 };
  const lo = Math.max(2, Math.ceil(0.05 / df)); // below 0.05 Hz is red noise and baseline drift
  for (const h of [1, 2, 4, 8]) {
    for (let i = lo; i * h < half - 1; i++) {
      const sig = sum(i, h);
      if (sig > best.power) best = { f: i * df, power: sig, harm: h, bin: i };
    }
  }
  // sifting: a narrow pulse (or an interpulse) can make a higher harmonic win; if a whole fraction of the
  // frequency explains the power as well with that many more harmonics, the true spin is there
  for (const d of [5, 4, 3, 2]) {
    const i = best.bin / d;
    if (i < lo) continue;
    const h = Math.min(64, best.harm * d), sig = sum(i, h);
    if (sig >= 0.8 * best.power) { best = { f: i * df, power: Math.max(sig, best.power), harm: h, bin: i }; break; }
  }
  return { pow, df, best };
}

// Sound: the dedispersed intensity, as radio astronomers play it, at sample rate `rate` for `secs` seconds.
// The emission itself is noise-like, so each pulse is a burst of noise shaped by the profile.
export function sound(obs, { rate = 44100, secs = 5, noise = true, seed = 11 }) {
  const { psr } = obs;
  const n = Math.round(rate * secs), dt = 1 / rate;
  const tab = profileTable(psr, { n: 4096, extra: Math.hypot(dt, scatter(psr.dm, obs.fc) / 2) / psr.p / 2.355 });
  const g = gauss(rng(seed));
  // signal-to-noise per sample from the radiometer equation; capped so the pulses never vanish completely
  const S = obs.chans.reduce((a, c) => a + c.s, 0) / obs.nchan;
  const snr = Math.max(0.02, S * snrPerMjy(obs.tel, obs.fc, obs.band.hi - obs.band.lo, dt));
  const peak = Math.max(...tab);
  const out = new Float32Array(n);
  let m = 0;
  for (let i = 0; i < n; i++) {
    const env = lookup(tab, (i * dt) / psr.p) / peak;
    const v = env * (0.6 + 0.4 * g()) * (noise ? Math.min(1, snr) : 1) + (noise ? 0.35 * g() / Math.max(1, Math.sqrt(snr)) : 0);
    out[i] = v; m = Math.max(m, Math.abs(v));
  }
  const fade = Math.round(rate * 0.02);
  for (let i = 0; i < n; i++) out[i] = (out[i] / m) * 0.8 * Math.min(1, i / fade, (n - 1 - i) / fade);
  return out;
}
