"""Build the hero's portrait assets: the owner's photo set into the existing hero background.

Inputs (originals, not deployed):  art/portrait-normal.webp, art/portrait-wink.webp
Background source:                  public/hero/hero-plate.webp (+ hero-depth.png for the old figure's mask)
Outputs in public/hero/:
  portrait-plate.webp  backdrop with the old character, halo ring and orbit lines painted out,
                       the portrait matted (SAM + ViTMatte) and composited in
  portrait-wink.webp   RGBA patch of the winking eye, warped onto the normal photo; alpha = blend mask
  portrait-depth.png   half-res depth (background 0.05, figure >= 0.3) for parallax, relight and voxels

Usage: python tools/portrait_plate.py
Prints the numbers to copy into HERO_PORTRAIT (src/webgl/hero/HeroScene.ts).
Models (cached in ~/.cache/huggingface): facebook/sam-vit-base, hustvl/vitmatte-base-composition-1k,
depth-anything/Depth-Anything-V2-Small-hf.
"""
import numpy as np
import torch
from PIL import Image, ImageFilter
from scipy.ndimage import binary_dilation, binary_erosion, map_coordinates, gaussian_filter
from transformers import SamModel, SamImageProcessor, VitMatteImageProcessor, VitMatteForImageMatting, pipeline

ROWS = 992                 # the photos are letterboxed; real image rows end at ~986
SCALE = 1.2                # portrait px -> plate px
EYES = (615, 375)          # midpoint between the eyes, portrait px
FOCUS = (765, 368)         # where EYES lands on the plate (the old visor focus)
X0, Y0 = FOCUS[0] - EYES[0] * SCALE, FOCUS[1] - EYES[1] * SCALE

# winking eye (the subject's left), portrait px
PATCH = (612, 300, 760, 452)            # x0, y0, x1, y1 of the stored patch
BLEND = ((686, 380), (60, 56))          # elliptical blend: centre, radii
LID = (366, 392)                        # open upper lid -> closed lash line (y)
LID_X = (644, 732)                      # eye extent (x)
# measured shifts (dx, dy) that move the wink photo onto the normal one, around the eye
WARP_PTS = [((620, 395), (-2, -2)), ((640, 440), (-4, 0)), ((760, 450), (-1, 2)), ((790, 380), (0, 0)),
            ((770, 320), (-1, -1)), ((700, 290), (0, -3)), ((630, 320), (-2, -4)), ((600, 360), (-2, 0))]


def load(path):
    return np.asarray(Image.open(path).convert("RGB"))[:ROWS].astype(np.float32)


def matte(img):
    """SAM silhouette -> trimap (wide band through the hair) -> ViTMatte alpha."""
    pil = Image.fromarray(img.astype(np.uint8))
    proc = SamImageProcessor.from_pretrained("facebook/sam-vit-base")
    sam = SamModel.from_pretrained("facebook/sam-vit-base").eval()
    inp = proc(pil, return_tensors="pt")
    k = inp["reshaped_input_sizes"][0][0].item() / inp["original_sizes"][0][0].item()
    box = torch.tensor([[[0, 60 * k, 1141 * k, 986 * k]]], dtype=torch.float32)
    pts = torch.tensor([[[[600, 450], [580, 200], [450, 850], [950, 880], [100, 500], [1000, 300]]]], dtype=torch.float32) * k
    lbl = torch.tensor([[[1, 1, 1, 1, 0, 0]]])
    with torch.no_grad():
        out = sam(pixel_values=inp["pixel_values"], input_boxes=box, input_points=pts, input_labels=lbl)
    masks = proc.post_process_masks(out.pred_masks, inp["original_sizes"], inp["reshaped_input_sizes"])[0][0]
    m = masks[1].numpy()  # the whole-person proposal

    H, W = m.shape
    yy = np.mgrid[0:H, 0:W][0]
    wide = binary_dilation(m, iterations=34) & ~binary_erosion(m, iterations=22)
    thin = binary_dilation(m, iterations=10) & ~binary_erosion(m, iterations=8)
    tri = np.where(m, 255, 0).astype(np.uint8)
    tri[np.where(yy < 640, wide, thin)] = 128
    tri[985:] = np.where(m[985:], 255, 0)

    vproc = VitMatteImageProcessor.from_pretrained("hustvl/vitmatte-base-composition-1k")
    vm = VitMatteForImageMatting.from_pretrained("hustvl/vitmatte-base-composition-1k").eval()
    inp = vproc(images=pil, trimaps=Image.fromarray(tri), return_tensors="pt")
    with torch.no_grad():
        a = vm(**inp).alphas[0, 0].numpy()[:H, :W]
    return a.clip(0, 1)


