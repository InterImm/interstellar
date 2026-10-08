// The five transmissions from Ross 128 b, as data and as sound. One ES module, no DOM, every function pure.
//
// 1. The duet: a pulse train at the exact rate of pulsar J1909−3744, in step with it as heard at Earth's
//    centre, that slips by exactly one pulse and locks again. Later passes brought two more cases of the same
//    kind: the chorus and the missing note.
// 2. The shadow: Earth's transit of the Sun as they saw it, century by century, from the real geometry in
//    lib/drift.js; then their own planet's transit.
// 3. The pulsars: twelve pulse trains at the real periods. A period names a pulsar; the phase they report for
//    each one, compared with ours, fixes where and when they are.
// 4. The chords: real molecular radio lines sent together. A chord names a molecule; loudness is how much.
// 5. The number: two click trains in the ratio 1/α.
//
// Sound is a sonification: radio frequencies and decades are mapped into hearing range and seconds. Each
// `render*` returns { samples: Float32Array (mono, RATE Hz), events: [{ t, ... }] } where events say what is
// sounding at time t (seconds), for drawing a cursor.
import { at, TRANSIT_ZONE } from './drift.js';

export const RATE = 22050;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ helpers

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));
// a sine burst with short ramps, added into `out` from t0 for `dur` seconds
function tone(out, t0, dur, freq, amp = 0.3, ramp = 0.008) {
  const i0 = Math.round(t0 * RATE), n = Math.round(dur * RATE), r = Math.max(1, Math.round(ramp * RATE));
  for (let i = 0; i < n && i0 + i < out.length; i++) {
    const env = Math.min(1, i / r, (n - i) / r);
    out[i0 + i] += amp * env * Math.sin((TAU * freq * i) / RATE);
  }
}
// a click: one short decaying pulse
function click(out, t, amp = 0.6) {
  const i0 = Math.round(t * RATE);
  for (let i = 0; i < 40 && i0 + i < out.length; i++) out[i0 + i] += amp * Math.exp(-i / 6) * (i % 2 ? -1 : 1);
}
function normalize(out, peak = 0.8) {
  let m = 0;
  for (const v of out) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < out.length; i++) out[i] *= peak / m;
  return out;
}
// deterministic noise so every visitor hears the same hiss
function noiseAt(i) {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296 - 0.5;
}

// ------------------------------------------------------------------ 1. the duet

// The pulsar they sing with: J1909−3744, the steadiest clock in the timing arrays (ATNF, rounded).
export const DUET = { name: 'J1909−3744', p: 0.002947108 };
export const DUET_HZ = 1 / DUET.p; // 339.3 pulses a second: fast enough to hear as a pitch

// The planned slip: 0 until fraction a of the pass, exactly one period by b, smooth at both ends.
export function slip(s, a = 0.3, b = 0.7) {
  const u = Math.min(1, Math.max(0, (s - a) / (b - a)));
  return u - Math.sin(TAU * u) / TAU;
}

// Where the duet is heard. They aimed the lock at Earth's centre: there their pulses land on the pulsar's to
// within nanoseconds. Anywhere else the two trains sit at a fixed offset (the light-time difference between
// the two directions) and drift apart at a rate set by the station's speed relative to Earth, because the
// pulsar's rate is Doppler-shifted differently there. `drift` is in periods per 22-minute pass, the order
// of magnitude for each station's speed (Moon about 1 km/s, Mars and Ceres tens of km/s); `offset` is
// illustrative.
export const STATIONS = [
  { id: 'earth', name: { en: "Earth's centre", zh: '地心' }, offset: 0, drift: 0 },
  { id: 'farside', name: { en: 'Farside, Moon', zh: '月球背面' }, offset: 0.37, drift: 2.2 },
  { id: 'isidis', name: { en: 'Isidis, Mars', zh: '火星伊希地' }, offset: 0.71, drift: 56 },
  { id: 'ceres', name: { en: 'Ceres', zh: '谷神星' }, offset: 0.18, drift: -45 },
];

