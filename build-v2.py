#!/usr/bin/env python3
"""
RESPAWN v2 — build the self-contained artifact page from v2/.

v2/ is the source of truth and plays real video. The artifact runs under a
strict CSP: no external fonts, no external media, no separate .css/.js. So
everything gets inlined and each <video data-still="NAME"> is swapped for the
matching still in assets-src/NAME.jpg.

    python3 build-v2.py

Writes respawn-artifact.html. Publish that file with the Artifact tool.
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "v2"
ASSETS = ROOT / "assets-src"
OUT = ROOT / "respawn-artifact.html"

VIDEO_TAG = re.compile(r"<video\b(?P<attrs>[^>]*)>\s*</video>", re.S)
SOURCE_TAG = re.compile(r'<source\b[^>]*data-clip="(?P<name>[^"]+)"[^>]*>')


def require(cond: bool, msg: str) -> None:
    if not cond:
        sys.exit(f"build-v2: {msg}")


# The wrapping <head> is not ours, so we cannot count on a charset declaration
# reaching the parser before the Cyrillic does. Ship pure ASCII instead.
def ascii_html(s: str) -> str:
    return "".join(c if ord(c) < 128 else f"&#x{ord(c):X};" for c in s)


def ascii_js(s: str) -> str:
    return "".join(c if ord(c) < 128 else f"\\u{ord(c):04x}" for c in s)


def ascii_css(s: str) -> str:
    # \NNNN<space> is a valid CSS escape in values and inert inside comments
    return "".join(c if ord(c) < 128 else f"\\{ord(c):X} " for c in s)


def data_uri(path: pathlib.Path, mime: str = "image/jpeg") -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


ARTIFACT_CSS = """
/* ── artifact overrides ─────────────────────────────────────────────────── */
/* Dark here is the design, not a theme. The viewer's light mode must not
   leak through the wrapper we don't control. */
:root{color-scheme:dark}
html,:root[data-theme="light"],:root[data-theme="dark"]{background:var(--ink)}
body,:root[data-theme="light"] body{background:var(--ink);color:var(--fg)}

/* The clips were shot vertically and these frames are wide, so a centred crop
   would throw away what carries each room. Each still names its focal point. */
[data-still]{object-position:50% 38%}
[data-still="sp1-pc"]{object-position:50% 50%}
[data-still="sp2-vip"]{object-position:50% 20%}
[data-still="sp3-ps5"]{object-position:50% 46%}
[data-still="sp4-cinema"]{object-position:50% 30%}
[data-still="sp5-lounge"]{object-position:50% 42%}
[data-still="cinema-bg"]{object-position:50% 46%}

/* Photography now lives only in the rooms grid, where the tile already scales
   on hover — so the stills need no drift of their own. */
"""


def build() -> None:
    html = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = (SRC / "script.js").read_text(encoding="utf-8")
    fonts = (ASSETS / "fonts-v2.css").read_text(encoding="utf-8")

    used = []

    def to_img(m: re.Match) -> str:
        attrs = m.group("attrs")
        name = re.search(r'data-still="([^"]+)"', attrs)
        require(bool(name), f"<video> without data-still: {m.group(0)[:80]}")
        name = name.group(1)
        f = ASSETS / f"{name}.jpg"
        require(f.exists(), f"missing still {f}")
        used.append(name)
        cls = re.search(r'class="([^"]*)"', attrs)
        cls = f'class="{cls.group(1)}" ' if cls else ""
        return (f'<img {cls}data-still="{name}" alt="" loading="lazy" '
                f'decoding="async" src="{data_uri(f)}">')

    html, n = VIDEO_TAG.subn(to_img, html)
    require(n > 0, "no <video data-still> tags found in v2/index.html")

    # short clips stay real video — they are the animated moments, and at this
    # length and bitrate they cost less than the stills they sit next to
    clips = []

    def to_clip(m: re.Match) -> str:
        name = m.group("name")
        f = ASSETS / "clips" / f"{name}.mp4"
        require(f.exists(), f"missing clip {f}")
        clips.append(name)
        return f'<source data-clip="{name}" type="video/mp4" src="{data_uri(f, "video/mp4")}">'

    html = SOURCE_TAG.sub(to_clip, html)

    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    body = re.sub(r'\s*<script src="script\.js"></script>', "", body)

    require(js.rstrip().endswith("})();"), "script.js does not end in an IIFE")

    OUT.write_text(
        f"<title>{ascii_html(title)}</title>\n"
        f"<style>\n{fonts}\n{ascii_css(css + ARTIFACT_CSS)}</style>\n"
        f"{ascii_html(body)}\n"
        f"<script>\n{ascii_js(js)}\n</script>\n",
        encoding="ascii")

    kb = OUT.stat().st_size / 1024
    print(f"built {OUT.name} — {kb:.0f} KB\n"
          f"  stills: {', '.join(sorted(set(used)))}\n"
          f"  clips:  {', '.join(sorted(set(clips))) or 'none'}\n"
          f"  fonts:  {fonts.count('@font-face')} faces")


if __name__ == "__main__":
    build()
