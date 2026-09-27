"""Remove the artwork's baked-in HUD lettering so the site can re-create it as live, interactive type.

The "YO" block letters, the HUMAN/IDEAS/MACHINE/POSSIBILITIES panel, the VERSION 2.0 note and the
LEARN/BUILD/EXPLORE/EVOLVE list are painted out with a multi-scale diffusion fill plus matched grain.
The figure, ring, earth panel and decorative strokes are untouched.

Usage: python tools/clean_plate.py art/hero-original.webp public/hero/hero-depth.png public/hero/hero-plate.webp
Regions are in source-image pixels — adjust them if the hero artwork changes.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, depth_path, out = sys.argv[1:4]
img = Image.open(src).convert("RGB")
W, H = img.size
im = np.asarray(img).astype(np.float32)
depth = np.asarray(Image.open(depth_path).convert("L").resize((W, H), Image.BILINEAR)) / 255.0
lum = im @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

RING = (667.4, 699.3, 437.2)  # centre x, y, radius — keep in sync with HERO_ART.ring
yy, xx = np.mgrid[0:H, 0:W]
near_ring = np.abs(np.hypot(xx - RING[0], yy - RING[1]) - RING[2]) < 26

# (x0, y0, x1, y1, luminance threshold)
REGIONS = [
    (0, 0, 572, 232, 95),      # "YO" block letters
    (36, 320, 272, 508, 70),   # HUMAN / IDEAS / MACHINE / POSSIBILITIES panel + frame
    (40, 712, 172, 804, 70),   # VERSION 2.0 / A MORE CAPABLE ME
    (1236, 668, 1328, 772, 70),  # LEARN / BUILD / EXPLORE / EVOLVE
]

mask = np.zeros((H, W), bool)
for x0, y0, x1, y1, t in REGIONS:
    region = np.zeros((H, W), bool)
    region[y0:y1, x0:x1] = True
    mask |= region & (lum > t) & (depth < 0.14) & ~near_ring

# grow the mask to swallow anti-aliased edges and glow
m_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
mask = (np.asarray(m_img) > 0) & (depth < 0.16) & ~near_ring


def fill(arr, msk, iters):
    """Jacobi relaxation of masked pixels toward the average of their neighbours."""
    a = arr.copy()
    for _ in range(iters):
        p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        a[msk] = avg[msk]
    return a


# coarse-to-fine so large regions converge quickly
result = im.copy()
guess = None
for s in (16, 8, 4, 2, 1):
    w, h = W // s, H // s
    small = np.asarray(Image.fromarray(im.astype(np.uint8)).resize((w, h), Image.BOX)).astype(np.float32)
    msk = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((w, h), Image.BOX)) > 0
    if guess is not None:
        up = np.asarray(Image.fromarray(guess.clip(0, 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)).astype(np.float32)
        small[msk] = up[msk]
    guess = fill(small, msk, 200 if s > 1 else 120)
result[mask] = guess[mask]

# matched film grain so the fill doesn't look airbrushed
rng = np.random.default_rng(7)
grain = rng.normal(0, 2.6, (H, W, 1)).astype(np.float32)
result[mask] += grain[mask]

# feather the seam
soft = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32)[..., None] / 255
final = im * (1 - soft) + result * soft
Image.fromarray(final.clip(0, 255).astype(np.uint8)).save(out, quality=90, method=6)
print("masked px:", int(mask.sum()))
