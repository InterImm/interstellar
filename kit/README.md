# InterImm kit, phase 2 · 667

Phase 2 is a conversation across light years, and it looks nothing like phase 1. Phase 1 is paper, ink, serif
headings and Mars rust. Phase 2 is built from the first thing they sent: a picture of 667 bits, 23 by 29. Everything
is pixels on deep blue, with signal blue for heroes. Page titles and big numbers are set in a pixel face (everything you read is Instrument Sans), corners are square or stepped, shadows are hard, motion
steps instead of easing, and their picture is drawn behind every hero. Two voices: white-cyan (`--them`) for what
reaches us and Sol yellow (`--us`) for what we send. No light theme, no paper, no red, no curves.

The design language of every phase 2 InterImm site, and the code that carries it: principles, colours, type,
scales, header, footer, page layouts, components, chart colours and a few instruments (a live waterfall
spectrogram, the story clock). The spec is the live page at https://interstellar.interimm.org/kit/
(`kit/index.html`); this file is how to use it. InterImm/interstellar owns it and
publishes it at interstellar.interimm.org; other phase 2 sites link it instead of copying it.

Phase 1 keeps its own kit at `https://interimm.org/kit/` (source: InterImm/interimm.github.io, branch `hugo`).
The two kits share markup hooks, class names and token names, so a site switches era by changing two URLs.

| Published at | What | Source |
| --- | --- | --- |
| `https://interstellar.interimm.org/kit/interimm.css` | Stylesheet, including the fonts | `kit/interimm.css` |
| `https://interstellar.interimm.org/kit/interimm.js` | Header and footer, menu behaviour, instruments | `kit/interimm.js` |
| `https://interstellar.interimm.org/kit/nav.cn.json`, `nav.en.json` | Phase 2 menu and footer | `kit/nav.*.json` (hand-edited) |
| `https://interstellar.interimm.org/kit/fonts/` | Pixelify Sans, Instrument Sans, JetBrains Mono (SIL OFL, Latin) | `kit/fonts/` |
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

`data-lang`, `data-current`, `data-lang-cn` / `data-lang-en` work exactly as in the phase 1 kit. Phase 2 adds, on
the header:

| Attribute | Effect |
| --- | --- |
| `data-site="Exoplanet Explorer"` `data-site-url="./"` | Shows the site's own name after the era's brand: ● The Contact Era / Exoplanet Explorer |
| `data-width="full"` | Header (or footer) spans the window, for tools |
| `data-lang-cn=""` (empty) | Leaves that language out of the switch, for a site with no such version |

Every phase 2 site needs an entry in `nav.cn.json` and `nav.en.json` with the `id` it passes as `data-current`.

### Page anatomy

- **Story page** (entrance, archive): `.hero.space` (kicker, `h1`, `.lede`, `.hero-actions`, optional
  `.hero-grid` with a `.scope`), then `.section` / `.section-alt` blocks with `.section-head`. `.hero-xl` is for
  the entrance only.
- **Tool** (explorer, ledger): header with `data-width="full"`, then `main.app-shell` with `.app-side`,
  `.app-main` and an optional `.app-detail` column that appears when it is not `hidden`.

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
`--font`, `--font-heading`, `--font-display`, `--font-mono`). Use `--font-display` (pixels) only for page titles and display numbers.

Phase 2 adds:

- Tokens: the voices `--them` / `--them-soft` (also `--accent`, `--signal`) and `--us` / `--us-soft` (also
  `--beam`), `--noise`, `--scope`, `--rule` (the dashed divider); chart colours `--c1`…`--c4` (categorical, never
  either voice), `--seq-1`…`--seq-7`, `--div-cool-*` / `--div-mid` / `--div-hot-*`, `--plot-grid`,
  `--plot-axis`, `--plot-context`, `--plot-dim`; scales `--space-1`…`--space-8`, `--step--2`…`--step-5`,
  `--radius-sm`, `--radius-pill`, `--dur`.
- Layout: `.hero`, `.hero-xl`, `.hero-grid`, `.hero-actions`, `.split` (ratio via `--split`), `.cluster`,
  `.wrap-full`, `.app-shell`, `.app-side`, `.app-main`, `.app-detail`.
- Parts: `.eyebrow`, `.readout`, `.readouts`, `.brand-dot`, `.brand-sub`, `.brand-site`, `.panel`, `.scope`, `.log`,
  `.data-table`, `.field`, `.field-pair`, `.field-checks`, `.inline-field`, `.note`, `.muted`, `.btn-sm`, `.badge`
  (`-signal`, `-us`), `.btn-send`, `.kicker-out`, `.log .is-out`, `.tabs`, `.legend` with `.sw` swatches (`.sw-c1`…, `.sw-band`, `.sw-ring`, `.sw-signal`,
  `.sw-dim`), `.tooltip`.

- Conversation (the signature): `.exchange` with `.msg.msg-in` / `.msg.msg-out` (and `.msg-waiting`), `.msg-meta`;
  `.transit` / `.transit-out` with `--progress` and an optional `.transit-packet`.

Pick the voice by direction: `.btn-primary` and `.kicker` are white-cyan (receiving, exploring); `.btn-send`,
`.kicker-out` and `.is-out` are yellow (sending, replying).

### Instruments

```html
<figure class="scope">
  <canvas data-waterfall data-line="0.62"></canvas>       <!-- data-line="" for noise only -->
  <figcaption><span>waterfall</span><time class="readout" data-story-clock></time></figcaption>
</figure>
<time data-story-clock data-format="datetime"></time>     <!-- time (default), date, datetime -->
<span data-days-since="2219-09-18T03:12:07Z"></span>
<section class="space">…</section>                        <!-- their picture is drawn behind it; data-message="off" to skip -->
<span class="tile-icon" data-glyph="dish"></span>          <!-- count, system, dish, hydrogen -->
```

The waterfall reads its colours from CSS, pauses when off screen and stays still for
visitors who prefer reduced motion. The picture arrives row by row, or all at once for those visitors. The same functions are on `window.InterImm`.

## Changing it

Keep changes additive: other phase 2 sites depend on these names. Menu and footer changes go in
`nav.cn.json` and `nav.en.json`. GitHub Pages caches for about 10 minutes.
