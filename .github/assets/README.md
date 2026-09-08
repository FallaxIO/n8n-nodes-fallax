# Brand assets

| File | Use |
| --- | --- |
| `banner-light.svg` / `banner-dark.svg` | README header, 1200×340, picked by `prefers-color-scheme` |
| `banner.py` | regenerates both |

## The picture

Left, the Fallax mark and the package name. Right, the thing the package is
for, drawn as the n8n canvas it lives on: the trigger node in Fallax lime, a
filter on the verdict, and a dashed tile for whatever you wire up next. The
trigger keeps n8n's silhouette for a trigger — round on the entry side, square
on the exit — so it reads as a node before you read a word of it.

## Colours

Fallax's palette, from the [brand kit](https://fallax.io/press). Lime is spent
on one thing per banner: the mark, and the node that is ours.

| Token | Light | Dark |
| --- | --- | --- |
| background | `#FFFFFF` | `#0A0A0C` |
| canvas | `#FCFCFD` | `#121216` |
| foreground | `#121216` | `#FFFFFF` |
| secondary / dim | `#5F6570` / `#8E939D` | `#A3A3AE` / `#71717E` |
| hairline | `#EAEAEA` | `#22222A` |
| brand | `#4D6B06` Deep Olive | `#CFF631` Signal Lime |

Never lime on white: on the light banner the mark is ink and the brand step is
Deep Olive.

## Type

[Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) for the
name, [Inter](https://rsms.me/inter/) for prose,
[Geist Mono](https://vercel.com/font) on the canvas, all OFL. Every glyph is
written out as an outline, so the SVGs render identically everywhere and load no
fonts. Editing the copy means regenerating the file, not editing its paths.

## Regenerating

```sh
pip install fonttools brotli uharfbuzz
python3 .github/assets/banner.py
```

The three faces come from their `@fontsource-variable` packages. The script
looks in this repo's `node_modules`, or wherever `FONT_DIR` points — the Fallax
app already carries all three, so `FONT_DIR=../<app>/node_modules/@fontsource-variable`
saves installing them twice.
