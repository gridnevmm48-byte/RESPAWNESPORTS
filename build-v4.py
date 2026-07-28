#!/usr/bin/env python3
"""
RESPAWN v4 - build the self-contained artifact page from src/.

src/respawn.template.html is the source of truth. The artifact runs under a
strict CSP (no external fonts, media or scripts) inside a <head> we do not
control, so this script:

  * inlines the font faces we actually use, out of the two big css dumps
  * inlines photos as image/jpeg data URIs   {{IMG:hero}}
  * inlines the short clips as video/mp4     {{CLIP:sp1-pc}}
  * escapes every non-ASCII byte, because no charset declaration is guaranteed
    to reach the parser before our Cyrillic does (see build-v2.py)

    python3 build-v4.py

Writes dist/respawn-v4.html. Publish that file with the Artifact tool.
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src" / "respawn.template.html"
ASSETS = ROOT / "assets-src"
OUT = ROOT / "dist" / "respawn-v4.html"
PREVIEW = ROOT / "dist" / "preview.html"

# family -> weights we ship. Manrope carries Cyrillic, which the bilingual copy
# needs and Space Grotesk does not have.
FONTS = {
    "Manrope": {"200", "400", "600"},
    "JetBrains Mono": {"400"},
}
FONT_SOURCES = ["fonts.css", "fonts-v2.css"]

FACE = re.compile(
    r"@font-face\{(?P<head>[^{}]*?)src:url\(data:font/woff2;base64,"
    r"(?P<b64>[A-Za-z0-9+/=]+)\)(?P<tail>[^{}]*)\}"
)
TOKEN = re.compile(r"\{\{(?P<kind>IMG|WEBP|CLIP|FONTS):?(?P<name>[a-z0-9-]*)\}\}")

# clips2 holds the re-encoded loops (clipkit); clips is the older low-rate set
CLIP_DIRS = ["clips2", "clips"]


def die(msg: str) -> None:
    sys.exit(f"build-v4: {msg}")


SCRIPT = re.compile(r"(<script>)(.*?)(</script>)", re.S)


def ascii_escape(s: str) -> str:
    """Make the document pure ASCII.

    Markup and attributes take HTML numeric references, but the <script> body
    must take JS \\uXXXX escapes instead: most of those strings are handed to
    textContent, which would render "&#x20AC;" literally rather than a euro
    sign. Escape the two zones separately.
    """
    def html(t: str) -> str:
        return "".join(c if ord(c) < 128 else f"&#x{ord(c):X};" for c in t)

    def js(t: str) -> str:
        return "".join(c if ord(c) < 128 else f"\\u{ord(c):04x}" for c in t)

    out, last = [], 0
    for m in SCRIPT.finditer(s):
        out.append(html(s[last:m.start()]))
        out.append(m.group(1) + js(m.group(2)) + m.group(3))
        last = m.end()
    out.append(html(s[last:]))
    return "".join(out)


def data_uri(path: pathlib.Path, mime: str) -> str:
    if not path.exists():
        die(f"missing asset {path}")
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def collect_fonts() -> tuple[str, list[str]]:
    out, used = [], []
    for name in FONT_SOURCES:
        css = (ASSETS / name).read_text(encoding="utf-8")
        for m in FACE.finditer(css):
            head = m.group("head")
            fam = re.search(r"font-family:'([^']+)'", head)
            weight = re.search(r"font-weight:(\d+)", head)
            if not fam or not weight:
                continue
            fam, weight = fam.group(1), weight.group(1)
            if weight in FONTS.get(fam, ()):
                out.append(m.group(0))
                used.append(f"{fam} {weight}")
    if not out:
        die("no font faces matched - check FONTS against the css dumps")
    return "".join(out), used


def build() -> None:
    html = SRC.read_text(encoding="utf-8")
    fonts_css, faces = collect_fonts()
    seen = {"img": [], "clip": []}

    def swap(m: re.Match) -> str:
        kind, name = m.group("kind"), m.group("name")
        if kind == "FONTS":
            return fonts_css
        if kind == "IMG":
            seen["img"].append(name + ".jpg")
            return data_uri(ASSETS / f"{name}.jpg", "image/jpeg")
        if kind == "WEBP":
            seen["img"].append(name + ".webp")
            return data_uri(ASSETS / f"{name}.webp", "image/webp")
        for d in CLIP_DIRS:
            f = ASSETS / d / f"{name}.mp4"
            if f.exists():
                seen["clip"].append(f"{name} ({f.stat().st_size // 1024}K)")
                return data_uri(f, "video/mp4")
        die(f"missing clip {name}.mp4 in {CLIP_DIRS}")

    html, n = TOKEN.subn(swap, html)
    if n == 0:
        die("template has no {{...}} tokens - wrong file?")
    if "{{" in html:
        die(f"unresolved token near: {html[html.index('{{'):][:60]}")

    OUT.parent.mkdir(exist_ok=True)
    doc = ascii_escape(html)
    OUT.write_text(doc, encoding="ascii")

    # The Artifact host wraps our fragment in a real document. Opening the bare
    # fragment from disk lands in quirks mode instead, where the scrolling
    # element and table inheritance differ - so mirror the wrapper for local QA.
    PREVIEW.write_text(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        "</head><body>\n" + doc + "\n</body></html>",
        encoding="ascii")

    kb = OUT.stat().st_size / 1024
    print(f"built {OUT.relative_to(ROOT)} - {kb:.0f} KB")
    print(f"  fonts:  {len(faces)} faces ({', '.join(sorted(set(faces)))})")
    print(f"  photos: {', '.join(sorted(set(seen['img'])))}")
    print(f"  clips:  {', '.join(sorted(set(seen['clip']))) or 'none'}")
    if kb > 2400:
        print("  WARNING: over 1.4 MB - drop a clip or re-encode the photos")


if __name__ == "__main__":
    build()
