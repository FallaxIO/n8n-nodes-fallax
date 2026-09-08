"""Regenerate the README banners.

    python3 .github/assets/banner.py

Every glyph is written out as an outline, so the SVGs render identically
everywhere and load no fonts: editing the copy means running this again, not
editing the path data. It needs `fonttools`, `brotli` and `uharfbuzz`, plus the
three brand faces (see CANDIDATES below).
"""
import io
import os

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../.."))

FILES = {
    "sans": "inter/files/inter-latin-standard-normal.woff2",
    "display": "instrument-sans/files/instrument-sans-latin-standard-normal.woff2",
    "mono": "geist-mono/files/geist-mono-latin-wght-normal.woff2",
}
# where the @fontsource-variable packages live: this repo, or $FONT_DIR
CANDIDATES = [
    os.environ.get("FONT_DIR"),
    os.path.join(ROOT, "node_modules/@fontsource-variable"),
]


def _font_path(family):
    for base in CANDIDATES:
        if base and os.path.exists(os.path.join(base, FILES[family])):
            return os.path.join(base, FILES[family])
    raise SystemExit(
        "Fonts not found. Install them next to this repo with\n"
        "  pnpm add -D @fontsource-variable/inter "
        "@fontsource-variable/instrument-sans @fontsource-variable/geist-mono\n"
        "or point FONT_DIR at a directory that holds those packages."
    )


_cache = {}


def _load(family, weight):
    key = (family, weight)
    if key in _cache:
        return _cache[key]
    f = TTFont(_font_path(family))
    axes = {a.axisTag: a for a in f["fvar"].axes} if "fvar" in f else {}
    if "wght" in axes:
        f = instancer.instantiateVariableFont(f, {"wght": weight}, inplace=False)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    data = buf.getvalue()
    face = hb.Face(data)
    hbf = hb.Font(face)
    upem = face.upem
    hbf.scale = (upem, upem)
    glyphset = f.getGlyphSet()
    order = f.getGlyphOrder()
    _cache[key] = (hbf, glyphset, order, upem)
    return _cache[key]


def measure(text, family="sans", size=16, weight=400, tracking=0.0):
    hbf, _, _, upem = _load(family, weight)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbf, buf)
    s = size / upem
    adv = sum(p.x_advance for p in buf.glyph_positions) * s
    return adv + tracking * max(len(text) - 1, 0)


def path(text, family="sans", size=16, weight=400, tracking=0.0):
    """Return (path_data, advance_width) with the baseline origin at (0, 0)."""
    hbf, glyphset, order, upem = _load(family, weight)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbf, buf)
    s = size / upem
    pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    x = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        tp = TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, -pos.y_offset * s))
        glyphset[name].draw(tp)
        x += pos.x_advance * s + tracking
    return pen.getCommands(), x - (tracking if text else 0)



W, H = 1200, 340
DIV = 716                      # vertical rule
CARD = (780, 60, 356, 220)     # x, y, w, h
PAD = 24

LIGHT = dict(
    bg="#FFFFFF", border="#EAEAEA", card="#FCFCFD", hair="#EAEAEA",
    fg="#121216", sec="#5F6570", dim="#8E939D",
    brand="#4D6B06", brand_fill="#F5F9E9",
    tile="#FFFFFF", tile_stroke="#DDDDE3", wire="#C6C6CE", grid="#E7E7EC",
)
DARK = dict(
    bg="#0A0A0C", border="#22222A", card="#121216", hair="#22222A",
    fg="#FFFFFF", sec="#A3A3AE", dim="#71717E",
    brand="#CFF631", brand_fill="#181E08",
    tile="#17171C", tile_stroke="#2E2E38", wire="#3A3A45", grid="#20202A",
)

