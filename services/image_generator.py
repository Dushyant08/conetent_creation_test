import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
from rembg import remove, new_session
from services import ai_pipeline

OUTPUT_DIR = Path("outputs")
BASE_DIR   = OUTPUT_DIR / "base"
EDITS_DIR  = OUTPUT_DIR / "edits"

for _d in (OUTPUT_DIR, BASE_DIR, EDITS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

RESOLUTION_MAP = {
    "Instagram": (3840, 3840),
    "WhatsApp":  (2160, 3840),
    "Facebook":  (3840, 2880),
    "Poster":    (2880, 3840),
}

rembg_session = new_session("u2net")


class GenerationResult:
    def __init__(self, filename: str, url: str, prompt: str, base_filename: str = ""):
        self.filename      = filename
        self.url           = url
        self.prompt        = prompt
        self.base_filename = base_filename


def find_color_asset(color_id: str, bike_id: str):
    segments_dir = Path("assets/segments")
    if not segments_dir.exists():
        return None
    for seg in sorted(segments_dir.iterdir()):
        if not seg.is_dir():
            continue
        colors_dir = seg / bike_id / "colors"
        if colors_dir.exists():
            for f in colors_dir.iterdir():
                if f.stem.lower() == color_id.lower():
                    return f
    return None


def _get_font(size: int) -> ImageFont.FreeTypeFont:
    for path in (Path("C:/Windows/Fonts/Nirmala.ttf"), Path("C:/Windows/Fonts/arial.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    try:
        return ImageFont.truetype("Arial.ttf", size)
    except Exception:
        return ImageFont.load_default(size=size)


def _fit_font_for_width(draw, text: str, ideal_size: int, max_w: int) -> ImageFont.FreeTypeFont:
    size  = ideal_size
    floor = max(ideal_size // 2, 18)
    while size > floor:
        font = _get_font(size)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= max_w:
            return font
        size -= 2
    return _get_font(floor)


def _composite_rect(canvas: Image.Image, box, fill) -> Image.Image:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle(box, fill=fill)
    return Image.alpha_composite(canvas, layer)


def _apply_text_layers(
    canvas: Image.Image,
    campaign_header: str,   # reserved, not rendered
    offers: list,
    dealer_address: str,
    target_width: int,
    target_height: int,
    paste_y: int,
    ground_y=None,
) -> Image.Image:
    if ground_y is None:
        ground_y = int(target_height * 0.80)

    # ── Dealer Address footer ──────────────────────────────────────────────────
    footer_h = int(target_height * 0.075)
    footer_y = target_height - footer_h

    if dealer_address.strip():
        canvas = _composite_rect(canvas,
                                  [(0, footer_y), (target_width, target_height)],
                                  (8, 8, 8, 235))
        canvas = _composite_rect(canvas,
                                  [(0, footer_y),
                                   (target_width, footer_y + max(5, int(target_height * 0.003)))],
                                  (192, 21, 15, 230))
        draw     = ImageDraw.Draw(canvas)
        fnt_addr = _fit_font_for_width(
            draw, dealer_address.strip(),
            int(target_height * 0.025),
            target_width - int(target_width * 0.06),
        )
        draw.text(
            (target_width // 2, footer_y + footer_h // 2),
            dealer_address.strip(),
            fill=(225, 225, 225),
            font=fnt_addr,
            anchor="mm",
        )

    # ── Offer ribbons — 3-D light yellow with white text ──────────────────────
    active = [o.strip() for o in offers if o.strip()]
    if not active:
        return canvas

    n             = len(active)
    h_margin      = int(target_width * 0.05)
    ribbon_w      = target_width - 2 * h_margin
    ribbon_gap    = int(target_height * 0.012)
    bike_gap      = int(target_height * 0.022)
    min_top_clear = int(target_height * 0.08)

    available = paste_y - bike_gap - min_top_clear - (n - 1) * ribbon_gap
    ribbon_h  = min(available // n, int(target_height * 0.090))
    ribbon_h  = max(ribbon_h, int(target_height * 0.045))
    ribbon_r  = ribbon_h // 2

    total_h   = n * ribbon_h + (n - 1) * ribbon_gap
    stack_top = paste_y - bike_gap - total_h
    stack_top = max(stack_top, min_top_clear)

    ideal_font = int(ribbon_h * 0.48)

    for i, txt in enumerate(active):
        r_y1 = stack_top + i * (ribbon_h + ribbon_gap)
        r_y2 = r_y1 + ribbon_h
        cx   = target_width // 2
        cy   = r_y1 + ribbon_h // 2
        sd   = max(int(ribbon_h * 0.08), 4)   # shadow offset & blur scale

        # 1. Drop shadow
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [(h_margin + sd, r_y1 + sd), (h_margin + ribbon_w + sd, r_y2 + sd)],
            radius=ribbon_r, fill=(0, 0, 0, 90),
        )
        sh     = sh.filter(ImageFilter.GaussianBlur(sd * 2))
        canvas = Image.alpha_composite(canvas, sh)

        # 2. Base ribbon — light yellow
        base = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(base).rounded_rectangle(
            [(h_margin, r_y1), (h_margin + ribbon_w, r_y2)],
            radius=ribbon_r, fill=(255, 235, 60, 240),
        )
        canvas = Image.alpha_composite(canvas, base)

        # 3. Top bevel highlight
        hi = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(hi).rounded_rectangle(
            [(h_margin, r_y1), (h_margin + ribbon_w, r_y1 + ribbon_h // 2)],
            radius=ribbon_r, fill=(255, 255, 220, 80),
        )
        canvas = Image.alpha_composite(canvas, hi)

        # 4. Bottom bevel shadow
        bv = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(bv).rounded_rectangle(
            [(h_margin, r_y2 - ribbon_h // 3), (h_margin + ribbon_w, r_y2)],
            radius=ribbon_r, fill=(0, 0, 0, 45),
        )
        canvas = Image.alpha_composite(canvas, bv)

        # 5. White text with drop shadow
        draw    = ImageDraw.Draw(canvas)
        inner_w = ribbon_w - int(ribbon_w * 0.06)
        fnt     = _fit_font_for_width(draw, txt, ideal_font, inner_w)
        draw.text((cx + 2, cy + 2), txt, fill=(0, 0, 0),         font=fnt, anchor="mm")
        draw.text((cx,     cy    ), txt, fill=(255, 255, 255),    font=fnt, anchor="mm")

    return canvas


async def generate_image(
    bike_id: str, bike_name: str, color_id: str, color_name: str,
    festival: str, campaign_header: str,
    offers: list, dealer_address: str, platform_name: str,
    platform_width: int, platform_height: int, filename: str,
) -> GenerationResult:

    print("\n[AI ENGINE] Starting AI poster pipeline …")

    bike_path = find_color_asset(color_id, bike_id)
    if not bike_path:
        raise FileNotFoundError(f"Bike color asset not found: {bike_id} / {color_id}")

    target_width, target_height = RESOLUTION_MAP.get(platform_name, (3840, 3840))

    # ── Step 1: Gemini brief ──────────────────────────────────────────────────
    print("[AI ENGINE] Generating poster brief with Gemini 2.5 Flash …")
    brief = await ai_pipeline.generate_brief(bike_name or bike_id, festival, platform_name)
    print(f"[AI ENGINE] Brief: {brief[:140]} …")

    # ── Step 2: Imagen background ─────────────────────────────────────────────
    print("[AI ENGINE] Generating background with Imagen 4 / 3 …")
    canvas_bg = await ai_pipeline.generate_background(
        brief, platform_name, target_width, target_height
    )

    # ── Step 3: Bike background removal ───────────────────────────────────────
    print("[AI ENGINE] Isolating bike asset via rembg …")
    with Image.open(bike_path) as raw_bike:
        clean_bike = remove(raw_bike, session=rembg_session)
    tight = clean_bike.getbbox()
    if tight:
        clean_bike = clean_bike.crop(tight)

    # ── Step 4: Bike sizing & placement ───────────────────────────────────────
    bike_w      = int(target_width * 0.38)
    scale_ratio = bike_w / clean_bike.width
    bike_h      = int(clean_bike.height * scale_ratio)
    bike_scaled = clean_bike.resize((bike_w, bike_h), Image.Resampling.LANCZOS)

    ground_y = int(target_height * 0.82)
    paste_x  = (target_width - bike_w) // 2
    paste_y  = ground_y - bike_h

    # ── Step 5: Shadow system ─────────────────────────────────────────────────
    shadow_cx = paste_x + bike_w // 2

    def _ellipse_shadow(w, h, cx, blur, alpha):
        img = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
        ImageDraw.Draw(img).ellipse(
            [cx - w // 2, ground_y - h // 2,
             cx + w // 2, ground_y + h // 2],
            fill=(0, 0, 0, alpha),
        )
        return img.filter(ImageFilter.GaussianBlur(blur))

    mega = _ellipse_shadow(
        int(bike_w * 1.30), int(bike_h * 0.16),
        shadow_cx, max(int(bike_w * 0.18), 55), 80,
    )

    sil_h   = max(int(bike_h * 0.26), 40)
    squish  = bike_scaled.getchannel("A").resize((bike_w, sil_h), Image.Resampling.LANCZOS)
    sil_img = Image.new("RGBA", (bike_w, sil_h), (0, 0, 0, 210))
    sil_img.putalpha(squish)
    sil_img = sil_img.filter(ImageFilter.GaussianBlur(max(int(bike_w * 0.018), 12)))
    silhouette = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    silhouette.paste(sil_img, (paste_x, ground_y - sil_h // 2), mask=sil_img)

    front_cx = paste_x + int(bike_w * 0.22)
    front    = _ellipse_shadow(
        int(bike_w * 0.17), int(bike_h * 0.038),
        front_cx, max(int(bike_w * 0.018), 7), 245,
    )

    rear_cx = paste_x + int(bike_w * 0.72)
    rear    = _ellipse_shadow(
        int(bike_w * 0.19), int(bike_h * 0.038),
        rear_cx, max(int(bike_w * 0.018), 7), 245,
    )

    shadow_canvas    = Image.alpha_composite(mega, silhouette)
    shadow_canvas    = Image.alpha_composite(shadow_canvas, front)
    shadow_canvas    = Image.alpha_composite(shadow_canvas, rear)
    composite_canvas = Image.alpha_composite(canvas_bg, shadow_canvas)

    # ── Step 6: Paste bike ────────────────────────────────────────────────────
    composite_canvas.paste(bike_scaled, (paste_x, paste_y), mask=bike_scaled)

    # ── Step 7: Reflection ────────────────────────────────────────────────────
    reflection = bike_scaled.copy().transpose(Image.FLIP_TOP_BOTTOM)
    reflection = reflection.filter(ImageFilter.GaussianBlur(1))
    r_w, r_h   = reflection.size
    grad       = Image.new("L", (r_w, r_h), 0)
    draw_g     = ImageDraw.Draw(grad)
    for y in range(r_h):
        a = int(75 * max(0.0, 1.0 - y / r_h))
        draw_g.line([(0, y), (r_w - 1, y)], fill=a)
    combined = ImageChops.multiply(reflection.getchannel("A"), grad)
    composite_canvas.paste(reflection, (paste_x, ground_y), mask=combined)

    # ── Step 8: Logos ─────────────────────────────────────────────────────────
    hero_logo_path = Path("assets/hero-logo.png")
    if hero_logo_path.exists():
        with Image.open(hero_logo_path) as hero_logo:
            lw = int(target_width * 0.12)
            lh = int(hero_logo.height * lw / hero_logo.width)
            ls = hero_logo.resize((lw, lh), Image.Resampling.LANCZOS).convert("RGBA")
            composite_canvas.paste(ls,
                                   (int(target_width * 0.04), int(target_height * 0.04)),
                                   mask=ls)

    segments_dir = Path("assets/segments")
    for seg in sorted(segments_dir.iterdir()):
        if seg.is_dir():
            bike_logo_path = seg / bike_id / "bike-logo.png"
            if bike_logo_path.exists():
                with Image.open(bike_logo_path) as bike_logo:
                    bw = int(target_width * 0.13)
                    bh = int(bike_logo.height * bw / bike_logo.width)
                    bs = bike_logo.resize((bw, bh), Image.Resampling.LANCZOS).convert("RGBA")
                    composite_canvas.paste(bs,
                                           (target_width - bw - int(target_width * 0.04),
                                            int(target_height * 0.04)),
                                           mask=bs)
                break

    # ── Save base canvas (no text) ─────────────────────────────────────────────
    stem          = Path(filename).stem
    base_filename = f"{stem}.png"
    composite_canvas.save(str(BASE_DIR / base_filename), format="PNG")
    (BASE_DIR / f"{stem}.json").write_text(json.dumps({
        "target_width":  target_width,
        "target_height": target_height,
        "paste_y":       paste_y,
        "ground_y":      ground_y,
    }))

    # ── Apply text overlays ────────────────────────────────────────────────────
    poster_canvas = composite_canvas.copy()
    poster_canvas = _apply_text_layers(
        poster_canvas, campaign_header, offers, dealer_address,
        target_width, target_height, paste_y, ground_y,
    )

    out_path = OUTPUT_DIR / filename
    poster_canvas.convert("RGB").save(str(out_path), format="JPEG", quality=95, subsampling=0)
    print(f"[AI ENGINE] Poster saved: {out_path}  |  base: {BASE_DIR / base_filename}")

    return GenerationResult(
        filename=filename,
        url=f"/outputs/{filename}",
        prompt=brief,
        base_filename=base_filename,
    )


async def edit_image_text(
    base_filename: str,
    campaign_header: str,
    offers: list,
    dealer_address: str,
) -> GenerationResult:
    base_path    = BASE_DIR / base_filename
    sidecar_path = BASE_DIR / (Path(base_filename).stem + ".json")

    if not base_path.exists():
        raise FileNotFoundError(f"Base image not found: {base_filename}")
    if not sidecar_path.exists():
        raise FileNotFoundError(f"Layout metadata not found for: {base_filename}")

    with Image.open(base_path) as img:
        canvas = img.copy().convert("RGBA")

    meta          = json.loads(sidecar_path.read_text())
    target_width  = meta["target_width"]
    target_height = meta["target_height"]
    paste_y       = meta["paste_y"]
    ground_y      = meta.get("ground_y", int(target_height * 0.80))

    canvas = _apply_text_layers(
        canvas, campaign_header, offers, dealer_address,
        target_width, target_height, paste_y, ground_y,
    )

    edit_filename = f"{Path(base_filename).stem}_edit.jpeg"
    out_path      = EDITS_DIR / edit_filename
    canvas.convert("RGB").save(str(out_path), format="JPEG", quality=95, subsampling=0)
    print(f"[AI ENGINE] Edited poster saved: {out_path}")

    return GenerationResult(
        filename=edit_filename,
        url=f"/outputs/edits/{edit_filename}",
        prompt="Text-layer edit.",
    )