// Their pulse relative to the pulsar's, in periods, at fraction s (0..1) of the pass, heard at a station.
export const duetOffset = (s, station = STATIONS[0]) => station.offset + station.drift * s + slip(s);

// The duet as a phaseogram, the way pulsar astronomers plot timing: one row per step through the pass, one
// period across. The pulsar's pulse is always at phase 0; each row gives where theirs sits, 0..1.
export const phaseRows = (rows, station = STATIONS[0]) =>
  Array.from({ length: rows }, (_, r) => { const o = duetOffset((r + 0.5) / rows, station); return o - Math.floor(o); });

// A narrow pulse at phase `ph` (in periods), peak 1.
const pulse = (ph, width = 0.035) => { const x = ph - Math.round(ph); return Math.exp(-(x * x) / (2 * width * width)); };

// Sound: the pulsar alone for `intro` seconds, then their train joins it for one pass squeezed into `pass`
// seconds. In step the two fuse into one louder buzz; half a period apart they make a buzz an octave up; so
// the slip is heard as one slow "wah".
export function renderDuet({ station = STATIONS[0], intro = 2, pass = 14, f = DUET_HZ } = {}) {
  const out = buffer(intro + pass + 0.4);
  const events = [{ t: 0, end: intro, kind: 'pulsar' }];
  const n0 = Math.round(intro * RATE), n1 = Math.round((intro + pass) * RATE);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE, ph = f * t;
    let v = 0.5 * pulse(ph);
    if (i >= n0 && i < n1) {
      const s = (i - n0) / (n1 - n0);
      const env = Math.min(1, (i - n0) / (0.3 * RATE), (n1 - i) / (0.3 * RATE));
      v += 0.5 * env * pulse(ph + duetOffset(s, station));
    }
    out[i] = v;
  }
  const ts = (s) => intro + s * pass;
  events.push({ t: ts(0), end: ts(0.3), kind: 'lock' }, { t: ts(0.3), end: ts(0.7), kind: 'slip' }, { t: ts(0.7), end: ts(1), kind: 'lock' });
  return { samples: normalize(dc(out)), events, duration: intro + pass, intro, pass };
}

// A small deterministic random sequence, so every visitor hears the same chorus.
const rand = (k) => noiseAt(k * 7919 + 17) + 0.5;

// The chorus: many voices, each at its own offset and rate, pull into one and lock to the pulsar. `pull`
// rises from 0 to 1 over the first half of the pass.
export const CHORUS = Array.from({ length: 24 }, (_, k) => ({ offset: rand(2 * k), drift: (rand(2 * k + 1) - 0.5) * 6 }));
export function chorusOffsets(s) {
  const u = Math.min(1, s / 0.5), pull = u * u * (3 - 2 * u);
  return CHORUS.map((v) => (v.offset + v.drift * s) * (1 - pull));
}
export function renderChorus({ intro = 2, pass = 14, f = DUET_HZ } = {}) {
  const out = buffer(intro + pass + 0.4);
  const n0 = Math.round(intro * RATE), n1 = Math.round((intro + pass) * RATE);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE, ph = f * t;
    let v = 0.4 * pulse(ph);
    if (i >= n0 && i < n1) {
      const s = (i - n0) / (n1 - n0);
      const env = Math.min(1, (i - n0) / (0.6 * RATE), (n1 - i) / (0.3 * RATE));
      for (const o of chorusOffsets(s)) v += (0.6 / CHORUS.length) * env * pulse(ph + o, 0.05);
    }
    out[i] = v;
  }
  const ts = (s) => intro + s * pass;
  const events = [{ t: 0, end: intro, kind: 'pulsar' }, { t: ts(0), end: ts(0.5), kind: 'gather' }, { t: ts(0.5), end: ts(1), kind: 'lock' }];
  return { samples: normalize(dc(out)), events, duration: intro + pass, intro, pass };
}

