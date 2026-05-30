"""Procesa los logos de marca a PNG con fondo transparente.

Genera, en public/:
  - logo-icon.png / pwa-512.png / pwa-192.png  (icono cuadrado redondeado)
  - logo-horizontal-light.png  (texto claro, para fondos oscuros)
  - logo-horizontal-dark.png   (texto oscuro, para fondos claros)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PUBLIC = Path(__file__).parent / "public"


def _content_bbox(rgb: np.ndarray) -> tuple[int, int, int, int]:
    """Bbox del cuadrado azul: pixeles saturados u oscuros (excluye blanco y sombra gris)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(axis=-1), rgb.min(axis=-1)
    saturation = np.where(mx == 0, 0, (mx - mn) / np.maximum(mx, 1))
    value = mx / 255.0
    is_content = (saturation > 0.18) | (value < 0.82)
    ys, xs = np.where(is_content)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def _rounded_mask(size: int, radius_ratio: float = 0.225) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = int(size * radius_ratio)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def build_icon() -> Image.Image:
    src = Image.open(PUBLIC / "logo_app.png").convert("RGB")
    arr = np.asarray(src)
    x0, y0, x1, y1 = _content_bbox(arr)

    # Forzar recorte cuadrado centrado en el contenido detectado.
    w, h = x1 - x0, y1 - y0
    side = max(w, h)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    half = side // 2
    left, top = max(cx - half, 0), max(cy - half, 0)
    crop = src.crop((left, top, left + side, top + side)).convert("RGBA")

    crop.putalpha(_rounded_mask(crop.size[0]))
    return crop


def _alpha_from_distance(arr: np.ndarray, color: np.ndarray,
                         soft: float, hard: float) -> np.ndarray:
    dist = np.sqrt(((arr[..., :3] - color) ** 2).sum(axis=-1))
    return np.clip((dist - soft) / (hard - soft), 0.0, 1.0) * 255.0


def remove_white(filename: str, soft: float = 30.0, hard: float = 75.0) -> Image.Image:
    """Fondo claro -> transparente. Para logos con foreground oscuro sobre blanco."""
    img = Image.open(PUBLIC / filename).convert("RGBA")
    arr = np.asarray(img).astype(np.float32)
    arr[..., 3] = _alpha_from_distance(arr, np.array([255, 255, 255]), soft, hard)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def remove_canvas_and_box(filename: str) -> Image.Image:
    """Logo con texto claro dentro de caja navy sobre lienzo blanco.

    1) Flood-fill del blanco exterior desde las esquinas (protege texto blanco interior).
    2) Eliminacion global del navy de la caja (el foreground claro no es navy).
    Deja solo el texto/icono claro sobre transparente.
    """
    img = Image.open(PUBLIC / filename).convert("RGBA")
    w, h = img.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for seed in seeds:
        ImageDraw.floodfill(img, seed, (0, 0, 0, 0), thresh=60)

    arr = np.asarray(img).astype(np.float32)
    navy = np.array([2, 13, 37])
    box_alpha = _alpha_from_distance(arr, navy, 35.0, 90.0)
    arr[..., 3] = np.minimum(arr[..., 3], box_alpha)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def _trim(img: Image.Image, pad: int = 12) -> Image.Image:
    """Recorta el alpha transparente sobrante, dejando un pequeno margen."""
    alpha = np.asarray(img)[..., 3]
    ys, xs = np.where(alpha > 8)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    x0, y0 = max(x0 - pad, 0), max(y0 - pad, 0)
    x1, y1 = min(x1 + pad, img.width), min(y1 + pad, img.height)
    return img.crop((x0, y0, x1, y1))


def main() -> None:
    icon = build_icon()
    icon.resize((512, 512), Image.LANCZOS).save(PUBLIC / "logo-icon.png")
    icon.resize((512, 512), Image.LANCZOS).save(PUBLIC / "pwa-512.png")
    icon.resize((192, 192), Image.LANCZOS).save(PUBLIC / "pwa-192.png")
    print(f"icono: crop {icon.size} -> logo-icon.png, pwa-512.png, pwa-192.png")

    light = _trim(remove_canvas_and_box("logo_horizontal_azul.png"))
    light.save(PUBLIC / "logo-horizontal-light.png")
    print(f"horizontal claro: {light.size} -> logo-horizontal-light.png")

    dark = _trim(remove_white("logo_horizontal_blanco.png"))
    dark.save(PUBLIC / "logo-horizontal-dark.png")
    print(f"horizontal oscuro: {dark.size} -> logo-horizontal-dark.png")


if __name__ == "__main__":
    main()
