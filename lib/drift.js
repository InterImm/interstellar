// Where Ross 128 is relative to the Sun, at any year. One ES module, no dependencies, every function pure.
//
// Model: both stars move in straight lines at constant velocity (no galactic potential, no mutual pull).
// Inputs are the measured position, proper motion, parallax and radial velocity of Ross 128, so the model
// is anchored on real data at J2000 and gets less exact the further it runs from today. Over ±100,000 years
// the straight line is good to a few tenths of a light year; it is not meant for millions of years.
//
// Frame: heliocentric, J2000 ecliptic. x points to the March equinox, z to the north ecliptic pole.
// Units: light years (ly), Julian years (yr), km/s. Time is a decimal year (astronomical numbering:
// year 0 = 1 BCE, -1140 = 1141 BCE).

export const LY_KM = 9460730472580.8;
export const YEAR_S = 365.25 * 86400;
export const PC_LY = 3.261563777;
const DEG = Math.PI / 180;
const MAS = DEG / 3600 / 1000;
const KM_S_TO_LY_YR = YEAR_S / LY_KM; // 1 km/s in ly per year
const OBLIQUITY = 23.4392911 * DEG; // J2000

// Ross 128 (FI Virginis). Position J2000 and motion from Gaia DR3 (Gaia Collaboration, Vallenari et al. 2023);
// radial velocity from the Pulkovo compilation (Gontcharov 2006). Absolute magnitudes in V.
export const ROSS_128 = {
  ra: (11 + 47 / 60 + 44.39727 / 3600) * 15, // degrees
  dec: 48 / 60 + 16.4003 / 3600,
  parallax: 296.3053, // mas
  pmra: 607.299, // mas/yr, includes cos(dec)
  pmdec: -1223.028,
  rv: -31.0, // km/s, negative = approaching
  absMag: 13.53,
};
export const SUN_ABS_MAG = 4.83;
export const EPOCH = 2000.0;

// Earth crosses the Sun's disc, seen from far away, only if the viewer sits within R_sun / 1 au of the
// plane of Earth's orbit: 0.266 degrees either side. This is the Earth transit zone (Heller & Pudritz 2016;
// Kaltenegger & Faherty 2021).
export const TRANSIT_ZONE = Math.asin(695700 / 149597870.7) / DEG;

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => Math.sqrt(dot(a, a));

// equatorial (x to equinox, z to celestial pole) -> ecliptic
const toEcliptic = ([x, y, z]) => [x, Math.cos(OBLIQUITY) * y + Math.sin(OBLIQUITY) * z, -Math.sin(OBLIQUITY) * y + Math.cos(OBLIQUITY) * z];
const fromEcliptic = ([x, y, z]) => [x, Math.cos(OBLIQUITY) * y - Math.sin(OBLIQUITY) * z, Math.sin(OBLIQUITY) * y + Math.cos(OBLIQUITY) * z];

// Position (ly) and velocity (ly/yr) of a star at EPOCH, in the ecliptic frame, from its astrometry.
export function initialState(star = ROSS_128) {
  const a = star.ra * DEG, d = star.dec * DEG;
  const dist = (1000 / star.parallax) * PC_LY;
  const r = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const e = [-Math.sin(a), Math.cos(a), 0]; // toward increasing RA
  const n = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)]; // toward north
  // proper motion (rad/yr) times distance gives transverse speed in ly/yr
  const vEq = add(add(e.map((c) => c * star.pmra * MAS * dist), n, star.pmdec * MAS * dist), r, star.rv * KM_S_TO_LY_YR);
  return { pos: toEcliptic(r.map((c) => c * dist)), vel: toEcliptic(vEq) };
}

const S0 = initialState();

// Everything about the pair at decimal year `year`.
export function at(year, s0 = S0) {
  const pos = add(s0.pos, s0.vel, year - EPOCH);
  const dist = norm(pos);
  const radial = dot(pos, s0.vel) / dist; // ly/yr, + = moving apart
  const speed = norm(s0.vel);
  const lat = Math.asin(pos[2] / dist) / DEG;
  const lon = ((Math.atan2(pos[1], pos[0]) / DEG) + 360) % 360;
  const eq = fromEcliptic(pos);
  const ra = ((Math.atan2(eq[1], eq[0]) / DEG) + 360) % 360;
  const dec = Math.asin(eq[2] / dist) / DEG;
  const pc = dist / PC_LY;
  return {
    year,
    pos, // ly, ecliptic frame, Ross 128 relative to the Sun
    dist, // ly; also the one-way light delay in years
    radialKms: radial / KM_S_TO_LY_YR,
    transverseKms: Math.sqrt(Math.max(0, speed * speed - radial * radial)) / KM_S_TO_LY_YR,
    lat, // ecliptic latitude of Ross 128 seen from the Sun (deg); minus this is the Sun's seen from there
    lon,
    ra, dec, // where we see Ross 128 (deg, J2000 equator)
    seesEarthTransit: Math.abs(lat) < TRANSIT_ZONE,
    sunMag: SUN_ABS_MAG + 5 * Math.log10(pc / 10), // our Sun in their sky
    starMag: ROSS_128.absMag + 5 * Math.log10(pc / 10), // their star in ours
  };
}

// Year of closest approach and the distance then (straight lines meet at the foot of the perpendicular).
export function closestApproach(s0 = S0) {
  const t = -dot(s0.pos, s0.vel) / dot(s0.vel, s0.vel);
  return at(EPOCH + t, s0);
}

// Years in [from, to] when Ross 128 enters or leaves the Earth transit zone, found by bisection.
export function transitZoneCrossings(from = -20000, to = 20000, s0 = S0) {
  const f = (y) => Math.abs(at(y, s0).lat) - TRANSIT_ZONE;
  const out = [];
  const step = 10;
  for (let y = from; y < to; y += step) {
    const a = f(y), b = f(y + step);
    if (Math.sign(a) === Math.sign(b)) continue;
    let lo = y, hi = y + step;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; Math.sign(f(m)) === Math.sign(a) ? (lo = m) : (hi = m); }
    out.push({ year: (lo + hi) / 2, enters: a > 0 });
  }
  return out;
}

// The year the distance next equals `ly` after (or before, with dir = -1) year `from`.
export function yearAtDistance(ly, from = EPOCH, dir = 1, s0 = S0) {
  // |p + v t|^2 = ly^2  ->  (v.v) t^2 + 2 (p.v) t + (p.p - ly^2) = 0
  const A = dot(s0.vel, s0.vel), B = 2 * dot(s0.pos, s0.vel), C = dot(s0.pos, s0.pos) - ly * ly;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const roots = [(-B - Math.sqrt(disc)) / (2 * A), (-B + Math.sqrt(disc)) / (2 * A)].map((t) => EPOCH + t);
  const ok = roots.filter((y) => (dir > 0 ? y > from : y < from)).sort((a, b) => dir * (a - b));
  return ok.length ? ok[0] : null;
}
