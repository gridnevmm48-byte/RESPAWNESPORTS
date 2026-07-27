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


def data_uri(path: pathlib.Path) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode()


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

/* Stills replace video, so the drift has to come from somewhere. Only where
   nothing else already animates transform — the case cards scale on hover. */
.card__media,.book__bg{
  animation:kb 30s var(--ease) infinite alternate;
  animation-play-state:paused;transform-origin:50% 50%;will-change:transform;
}
.card__media.is-live,.book__bg.is-live{animation-play-state:running}
@keyframes kb{
  from{transform:scale(1.03) translate3d(0,0,0)}
  to{transform:scale(1.14) translate3d(-2%,-2%,0)}
}
.card--dim .card__media{animation-direction:alternate-reverse;animation-duration:26s}
@media (prefers-reduced-motion:reduce){.card__media,.book__bg{animation:none}}
"""

# The stills never move on their own, so the drift is driven the same way the
# video playback was: start it when the element is on screen, stop when it goes.
KB_JS = """
  /* ---------- artifact: drive the Ken Burns drift ---------- */
  (function () {
    var els = $$('.card__media,.book__bg');
    if (!els.length || reduce) return;
    var kio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-live', e.isIntersecting); });
    }, { threshold: 0.05 });
    els.forEach(function (el) { kio.observe(el); });
  })();
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
    require(n > 0, "no <video> tags found in v2/index.html")

    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    body = re.sub(r'\s*<script src="script\.js"></script>', "", body)

    # hang the drift driver on the end of the module, inside its IIFE
    marker = "\n})();\n"
    require(js.rstrip().endswith("})();"), "script.js does not end in an IIFE")
    js = js.rstrip()[: -len("})();")] + KB_JS + "})();\n"

    OUT.write_text(
        f"<title>{ascii_html(title)}</title>\n"
        f"<style>\n{fonts}\n{ascii_css(css + ARTIFACT_CSS)}</style>\n"
        f"{ascii_html(body)}\n"
        f"<script>\n{ascii_js(js)}\n</script>\n",
        encoding="ascii")

    kb = OUT.stat().st_size / 1024
    print(f"built {OUT.name} — {kb:.0f} KB, {n} stills "
          f"({', '.join(sorted(set(used)))}), {fonts.count('@font-face')} font faces")


if __name__ == "__main__":
    build()
