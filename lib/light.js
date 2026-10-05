// Light-speed messages and the InterImm story clock. One ES module, no dependencies.
// Units: light years (ly) and Julian years (yr), so c = 1 ly/yr. Every function is pure and takes
// milliseconds since 1970 or a Date where it needs an instant.
//
// The message functions are the same as lib/lightyear.js in InterImm/mars-clock (Light Years page);
// the voyage functions are left out because nothing in the phase 2 story travels between stars.

export const YEAR_MS = 365.25 * 86400e3; // Julian year
export const LY_KM = 9460730472580.8; // kilometres in a light year (IAU)

// The InterImm story runs 70,491 days (about 193 years) ahead of the real calendar:
// 2026-10-03 on Earth is 2219-10-03 in the story.
export const STORY_OFFSET_DAYS = 70491;
const OFFSET_MS = STORY_OFFSET_DAYS * 86400e3;
const ms = (d) => (d instanceof Date ? d.getTime() : Number(d));

export const storyFromReal = (date) => new Date(ms(date) + OFFSET_MS);
export const realFromStory = (date) => new Date(ms(date) - OFFSET_MS);
export const storyNow = () => storyFromReal(Date.now());

// The source: Ross 128 b, a temperate planet of at least 1.4 Earth masses (Bonfils et al. 2018) around an old,
// quiet red dwarf in Virgo. Distance from the Gaia parallax, rounded; position J2000.
export const ROSS_128 = {
  id: 'ross-128',
  name: { en: 'Ross 128', zh: '罗斯128' },
  planet: { en: 'Ross 128 b', zh: '罗斯128 b' },
  distance: 11.01,
  type: 'M4V',
  ra: '11h 47m 44.4s',
  dec: '+00° 48′ 16″',
};

// A message sent at `sent` reaches a star `distance` ly away one light-travel time later; an answer written
// `replyAfter` years after it arrives gets back one light-travel time after that.
export function message(sent, distance, { replyAfter = 0 } = {}) {
  const t0 = ms(sent);
  const arrives = t0 + distance * YEAR_MS;
  const reply = arrives + replyAfter * YEAR_MS + distance * YEAR_MS;
  return { sent: new Date(t0), arrives: new Date(arrives), earliestReply: new Date(reply), oneWayYears: distance, roundTripYears: 2 * distance + replyAfter };
}

// How far a message sent at `sent` has travelled by `now`, in ly and as a fraction of the way (0..1).
export function messageProgress(sent, distance, now = Date.now()) {
  const travelled = Math.max(0, (ms(now) - ms(sent)) / YEAR_MS);
  return { travelled: Math.min(travelled, distance), fraction: Math.min(1, travelled / distance), arrived: travelled >= distance };
}

// Light received from a star at `received` left it one light-travel time earlier.
export const emitted = (received, distance) => new Date(ms(received) - distance * YEAR_MS);
