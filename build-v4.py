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
# docs/ is what GitHub Pages serves, so the published site tracks every build
PAGES = ROOT / "docs" / "index.html"

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


def find_clip(name: str) -> pathlib.Path:
    for d in CLIP_DIRS:
        f = ASSETS / d / f"{name}.mp4"
        if f.exists():
            return f
    die(f"missing clip {name}.mp4 in {CLIP_DIRS}")


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


def render(template: str, fonts_css: str, seen: dict, inline_clips: bool,
           clip_out_dirs: list[pathlib.Path]) -> str:
    """Resolve every {{...}} token. inline_clips=True embeds clips as data
    URIs (Artifact build, strict CSP, no external requests allowed).
    inline_clips=False instead copies each clip to clip_out_dirs/<name>.mp4
    and points <video> at that relative path, so the browser fetches clips
    lazily over HTTP instead of blocking on one giant inline document."""

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
        f = find_clip(name)
        seen["clip"].append(f"{name} ({f.stat().st_size // 1024}K)")
        if inline_clips:
            return data_uri(f, "video/mp4")
        for d in clip_out_dirs:
            d.mkdir(parents=True, exist_ok=True)
            (d / f"{name}.mp4").write_bytes(f.read_bytes())
        return f"clips/{name}.mp4"

    out, n = TOKEN.subn(swap, template)
    if n == 0:
        die("template has no {{...}} tokens - wrong file?")
    if "{{" in out:
        die(f"unresolved token near: {out[out.index('{{'):][:60]}")
    return out


def build() -> None:
    template = SRC.read_text(encoding="utf-8")
    fonts_css, faces = collect_fonts()

    # Artifact build: everything inlined, zero external requests.
    seen_inline = {"img": [], "clip": []}
    doc_inline = ascii_escape(
        render(template, fonts_css, seen_inline, inline_clips=True, clip_out_dirs=[]))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(doc_inline, encoding="ascii")

    # Real-site build: clips are separate /clips/*.mp4 files the browser
    # fetches lazily, so a slow connection no longer freezes the whole page
    # behind one multi-megabyte inline <script>.
    seen_ext = {"img": [], "clip": []}
    doc_ext = ascii_escape(
        render(template, fonts_css, seen_ext, inline_clips=False,
               clip_out_dirs=[PREVIEW.parent / "clips", PAGES.parent / "clips"]))

    # The Artifact host wraps our fragment in a real document. Opening the bare
    # fragment from disk lands in quirks mode instead, where the scrolling
    # element and table inheritance differ - so mirror the wrapper for local QA.
    PREVIEW.write_text(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        "</head><body>\n" + doc_ext + "\n</body></html>",
        encoding="ascii")

    # The Pages copy is a full document, same wrapper the Artifact host applies,
    # plus the metadata a real site needs and an artifact does not.
    PAGES.parent.mkdir(exist_ok=True)
    PAGES.write_text(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="description" content="RESPAWN ESPORTS - esports club in central Limassol. '
        'Four gaming zones, PC and PS5 game library, 130-inch private cinema. '
        'Agiou Andreou 160. Off-peak rates from 3 EUR/hour.">'
        '<meta property="og:title" content="RESPAWN ESPORTS - Limassol">'
        '<meta property="og:description" content="Four gaming zones, a big PC and PS5 library, '
        'and a 130-inch private cinema in central Limassol.">'
        '<meta property="og:type" content="website">'
        '<link rel="icon" href="data:image/svg+xml,'
        '%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E'
        '%3Crect width=%22100%22 height=%22100%22 fill=%22%23070709%22/%3E'
        '%3Ccircle cx=%2250%22 cy=%2250%22 r=%2226%22 fill=%22%23E4321A%22/%3E%3C/svg%3E">'
        "</head><body>\n" + doc_ext + "\n</body></html>",
        encoding="ascii")

    kb_inline = len(doc_inline) / 1024
    kb_ext = len(doc_ext) / 1024
    print(f"built {OUT.relative_to(ROOT)} - {kb_inline:.0f} KB (Artifact, fully inlined)")
    print(f"built {PAGES.relative_to(ROOT)} - {kb_ext:.0f} KB + clips/ (real site, lazy video)")
    print(f"  fonts:  {len(faces)} faces ({', '.join(sorted(set(faces)))})")
    print(f"  photos: {', '.join(sorted(set(seen_ext['img'])))}")
    print(f"  clips:  {', '.join(sorted(set(seen_ext['clip']))) or 'none'}")
    if kb_inline > 2400:
        print("  WARNING: Artifact build over 1.4 MB - drop a clip or re-encode the photos")


if __name__ == "__main__":
    build()