// The missing note: two pulsars and a third tone at exactly the difference of their rates, the tone the two
// would make together in any resonator that is not perfectly linear. Alone it is a hum; with them it is a
// chord.
export const NOTE_PAIR = [DUET, { name: 'J0437−4715', p: 0.005757452 }];
export const NOTE_HZ = 1 / NOTE_PAIR[0].p - 1 / NOTE_PAIR[1].p; // 165.6 Hz
export function renderNote({ each = 2.5, both = 2.5, chord = 6 } = {}) {
  const dur = each + both + chord;
  const out = buffer(dur + 0.4);
  const [a, b] = NOTE_PAIR.map((ps) => 1 / ps.p);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    let v = 0.45 * pulse(a * t);
    if (t >= each && t < dur) v += 0.45 * pulse(b * t) * Math.min(1, (t - each) / 0.2);
    if (t >= each + both && t < dur) v += 0.25 * Math.sin(TAU * NOTE_HZ * t) * Math.min(1, (t - each - both) / 0.6, (dur - t) / 0.3);
    out[i] = v;
  }
  const events = [{ t: 0, end: each, kind: 'one' }, { t: each, end: each + both, kind: 'two' }, { t: each + both, end: dur, kind: 'chord' }];
  return { samples: normalize(dc(out)), events, duration: dur };
}

// remove the average, so pulse trains don't sit off centre
function dc(out) {
  let m = 0;
  for (const v of out) m += v;
  m /= out.length;
  for (let i = 0; i < out.length; i++) out[i] -= m;
  return out;
}

// ------------------------------------------------------------------ 2. the shadow

export const R_SUN_KM = 695700;
export const R_EARTH_KM = 6371;
export const AU_KM = 149597870.7;
// Ross 128 (Mann et al. 2015 radius) and its planet; the planet's radius is unmeasured, 1.1 Earth radii is
// what a rocky world of its minimum mass would have (story choice).
export const ROSS = { radiusSun: 0.197, planet: { periodDays: 9.8658, aAu: 0.0496, radiusEarth: 1.1 } };

// Quadratic limb darkening (visible light): the edge of a star is dimmer than its middle, so a transit dip
// is rounded, not square.
const LD = { sun: [0.44, 0.23], ross: [0.35, 0.33] };
const intensity = ([u1, u2], r) => { const mu = Math.sqrt(Math.max(0, 1 - r * r)); return 1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2; };
const meanIntensity = ([u1, u2]) => 1 - u1 / 3 - u2 / 6;

// One transit: impact parameter b (0 = through the middle, 1 = grazing), radius ratio k, central duration.
// Returns depth(x) for x in [-1, 1] across the chord, and the real duration in hours.
export function transit({ b, k, fullHours, ld }) {
  const chord = Math.sqrt(Math.max(0, 1 - b * b));
  return {
    b, k, hours: fullHours * chord, visible: b < 1,
    depth: (x) => { const r = Math.hypot(b, x * chord); return r >= 1 ? 0 : (k * k * intensity(ld, r)) / meanIntensity(ld); },
  };
}

// How Earth's transit looked from Ross 128 in a given year: b comes from where Ross 128 actually was.
export function earthTransit(year) {
  const s = at(year);
  const aOverR = AU_KM / R_SUN_KM;
  const b = Math.abs(Math.sin(s.lat * DEG)) * aOverR;
  const fullHours = (365.25 * 24) / Math.PI / aOverR;
  return { year, lat: s.lat, ...transit({ b, k: R_EARTH_KM / R_SUN_KM, fullHours, ld: LD.sun }) };
}

export function rossTransit() {
  const p = ROSS.planet;
  const aOverR = (p.aAu * AU_KM) / (ROSS.radiusSun * R_SUN_KM);
  return transit({ b: 0.3, k: (p.radiusEarth * R_EARTH_KM) / (ROSS.radiusSun * R_SUN_KM), fullHours: (p.periodDays * 24) / Math.PI / aOverR, ld: LD.ross });
}