TITLE = "n8n-nodes-fallax"
LINE1 = "Start a workflow the moment somebody reports a phish or clicks a lure."
LINE2 = "Keep your Fallax directory in step with your HR system."
NODES = ["Message Reported", "verdict: unknown", "your workflow"]
CAPTION = "oldest first · exactly once · no public URL"

MARK = [  # the cleft F, on a 24 grid
    "M4.2 2.8H20.4V7.4H8.8V9.6L4.2 12.2Z",
    "M4.2 14.8 8.8 12.2V10.4H17.6V15H8.8V21.2H4.2Z",
]
MARK_BOX = (4.2, 2.8, 16.2, 18.4)  # x, y, w, h of the drawn content


def txt(s, x, y, fill, family="sans", size=16, weight=400, tracking=0.0, anchor="start"):
    d, adv = path(s, family=family, size=size, weight=weight, tracking=tracking)
    if anchor == "middle":
        x -= adv / 2
    elif anchor == "end":
        x -= adv
    return f'  <path transform="translate({x:.2f} {y:.2f})" d="{d}" fill="{fill}"/>'


def mark(cx, cy, height, fill):
    mx, my, mw, mh = MARK_BOX
    s = height / mh
    tx = cx - (mx * s) - (mw * s) / 2
    ty = cy - (my * s) - height / 2
    paths = "".join(f'<path d="{p}"/>' for p in MARK)
    return (f'  <g transform="translate({tx:.2f} {ty:.2f}) scale({s:.4f})" '
            f'fill="{fill}">{paths}</g>')


def tile_trigger(x, y, size, r_big, r_small):
    """n8n's trigger silhouette: round on the entry side, square on the exit."""
    return (f"M{x + r_big} {y}H{x + size - r_small}"
            f"a{r_small} {r_small} 0 0 1 {r_small} {r_small}"
            f"V{y + size - r_small}"
            f"a{r_small} {r_small} 0 0 1 -{r_small} {r_small}"
            f"H{x + r_big}"
            f"a{r_big} {r_big} 0 0 1 0 -{size}Z")


