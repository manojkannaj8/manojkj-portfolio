"""Generate the hero depth map + figure mask used by the WebGL hero.

Usage: python tools/make_depth.py art/hero-original.webp public/hero
Re-run whenever the hero image changes.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from transformers import pipeline

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
depth = pipe(im)["depth"].resize(im.size, Image.BICUBIC)
d = np.asarray(depth).astype(np.float32)
d = (d - d.min()) / (d.max() - d.min() + 1e-6)
img = Image.fromarray((d * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
img.resize((im.width // 2, im.height // 2), Image.LANCZOS).save(f"{out}/hero-depth.png", optimize=True)
print("depth stats", np.percentile(d, [5, 25, 50, 75, 95]))