// The sequence they send: one Earth transit per century of the years they watched, two silent years after,
// then their own world's transit three times.
export function shadowSequence({ from = -1100, to = 1300, step = 100 } = {}) {
  const earth = [];
  for (let y = from; y <= to; y += step) earth.push(earthTransit(y));
  return { earth, ross: rossTransit(), zone: TRANSIT_ZONE };
}

// Sound: a steady carrier that dims during each transit. 13 hours of transit become 0.9 s; dips are made
// audible by scaling depth so Earth's deepest dip takes 60% off the volume (theirs, 31 times deeper, is capped).
export function renderShadow(seq = shadowSequence(), { carrier = 330, hourS = 0.9 / 13, gap = 0.45, gain = 0.6 / 84e-6 } = {}) {
  const slots = [...seq.earth.map((tr) => ({ tr, who: 'earth' })), ...[0, 1, 2].map(() => ({ tr: seq.ross, who: 'ross' }))];
  const slotLen = (tr) => Math.max(tr.hours, 1) * hourS;
  const total = slots.reduce((s, x) => s + gap + slotLen(x.tr), 0) + gap;
  const out = buffer(total + 0.3);
  const env = new Float32Array(out.length).fill(1);
  const events = [];
  let t = gap;
  for (const { tr, who } of slots) {
    const len = slotLen(tr), i0 = Math.round(t * RATE), n = Math.round(len * RATE);
    if (tr.visible) for (let i = 0; i < n; i++) env[i0 + i] = 1 - Math.min(0.9, tr.depth((i / n) * 2 - 1) * gain);
    events.push({ t, end: t + len, kind: who, year: tr.year, hours: tr.hours, visible: tr.visible, b: tr.b });
    t += len + gap;
  }
  for (let i = 0; i < out.length; i++) out[i] = env[i] * (0.5 * Math.sin((TAU * carrier * i) / RATE) + 0.05 * noiseAt(i));
  return { samples: normalize(out), events, duration: t, env };
}

// ------------------------------------------------------------------ 3. the pulsars

// Periods from the ATNF Pulsar Catalogue (rounded); positions J2000 (degrees). Same twelve as the ledger.
export const PULSARS = [
  { name: 'J0437−4715', p: 0.005757452, ra: 69.316, dec: -47.253 },
  { name: 'J1909−3744', p: 0.002947108, ra: 287.448, dec: -37.737 },
  { name: 'J1713+0747', p: 0.004570137, ra: 258.457, dec: 7.794 },
  { name: 'J0030+0451', p: 0.004865453, ra: 7.614, dec: 4.861 },
  { name: 'J1744−1134', p: 0.004074546, ra: 266.119, dec: -11.581 },
  { name: 'J1012+5307', p: 0.005255749, ra: 153.139, dec: 53.117 },
  { name: 'J2145−0750', p: 0.016052424, ra: 326.460, dec: -7.838 },
  { name: 'J1022+1001', p: 0.016452930, ra: 155.742, dec: 10.031 },
  { name: 'B1937+21', p: 0.001557806, ra: 294.911, dec: 21.583 },
  { name: 'B0531+21', p: 0.033392, ra: 83.633, dec: 22.015 },
  { name: 'B0329+54', p: 0.714520, ra: 53.247, dec: 54.579 },
  { name: 'B1919+21', p: 1.337302, ra: 290.437, dec: 21.884 },
];
const YEAR_S = 365.25 * 86400;
const unit = (ra, dec) => [Math.cos(dec * DEG) * Math.cos(ra * DEG), Math.cos(dec * DEG) * Math.sin(ra * DEG), Math.sin(dec * DEG)];

