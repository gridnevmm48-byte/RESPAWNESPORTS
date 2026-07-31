#!/usr/bin/env python3
"""
RESPAWN — build the self-contained artifact page from the local site.

Local site (index.html + style.css + script.js) is the source of truth and
plays real video. The artifact runs under a strict CSP: no external fonts,
no external media, no separate .css/.js — so everything gets inlined and the
video is swapped for stills from those same clips, animated with Ken Burns.

    python3 build-artifact.py

Writes respawn-artifact.html. Publish that file with the Artifact tool.
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "assets-src"
OUT = ROOT / "respawn-artifact.html"

# Video slots in document order -> the still pulled from that same clip.
# (See assets-src/README for which clip each frame came from.)
STILLS = [
    "hero.jpg",         # hero            <- 19.49.48 @7s   club floor, players
    "sp1-pc.jpg",       # spaces 01 PC    <- 19.48.48 @12s  headset + keyboard
    "sp2-vip.jpg",      # spaces 02 VIP   <- 19.49.22 @1s   VIP wall
    "sp3-ps5.jpg",      # spaces 03 PS5   <- 19.49.10 @11s  DualSense on recliner
    "sp4-cinema.jpg",   # spaces 04 cine  <- 19.49.10 @15s  130" projection
    "sp5-lounge.jpg",   # spaces 05 loung <- 19.49.16 @15s  the table between rounds
    "cinema-bg.jpg",    # cinema section  <- 19.49.10 @3s   recliner row
    "quote.jpg",        # testimonial     <- 19.49.48 @25s  Bootcamp 2
]

VIDEO_TAG = re.compile(r"<video\b[^>]*>\s*</video>", re.S)
MUTE_BTN = re.compile(
    r'\s*<button class="hero__mute".*?</button>', re.S)


def data_uri(path: pathlib.Path) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode()


def require(cond: bool, msg: str) -> None:
    if not cond:
        sys.exit(f"build-artifact: {msg}")


# The artifact page is wrapped in a <head> we don't control, so we can't count
# on a charset declaration reaching the parser before the Cyrillic does. Both
# payloads go out as pure ASCII instead — mojibake-proof either way.
def ascii_html(s: str) -> str:
    return "".join(c if ord(c) < 128 else f"&#x{ord(c):X};" for c in s)


def ascii_js(s: str) -> str:
    return "".join(c if ord(c) < 128 else f"\\u{ord(c):04x}" for c in s)


def ascii_css(s: str) -> str:
    # \NNNN<space> is a valid CSS escape in values and inert inside comments
    return "".join(c if ord(c) < 128 else f"\\{ord(c):X} " for c in s)


# ── CSS the artifact needs on top of style.css ────────────────────────────────
# 1. the two faces, inlined (style.css only names them)
# 2. Cyrillic display fallback — Space Grotesk has no Cyrillic
# 3. dark is not a theme here, it is the design; the viewer's light theme
#    must not bleed through
# 4. Ken Burns, standing in for the motion the video used to carry
ARTIFACT_CSS = """
/* ── artifact overrides ─────────────────────────────────────────────────── */
:root{color-scheme:dark}
html,:root[data-theme="light"],:root[data-theme="dark"]{background:var(--bg)}
body,:root[data-theme="light"] body{background:var(--bg);color:var(--ink)}

/* Space Grotesk ships no Cyrillic — RU display type moves to Manrope,
   tightened so the two languages hold the same voice. */
body[data-lang="ru"] .h-display,
body[data-lang="ru"] .hero__title,
body[data-lang="ru"] .cinema__title,
body[data-lang="ru"] .book__title,
body[data-lang="ru"] .manifesto__text,
body[data-lang="ru"] .life__quote p,
body[data-lang="ru"] .quote__text{font-family:var(--font-b);font-weight:200;letter-spacing:-.035em}
body[data-lang="ru"] .kicker,
body[data-lang="ru"] .panel__idx,
body[data-lang="ru"] .stat__lab{font-family:var(--font-b)}

/* stills replace video */
.quote__media img{width:100%;height:100%;object-fit:cover;filter:brightness(.72) saturate(.9)}

/* The clips are shot vertically; the panels and the hero are wide. A centred
   crop throws away the part that carries the room, so each still names its own
   focal point. Stills also sit brighter than video did — nothing moves to
   catch the eye, so the frame has to. */
[data-kb]{object-position:50% 38%}
[data-kb="hero"]{object-position:58% 42%}
[data-kb="sp1-pc"]{object-position:50% 50%}
[data-kb="sp2-vip"]{object-position:50% 20%}
[data-kb="sp3-ps5"]{object-position:50% 46%}
[data-kb="sp4-cinema"]{object-position:50% 30%}
[data-kb="sp5-lounge"]{object-position:50% 42%}
[data-kb="cinema-bg"]{object-position:50% 46%}
[data-kb="quote"]{object-position:50% 32%}
.hero__video{filter:saturate(.9) contrast(1.04) brightness(.78)}
.panel__media{filter:brightness(.8) saturate(.92)}
.cinema__bg{filter:brightness(.5) saturate(.85)}