def build(c, name):
    o = []
    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
             f'viewBox="0 0 {W} {H}" role="img" '
             f'aria-label="n8n-nodes-fallax: start a workflow the moment somebody '
             f'reports a phish or clicks a lure, and keep your Fallax directory in '
             f'step with your HR system.">')
    o.append(f'  <rect width="{W}" height="{H}" rx="14" fill="{c["bg"]}"/>')
    o.append(f'  <rect x=".5" y=".5" width="{W - 1}" height="{H - 1}" rx="13.5" '
             f'fill="none" stroke="{c["border"]}"/>')

    # left column
    o.append(mark(89.5, 93, 58, c["fg"] if name == "light" else c["brand"]))
    o.append(txt(TITLE, 62, 192, c["fg"], family="display", size=34, weight=600, tracking=-0.4))
    o.append(txt(LINE1, 64, 236, c["sec"], size=15))
    o.append(txt(LINE2, 64, 270, c["dim"], size=15))

    o.append(f'  <rect x="{DIV}" y="0" width="1" height="{H}" fill="{c["hair"]}"/>')

    # right column: an n8n canvas holding the flow this package starts
    cx, cy, cw, ch = CARD
    o.append(f'  <defs><pattern id="grid" width="18" height="18" '
             f'patternUnits="userSpaceOnUse" x="{cx + 9}" y="{cy + 9}">'
             f'<circle cx="1" cy="1" r="1" fill="{c["grid"]}"/></pattern></defs>')
    o.append(f'  <rect x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="12" fill="{c["card"]}"/>')
    o.append(f'  <rect x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="12" fill="url(#grid)"/>')
    o.append(f'  <rect x="{cx}.5" y="{cy}.5" width="{cw - 1}" height="{ch - 1}" rx="11.5" '
             f'fill="none" stroke="{c["hair"]}"/>')

    inner_l, inner_r = cx + PAD, cx + cw - PAD
    o.append(txt("FALLAX TRIGGER", inner_l, 90, c["dim"], family="mono", size=9.5, weight=500, tracking=1.4))
    pw = measure("polling", family="mono", size=9.5, weight=500, tracking=1.4)
    o.append(f'  <circle cx="{inner_r - pw - 10:.2f}" cy="86.5" r="3" fill="{c["brand"]}"/>')
    o.append(txt("polling", inner_r, 90, c["brand"], family="mono", size=9.5, weight=500, tracking=1.4, anchor="end"))
    o.append(f'  <rect x="{inner_l}" y="102" width="{inner_r - inner_l}" height="1" fill="{c["hair"]}"/>')

    # three nodes, wired left to right
    size, ncy = 52, 158
    # the outer tiles sit a little inside the padding, so their labels do too
    centers = [inner_l + 34, cx + cw / 2, inner_r - 34]
    ty = ncy - size / 2

    for a, b in zip(centers, centers[1:]):
        x1, x2 = a + size / 2, b - size / 2
        o.append(f'  <path d="M{x1 + 4} {ncy}H{x2 - 7}" stroke="{c["wire"]}" '
                 f'stroke-width="1.5" fill="none"/>')
        o.append(f'  <circle cx="{x1 + 1.5}" cy="{ncy}" r="2.5" fill="{c["wire"]}"/>')
        m = (x1 + x2) / 2
        o.append(f'  <path d="M{m - 3.5} {ncy - 4.5}L{m + 1.5} {ncy}L{m - 3.5} {ncy + 4.5}" '
                 f'fill="none" stroke="{c["wire"]}" stroke-width="1.5" '
                 f'stroke-linejoin="miter" stroke-linecap="butt"/>')

    o.append(f'  <path d="{tile_trigger(centers[0] - size / 2, ty, size, 26, 8)}" '
             f'fill="{c["brand_fill"]}" stroke="{c["brand"]}" stroke-width="1.5"/>')
    o.append(mark(centers[0] + 1, ncy, 26, c["brand"]))

    o.append(f'  <rect x="{centers[1] - size / 2}" y="{ty}" width="{size}" height="{size}" '
             f'rx="9" fill="{c["tile"]}" stroke="{c["tile_stroke"]}" stroke-width="1.5"/>')
    f = centers[1]
    o.append(f'  <path d="M{f - 10} {ncy - 9}H{f + 10}L{f + 2.5} {ncy}V{ncy + 10}'
             f'L{f - 2.5} {ncy + 7}V{ncy}Z" fill="none" stroke="{c["sec"]}" '
             f'stroke-width="1.75" stroke-linejoin="miter"/>')

    o.append(f'  <rect x="{centers[2] - size / 2}" y="{ty}" width="{size}" height="{size}" '
             f'rx="9" fill="none" stroke="{c["tile_stroke"]}" stroke-width="1.5" '
             f'stroke-dasharray="5 4.5"/>')
    p = centers[2]
    o.append(f'  <path d="M{p - 8} {ncy}H{p + 8}M{p} {ncy - 8}V{ncy + 8}" fill="none" '
             f'stroke="{c["dim"]}" stroke-width="1.75" stroke-linecap="butt"/>')

    for center, label in zip(centers, NODES):
        o.append(txt(label, center, 206, c["sec"], family="mono", size=10, weight=450, anchor="middle"))

    o.append(f'  <rect x="{inner_l}" y="228" width="{inner_r - inner_l}" height="1" fill="{c["hair"]}"/>')
    o.append(txt(CAPTION, cx + cw / 2, 252, c["dim"], family="mono", size=10, anchor="middle"))
    o.append("</svg>")
    return "\n".join(o) + "\n"


for name, pal in (("light", LIGHT), ("dark", DARK)):
    p = os.path.join(HERE, f"banner-{name}.svg")
    with open(p, "w") as fh:
        fh.write(build(pal, name))
    print("wrote", p)