// A pulse from a far pulsar reaches Ross 128 earlier than the Sun by (r · n) / c, where r is Ross 128's
// position and n the pulsar's direction. So the phase they hear differs from ours by that delay modulo the
// period. Twelve shifts, three unknowns: the shifts pin down where they are (pulsar navigation).
export function pulsarShifts(year) {
  const s = at(year);
  const r = [Math.cos(s.dec * DEG) * Math.cos(s.ra * DEG), Math.cos(s.dec * DEG) * Math.sin(s.ra * DEG), Math.sin(s.dec * DEG)].map((c) => c * s.dist);
  return PULSARS.map((ps) => {
    const n = unit(ps.ra, ps.dec);
    const leadS = (r[0] * n[0] + r[1] * n[1] + r[2] * n[2]) * YEAR_S; // seconds by which their pulse is early
    const shift = (((leadS / ps.p) % 1) + 1) % 1;
    return { ...ps, leadS, shift, freq: 1 / ps.p };
  });
}

// Sound: each pulse train at its true rate, 1.1 s each. Millisecond pulsars are fast enough to be a pitch
// (B1937+21 spins 642 times a second); slow ones are ticks. Then all twelve together.
export function renderPulsars(list = pulsarShifts(2219), { each = 1.1, gap = 0.25, together = 3 } = {}) {
  const out = buffer(list.length * (each + gap) + together + 0.6);
  const events = [];
  const train = (ps, t0, dur, amp) => {
    // start where their phase says: the first pulse is `shift` of a period in
    for (let t = t0 + ps.shift * ps.p; t < t0 + dur; t += ps.p) click(out, t, amp);
    if (ps.p > 0.5) click(out, t0, amp); // a slow pulsar always gets one tick at the start so it is heard
  };
  let t = 0.2;
  list.forEach((ps, i) => { train(ps, t, each, ps.p < 0.01 ? 0.25 : 0.6); events.push({ t, end: t + each, kind: 'pulsar', i }); t += each + gap; });
  list.forEach((ps) => train(ps, t, together, 0.12));
  events.push({ t, end: t + together, kind: 'all' });
  return { samples: normalize(out), events, duration: t + together };
}

// ------------------------------------------------------------------ 4. the chords

// Real radio lines (MHz), from the CDMS / JPL catalogues and the classic masers. All of them arrive shifted
// up by the same Doppler factor as the 1420 MHz tone, which is how you know they come from one place.
export const LINES = {
  H: { mhz: 1420.406, name: { en: 'hydrogen', zh: '氢' } },
  OH1: { mhz: 1612.231, name: { en: 'hydroxyl', zh: '羟基' } },
  OH2: { mhz: 1665.402, name: { en: 'hydroxyl', zh: '羟基' } },
  OH3: { mhz: 1667.359, name: { en: 'hydroxyl', zh: '羟基' } },
  OH4: { mhz: 1720.530, name: { en: 'hydroxyl', zh: '羟基' } },
  CH: { mhz: 3335.481, name: { en: 'methylidyne', zh: '次甲基' } },
  H2CO: { mhz: 4829.660, name: { en: 'formaldehyde', zh: '甲醛' } },
  CH3OH: { mhz: 6668.519, name: { en: 'methanol', zh: '甲醇' } },
  H2O: { mhz: 22235.080, name: { en: 'water', zh: '水' } },
  NH3: { mhz: 23694.496, name: { en: 'ammonia', zh: '氨' } },
  O2: { mhz: 118750.343, name: { en: 'oxygen', zh: '氧' } },
  O3: { mhz: 110836.040, name: { en: 'ozone', zh: '臭氧' } },
  CO: { mhz: 115271.202, name: { en: 'carbon monoxide', zh: '一氧化碳' } },
  // three lines that match nothing in any catalogue
  X1: { mhz: 9183.4, unknown: true, name: { en: 'unknown', zh: '未知' } },
  X2: { mhz: 12907.7, unknown: true, name: { en: 'unknown', zh: '未知' } },
  X3: { mhz: 31046.2, unknown: true, name: { en: 'unknown', zh: '未知' } },
};

