# 星际移民之书 · 恒星篇 · 通联纪 / The Book of InterImm · Interstellar · The Contact Era

The entrance to InterImm phase 2, at https://interstellar.interimm.org/. In 2219 the solar system hears another
civilisation for the first time; no ship can cross the distance, so this is the era of learning to write to the stars.

Static files, no build step, no server, zero running cost. Published with GitHub Pages from the root of `main`
(`CNAME` sets the domain, `.nojekyll` serves files as they are).

| Path | What |
| --- | --- |
| `index.html`, `en/index.html` | The entrance: the era at a glance, Chinese and English |
| `archive/2219-signal/` | The full record of the 2219 signal from Ross 128 b: the log, arrival times, the beacon decoder, letters |
| `pulsars/` | The pulsar ledger, live: the pulsars that keep the MC clock, the ledger nodes and the timing residuals where the beacon repeats. Self-contained (its own page, `app/pulsars.js` and `app/pulsars.css`) so it can move to its own repo later |
| `kit/` | The phase 2 design kit, 137, published at https://interstellar.interimm.org/kit/ ([kit/README.md](kit/README.md)) |
| `app/` | Page scripts and styles |
| `lib/light.js` | Light-speed messages and the story clock (from mars-clock's `lib/lightyear.js`, without voyages) |

Run it locally with any static server, for example `python3 -m http.server`, and open http://localhost:8000/.

The previous Hugo site (2022, "飞向恒星 / we must leave the solar system") is in the git history. The draft about
the first Earth–Mars conflict lives on the branch `cms/interstellar/草稿`.

## Story canon used here

- Story time = real time + 70,491 days. The present is 2219.
- No interstellar ships on either side; contact is communication only.
- The source is Ross 128 b, a real temperate planet (at least 1.4 Earth masses, 9.87-day orbit, tidally locked) around
  the old, quiet red dwarf Ross 128 in Virgo, 11.01 light years away. The transmitter rides on the planet, so the tone
  drifts with its orbit.
- The signal: first detected 2219-09-18 03:12:07 UTC by the MC ledger's pulsar-timing node on the lunar far side, then
  Earth, Isidis (Mars) and Ceres; made public 2219-10-05. 1420.405 MHz, prime-spaced preamble, a 667-bit picture
  (23 × 29), repeats. These details are proposals and easy to change (`DETECTED` in `app/signal.js` and
  `app/home.js`, the logs in the HTML).
- The arrival-time table is illustrative: a plane wave from Ross 128 with made-up 2219 planet positions.
- The beacon repeats every 9 h 41 m 13 s as received, each pass 22 minutes (`app/pulsars.js`).
- Later in the era, more voices. The entrance only hints at it.

## Fonts

Pixelify Sans, Instrument Sans and JetBrains Mono, SIL Open Font License 1.1; licences in `kit/fonts/`.
