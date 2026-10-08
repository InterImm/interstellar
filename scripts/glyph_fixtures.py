"""Write tests/glyph-cli-fixtures.json: what glyph-cli itself says about the examples and the vocabulary.

tests/glyph.test.mjs compares lib/glyph.js against this file, so the site and the `glyph` command agree.
Re-run it after updating glyph-cli or lib/glyph-vocab.json:

    pip install glyph-cli==0.3.0
    python3 scripts/glyph_fixtures.py
"""

import json
from pathlib import Path

import glyph_cli
from glyph_cli import GlyphError, Vocabulary
from glyph_cli.drawing import decode, draw_words, render, render_svg
from glyph_cli.graph import format_graph, read_graph
from glyph_cli.page import format_page, parse_page

ROOT = Path(__file__).resolve().parent.parent
vocab = Vocabulary.from_json(json.loads((ROOT / "lib/glyph-vocab.json").read_text(encoding="utf-8")))

examples = {}
for path in sorted((ROOT / "tests/glyph-examples").glob("*.txt")):
    source = path.read_text(encoding="utf-8")
    page = parse_page(source, vocab)
    rows = render(vocab, page)
    examples[path.name] = {
        "rows_one_per_line": render(vocab, page, per_line=1),
        "source": source,
        "formatted": format_page(page),
        "rows": rows,
        "graph": format_graph(vocab, read_graph(vocab, page)),
        "svg": render_svg(vocab, page),
        "decoded": format_page(decode(vocab, "\n".join(rows))),
    }

words = {}
for e in vocab.entries:
    words[str(e.word)] = {"rows": draw_words(vocab, [e.word]), "gloss": vocab.gloss(e.word)}

parse = {}
for text in ["BODY.OTHER", "body.other", "SELF", "COUNT.137", "COUNT.0", "COUNT", "_.12", "_.WATER", "_", "",
             "LIGHT.VOICE", "BODY.WIND", "COUNT.512", "STAR.12", "ONE.12", "COUNT.SELF", "FOO", "_.0",
             "COUNT.4.171", "COUNT.2219", "COUNT.70491", "COUNT.12.106.0", "COUNT.4.512", "COUNT.0.5", "_.4.170",
             "BODY.SELF.OTHER"]:
    try:
        w = vocab.parse(text)
        parse[text] = {"word": str(w), "node": vocab.gloss(w), "relation": vocab.gloss(w, role="relation")}
    except GlyphError as exc:
        parse[text] = {"error": str(exc)}

numbers = {
    str(n): draw_words(vocab, [vocab.parse(f"COUNT.{n}")])
    for n in [*range(0, 512), 512, 2219, 70491, 262143, 262144, 3200000]
}

out = {"glyph_cli": glyph_cli.__version__, "examples": examples, "words": words, "parse": parse, "numbers": numbers}
(ROOT / "tests/glyph-cli-fixtures.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"wrote tests/glyph-cli-fixtures.json from glyph-cli {glyph_cli.__version__}")