// What they say, chord by chord: [lines with loudness 0..1]. Proposed content.
export const CHORDS = [
  { id: 'unit', lines: { H: 1 }, says: { en: 'Hydrogen. The unit everything else is measured against.', zh: '氢。其他一切都以它为单位。' } },
  { id: 'water', lines: { H2O: 1, OH2: 0.6, OH3: 0.6 }, says: { en: 'Water, and the hydroxyl it breaks into.', zh: '水，以及它分解出的羟基。' } },
  { id: 'ocean', lines: { H2O: 1, H: 0.3 }, says: { en: 'Much water. Louder means more.', zh: '很多水。越响，越多。' } },
  { id: 'air', lines: { O2: 0.9, O3: 0.35, H2O: 0.5, CO: 0.15 }, says: { en: 'Their air: oxygen, a little ozone, water vapour, a trace of carbon monoxide. Oxygen this abundant is usually kept up by life.', zh: '他们的空气：氧，一点臭氧，水汽，微量一氧化碳。这么多氧，通常要靠生命维持。' } },
  { id: 'unknown', lines: { X1: 0.8, X2: 0.6, X3: 0.5, CH3OH: 0.4 }, says: { en: 'Methanol, and a molecule nobody has catalogued.', zh: '甲醇，和一种没人收录过的分子。' } },
];

// Radio to hearing: every factor of 4 in radio frequency is one octave, and 1420 MHz sits on G3.
export const toAudio = (mhz) => 196 * Math.sqrt(mhz / 1420.406);

export function renderChords(chords = CHORDS, { each = 1.8, gap = 0.4 } = {}) {
  const out = buffer(chords.length * (each + gap) + 0.4);
  const events = [];
  let t = 0.2;
  chords.forEach((c, i) => {
    for (const [key, loud] of Object.entries(c.lines)) {
      const f = toAudio(LINES[key].mhz);
      tone(out, t, each, f, 0.25 * loud, 0.06);
      tone(out, t, each, f * 2, 0.04 * loud, 0.06); // a faint overtone so low lines carry on small speakers
    }
    events.push({ t, end: t + each, kind: 'chord', i });
    t += each + gap;
  });
  return { samples: normalize(out), events, duration: t };
}

// ------------------------------------------------------------------ 5. the number

// 1/α, the fine-structure constant (CODATA 2018). It is a pure number: the same in every system of units and
// on every world, so it is the one number two strangers can both check. They send it with no digits, as two
// click trains whose periods are in the ratio 137.035999…:1. You hear 137 fast clicks to each slow one, and
// the slow click slips 0.036 of a fast beat later every time, lining up again after about 28 rounds. The
// slip is the decimals.
export const ALPHA_INV = 137.035999084;

// Where each slow click lands among the fast ones, round by round.
export function alphaRounds(rounds = 29, ratio = ALPHA_INV) {
  return Array.from({ length: rounds }, (_, k) => {
    const pos = k * ratio; // in fast beats
    return { k, beat: Math.floor(pos), slip: pos - Math.floor(pos) };
  });
}

// Sound: fast clicks at `fast` per second (a buzz), the slow click as a bright tone pip.
export function renderAlpha({ fast = 180, rounds = 6, ratio = ALPHA_INV } = {}) {
  const slowP = ratio / fast;
  const out = buffer(rounds * slowP + 0.6);
  const events = [];
  const t0 = 0.2;
  for (let t = t0; t < t0 + rounds * slowP; t += 1 / fast) click(out, t, 0.18);
  for (let k = 0; k <= rounds; k++) { const t = t0 + k * slowP; tone(out, t, 0.07, 1320, 0.5, 0.004); events.push({ t, end: t + slowP, kind: 'round', k }); }
  return { samples: normalize(out), events, duration: t0 + rounds * slowP };
}