def diffuse_fill(im, mask):
    """Coarse-to-fine Jacobi fill of masked pixels from their surroundings (as in clean_plate.py)."""
    H, W = mask.shape
    guess = None
    for s in (32, 16, 8, 4, 2, 1):
        w, h = W // s, H // s
        small = np.asarray(Image.fromarray(im.clip(0, 255).astype(np.uint8)).resize((w, h), Image.BOX)).astype(np.float32)
        msk = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((w, h), Image.BOX)) > 0
        if guess is not None:
            up = np.asarray(Image.fromarray(guess.clip(0, 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)).astype(np.float32)
            small[msk] = up[msk]
        a = small
        for _ in range(220 if s > 1 else 120):
            p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
            avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
            a[msk] = avg[msk]
        guess = a
    out = im.copy()
    out[mask] = guess[mask]
    return out


def background():
    """The current hero plate without the visor character, its halo ring and the orbit lines."""
    img = Image.open("public/hero/hero-plate.webp").convert("RGB")
    W, H = img.size
    im = np.asarray(img).astype(np.float32)
    depth = np.asarray(Image.open("public/hero/hero-depth.png").resize((W, H), Image.BILINEAR)) / 255.0
    lum = im @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    hp = lum - gaussian_filter(lum, 8)
    yy, xx = np.mgrid[0:H, 0:W]

    figure = binary_dilation(depth > 0.12, iterations=18)
    ring = np.abs(np.hypot(xx - 667.4, yy - 699.3) - 437.2) < 58  # the stroke and its glow
    # orbit ellipse + its faint back half: thin bright strokes inside these boxes
    lines = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in [(0, 820, 310, 960), (840, 515, 1262, 800), (170, 480, 490, 680), (960, 400, 1080, 520)]:
        lines[y0:y1, x0:x1] = True
    # HUD marks that stay: crosses, bracket, short rules, stripes
    for x0, y0, x1, y1 in [(40, 570, 92, 622), (290, 628, 325, 708), (50, 630, 72, 705), (1270, 610, 1326, 666),
                           (1280, 780, 1316, 798), (1176, 440, 1198, 530)]:
        lines[y0:y1, x0:x1] = False
    lines &= hp > 6
    lines = binary_dilation(lines, iterations=14)

    mask = figure | ring | lines
    out = diffuse_fill(im, mask)
    grain = np.random.default_rng(7).normal(0, 2.4, (H, W, 1)).astype(np.float32)
    out[mask] += grain[mask]

    # the old figure's lower half filled in light; the plate's bottom edge should fall to black
    out *= (1 - 0.8 * np.clip((yy - 880) / 260.0, 0, 1) ** 1.5)[..., None]

    # a soft cool backlight where the photo's light source sat (behind the subject's left shoulder)
    g = np.exp(-(((xx - 1040) / 360.0) ** 2 + ((yy - 470) / 420.0) ** 2))
    out += g[..., None] * np.array([10, 20, 42], np.float32)
    return out, mask


def grade(im):
    """Gentle: calm the over-saturated blue rim and lift nothing else. Skin is left as photographed."""
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    blue = np.clip((b - np.maximum(r, g)) / 120.0, 0, 1)          # how strongly blue a pixel is
    lum = (im @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
    out = im + (lum - im) * (0.22 * blue[..., None])               # -22% saturation on the blue light only
    return out


def to_plate(arr, size):
    """Resample portrait-space array into plate space (bicubic)."""
    H, W = size
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx, sy = (xx - X0) / SCALE, (yy - Y0) / SCALE
    if arr.ndim == 2:
        return map_coordinates(arr, [sy, sx], order=3, mode="constant", cval=0)
    return np.stack([map_coordinates(arr[..., c], [sy, sx], order=3, mode="nearest") for c in range(arr.shape[2])], -1)


def wink_patch(normal, wink):
    x0, y0, x1, y1 = PATCH
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    # inverse-distance-weighted displacement from the measured shifts
    num = np.zeros((2,) + xx.shape, np.float32)
    den = np.zeros(xx.shape, np.float32)
    for (px, py), (dx, dy) in WARP_PTS:
        w = 1.0 / (np.hypot(xx - px, yy - py) ** 2 + 25.0)
        num[0] += w * dx
        num[1] += w * dy
        den += w
    dx, dy = num[0] / den, num[1] / den
    warped = np.stack([map_coordinates(wink[..., c], [yy - dy, xx - dx], order=3, mode="nearest") for c in range(3)], -1)
    (cx, cy), (rx, ry) = BLEND
    e = np.hypot((xx - cx) / rx, (yy - cy) / ry)
    alpha = 1 - np.clip((e - 0.55) / 0.45, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    print("patch residual vs normal (outside blend core):",
          float(np.abs(warped - normal[y0:y1, x0:x1])[(e > 0.8) & (e < 1)].mean()))
    return warped, alpha


def main():
    normal, wink = load("art/portrait-normal.webp"), load("art/portrait-wink.webp")
    alpha = matte(normal)

    # decontaminate the hair edge: remove the photo's own background (the bright blue slab) from semi-transparent pixels
    bg_mask = alpha < 0.03
    B = normal.copy()
    B[~bg_mask] = 0
    wsum = gaussian_filter(bg_mask.astype(np.float32), 18)[..., None]
    B = np.stack([gaussian_filter(B[..., c], 18) for c in range(3)], -1) / np.maximum(wsum, 1e-3)
    F = np.clip(B + (normal - B) / np.maximum(alpha, 0.3)[..., None], 0, 255)
    F = np.where(alpha[..., None] > 0.97, normal, F)

    # the photo's bottom edge: fade the jacket out into the (dark) backdrop
    rows = np.arange(ROWS, dtype=np.float32)
    alpha = alpha * np.clip((982 - rows) / 60.0, 0, 1)[:, None]

    bg, filled = background()
    H, W = bg.shape[:2]
    Fp = to_plate(grade(F), (H, W))
    Ap = to_plate(alpha, (H, W)).clip(0, 1)[..., None]
    plate = Fp * Ap + bg * (1 - Ap)

    # film grain over the photo so its skin reads as photographed, not airbrushed (luminance only)
    grain = gaussian_filter(np.random.default_rng(11).normal(0, 1, (H, W)).astype(np.float32), 0.6) * 4.0
    plate += grain[..., None] * Ap
    Image.fromarray(plate.clip(0, 255).astype(np.uint8)).save("public/hero/portrait-plate.webp", quality=90, method=6)

    # wink patch, in plate px; it carries the same grade + grain so both states match exactly
    wp, wa = wink_patch(normal, wink)
    x0, y0, x1, y1 = PATCH
    px0, py0 = int(np.floor(X0 + x0 * SCALE)), int(np.floor(Y0 + y0 * SCALE))
    px1, py1 = int(np.ceil(X0 + x1 * SCALE)), int(np.ceil(Y0 + y1 * SCALE))
    full = grade(normal.copy())
    full[y0:y1, x0:x1] = grade(wp)
    amask = np.zeros(normal.shape[:2], np.float32)
    amask[y0:y1, x0:x1] = wa
    wpl = to_plate(full, (H, W))[py0:py1, px0:px1] + grain[py0:py1, px0:px1, None]
    wal = to_plate(amask, (H, W))[py0:py1, px0:px1].clip(0, 1)
    rgba = np.dstack([wpl.clip(0, 255), wal * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save("public/hero/portrait-wink.webp", quality=92, method=6, exact=True)

    # depth: Depth-Anything on the composite, background pinned flat so the figure mask is exact
    pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
    pil = Image.fromarray(plate.clip(0, 255).astype(np.uint8))
    d = np.asarray(pipe(pil)["depth"].resize(pil.size, Image.BICUBIC)).astype(np.float32)
    a2 = Ap[..., 0]
    inside = d[a2 > 0.9]
    lo, hi = np.percentile(inside, 2), np.percentile(inside, 99.5)
    df = 0.3 + 0.6 * np.clip((d - lo) / (hi - lo), 0, 1)
    depth = 0.05 * (1 - a2) + df * a2
    dimg = Image.fromarray((depth * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    dimg.resize((W // 2, H // 2), Image.LANCZOS).save("public/hero/portrait-depth.png", optimize=True)

    def uv(x, y):
        return round((X0 + x * SCALE) / W, 4), round((Y0 + y * SCALE) / H, 4)

    print(f"plate {W}x{H}; filled px {int(filled.sum())}")
    print("focus (eyes)", uv(*EYES))
    print("wink rect px", (px0, py0, px1 - px0, py1 - py0))
    print("lid top/bottom y uv", uv(0, LID[0])[1], uv(0, LID[1])[1], "lid x uv", uv(LID_X[0], 0)[0], uv(LID_X[1], 0)[0])


if __name__ == "__main__":
    main()
