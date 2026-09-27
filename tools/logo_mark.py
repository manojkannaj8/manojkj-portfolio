"""Turn a logo on a solid black background into a small transparent square mark.

Usage: python tools/logo_mark.py <input> <output.png> [size]
Black is keyed out by luminance with colour un-premultiplied, so white and brand colours stay true.
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 128
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
alpha = rgb.max(axis=2)
alpha = np.clip((alpha - 0.18) / 0.5, 0, 1)             # drop near-black noise; saturated brand colours stay opaque
colour = np.where(alpha[..., None] > 0, np.clip(rgb / np.maximum(alpha[..., None], 1e-4), 0, 1), 0)  # un-premultiply by coverage
rgba = np.dstack([colour, alpha]) * 255
img = Image.fromarray(rgba.astype(np.uint8), "RGBA")
bbox = img.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
img = img.crop(bbox)
side = int(max(img.size) * 1.08)
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
canvas.resize((size, size), Image.LANCZOS).save(out, optimize=True)
print(out, canvas.size, "->", size)
