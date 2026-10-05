# InterImm kit, phase 2 · Deep Field

The shared look of every phase 2 InterImm site: colours, fonts, header, footer, components and a few
instruments (a live waterfall spectrogram, the story clock). InterImm/interstellar owns it and
publishes it at interstellar.interimm.org; other phase 2 sites link it instead of copying it.

Phase 1 keeps its own kit at `https://interimm.org/kit/` (source: InterImm/interimm.github.io, branch `hugo`).
The two kits share markup hooks, class names and token names, so a site switches era by changing two URLs.

| Published at | What | Source |
| --- | --- | --- |
| `https://interstellar.interimm.org/kit/interimm.css` | Stylesheet, including the fonts | `kit/interimm.css` |
| `https://interstellar.interimm.org/kit/interimm.js` | Header and footer, menu behaviour, instruments | `kit/interimm.js` |
| `https://interstellar.interimm.org/kit/nav.cn.json`, `nav.en.json` | Phase 2 menu and footer | `kit/nav.*.json` (hand-edited) |
| `https://interstellar.interimm.org/kit/fonts/` | Unbounded, Instrument Sans, JetBrains Mono (SIL OFL, Latin) | `kit/fonts/` |
| `https://interstellar.interimm.org/kit/` | Live style guide | `kit/index.html` |

## Using it on another site

```html
<html lang="en" class="js">
<head>
  <link rel="stylesheet" href="https://interstellar.interimm.org/kit/interimm.css">
  <script src="https://interstellar.interimm.org/kit/interimm.js" defer></script>
</head>
<body>
  <header class="site-header" data-interimm-header data-lang="en" data-current="signal">
    <div class="wrap header-inner"><a class="brand" href="https://interstellar.interimm.org/en/">The Contact Era</a></div>
  </header>
  <main id="main">...</main>
  <footer class="site-footer" data-interimm-footer></footer>
</body>
</html>
```

`data-lang`, `data-current`, `data-lang-cn` / `data-lang-en` work exactly as in the phase 1 kit.

### Switching era

| | Phase 1 | Phase 2 |
| --- | --- | --- |
| Stylesheet | `https://interimm.org/kit/interimm.css` | `https://interstellar.interimm.org/kit/interimm.css` |
| Script | `https://interimm.org/kit/interimm.js` | `https://interstellar.interimm.org/kit/interimm.js` |

Everything in the phase 1 kit's list of building blocks exists here with the same name (`.wrap`, `.space`,
`.kicker`, `.section`, `.section-alt`, `.section-title`, `.section-lede`, `.page-hero`, `.lede`, `.btn` and its
variants, `.chips`, `.card`, `.card-grid`, `.tile`, `.bento`, `.card-link-wrap`, `.card-link`, `.text-link`,
`.prose`) and the same tokens (`--bg`, `--bg-alt`, `--surface`, `--surface-2`, `--text`, `--muted`, `--border`,
`--border-strong`, `--accent`, `--accent-hover`, `--accent-text`, `--accent-soft`, `--link`, `--focus`, `--radius`,
`--font`, `--font-display`, `--font-mono`).

Phase 2 adds: `--beam` / `--beam-soft` (second accent), `--signal`, `--noise`, `--scope` (chart colours),
`.eyebrow`, `.readout`, `.readouts`, `.brand-dot`, `.brand-sub`, `.panel`, `.scope`, `.log`, `.data-table`,
`.field`, `.inline-field`, `.note`.

One difference to know: `.btn-primary` is ink on the ground (white on night, indigo on light) and turns red
on hover. Red is kept for the signal itself.

### Instruments

```html
<figure class="scope">
  <canvas data-waterfall data-line="0.62"></canvas>       <!-- data-line="" for noise only -->
  <figcaption><span>waterfall</span><time class="readout" data-story-clock></time></figcaption>
</figure>
<time data-story-clock data-format="datetime"></time>     <!-- time (default), date, datetime -->
<span data-days-since="2219-09-18T03:12:07Z"></span>
```

The waterfall reads its colours from CSS, follows light/dark, pauses when off screen and stays still for
visitors who prefer reduced motion. The same functions are on `window.InterImm`.

## Changing it

Keep changes additive: other phase 2 sites depend on these names. Menu and footer changes go in
`nav.cn.json` and `nav.en.json`. GitHub Pages caches for about 10 minutes.