[data-kb]{transform-origin:50% 50%;animation:kb 26s var(--ease) infinite alternate;
  animation-play-state:paused;will-change:transform}
[data-kb].is-live{animation-play-state:running}
@keyframes kb{
  from{transform:scale(1.03) translate3d(0,0,0)}
  to{transform:scale(1.15) translate3d(-2%,-2.5%,0)}
}
.hero__video{animation-duration:34s}
.cinema__bg{animation-duration:30s}
.panel:nth-child(2n) [data-kb]{animation-direction:alternate-reverse;animation-duration:30s}
.panel:nth-child(3n) [data-kb]{animation-duration:23s}
@media (prefers-reduced-motion:reduce){[data-kb]{animation:none}}
"""

# ── JS patches ────────────────────────────────────────────────────────────────
# localStorage throws in some sandboxed frames; shadow it inside the IIFE.
LS_SHIM = """  var localStorage = (function () {
    try { window.localStorage.getItem('respawn_probe'); return window.localStorage; }
    catch (e) {
      var mem = {};
      return { getItem: function (k) { return k in mem ? mem[k] : null; },
               setItem: function (k, v) { mem[k] = String(v); } };
    }
  })();
"""

OLD_VIDEO_BLOCK = """  /* ---------- lazy video play ---------- */
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(function(){}); }
      else v.pause();
    });
  }, { threshold: 0.15 });
  $$('[data-bg-video]').forEach(function (v) { vio.observe(v); });"""

NEW_VIDEO_BLOCK = """  /* ---------- Ken Burns, only while on screen ---------- */
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('is-live', e.isIntersecting); });
  }, { threshold: 0.05 });
  $$('[data-kb]').forEach(function (el) { vio.observe(el); });"""

OLD_MUTE_BLOCK = """  /* ---------- hero mute ---------- */
  var heroVideo = $('.hero__video'), muteBtn = $('[data-mute]'), muteIco = $('[data-mute-ico]');
  if (muteBtn && heroVideo) {
    muteBtn.addEventListener('click', function () {
      heroVideo.muted = !heroVideo.muted;
      muteIco.textContent = heroVideo.muted ? '♪' : '◉';
      muteBtn.style.borderColor = heroVideo.muted ? '' : 'var(--amber-1)';
      if (!heroVideo.muted) heroVideo.play().catch(function(){});
    });
  }

"""


def build() -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "style.css").read_text(encoding="utf-8")
    js = (ROOT / "script.js").read_text(encoding="utf-8")
    fonts = (SRC / "fonts.css").read_text(encoding="utf-8")

    # ---- HTML: video -> still ------------------------------------------------
    tags = VIDEO_TAG.findall(html)
    require(len(tags) == len(STILLS),
            f"expected {len(STILLS)} <video> tags, found {len(tags)}")

    slot = iter(STILLS)

    def to_img(m: re.Match) -> str:
        name = next(slot)
        f = SRC / name
        require(f.exists(), f"missing still {f}")
        cls = re.search(r'class="([^"]*)"', m.group(0))
        cls = f'class="{cls.group(1)}" ' if cls else ""
        return (f'<img {cls}data-kb="{f.stem}" alt="" loading="lazy" '
                f'decoding="async" src="{data_uri(f)}">')

    html = VIDEO_TAG.sub(to_img, html)
    html = html.replace('data-kb="hero" alt="" loading="lazy"',
                        'data-kb="hero" alt="" loading="eager" fetchpriority="high"')

    # ---- HTML: strip the sound toggle (nothing left to unmute) ---------------
    html, n = MUTE_BTN.subn("", html)
    require(n == 1, "hero mute button not found")

    # ---- HTML: unwrap to body content ---------------------------------------
    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)

    # ---- JS patches ----------------------------------------------------------
    require(OLD_VIDEO_BLOCK in js, "lazy-video block not found in script.js")
    require(OLD_MUTE_BLOCK in js, "hero mute block not found in script.js")
    js = js.replace(OLD_VIDEO_BLOCK, NEW_VIDEO_BLOCK).replace(OLD_MUTE_BLOCK, "")
    js = js.replace("  'use strict';\n", "  'use strict';\n" + LS_SHIM, 1)

    OUT.write_text(
        f"<title>{ascii_html(title)}</title>\n"
        f"<style>\n{fonts}\n{ascii_css(css + ARTIFACT_CSS)}</style>\n"
        f"{ascii_html(body)}\n"
        f"<script>\n{ascii_js(js)}\n</script>\n",
        encoding="ascii")

    kb = OUT.stat().st_size / 1024
    print(f"built {OUT.name} — {kb:.0f} KB, {len(STILLS)} stills, "
          f"{fonts.count('@font-face')} font faces")


if __name__ == "__main__":
    build()
