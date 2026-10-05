// Entrance page: the dates that depend on today.
import { ROSS_128 as STAR, message, emitted, storyNow } from '../lib/light.js';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const DETECTED = Date.parse('2219-09-18T03:12:07.218Z'); // same as app/signal.js

const set = (id, v) => document.querySelectorAll(`[data-fill="${id}"]`).forEach((el) => { el.textContent = v; });
const update = () => {
  const m = message(storyNow(), STAR.distance);
  set('left', ymd(emitted(DETECTED, STAR.distance)));
  set('left-year', String(emitted(DETECTED, STAR.distance).getUTCFullYear()));
  set('arrives', ymd(m.arrives));
  set('answer', ymd(m.earliestReply));
  set('arrives-year', String(m.arrives.getUTCFullYear()));
  set('answer-year', String(m.earliestReply.getUTCFullYear()));
};
update();
setInterval(update, 60e3);
