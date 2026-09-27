"""Resize + compress an image for the site (WebP), with an optional crop.

Usage: python tools/optimize_image.py <in> <out.webp> [max_width] [--crop x0,y0,x1,y1]
Crop is in source pixels — use it to cut browser chrome / private UI out of screenshots.
"""
import sys
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith("--crop")]
crop = next((a.split("=", 1)[1] if "=" in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv[1:] if a.startswith("--crop")), None)
if crop and crop in args:
    args.remove(crop)
src, out = args[0], args[1]
max_w = int(args[2]) if len(args) > 2 else 1400
im = Image.open(src).convert("RGB")
if crop:
    im = im.crop(tuple(int(v) for v in crop.split(",")))
if im.width > max_w:
    im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
im.save(out, "WEBP", quality=80, method=6)
print(out, im.size)
