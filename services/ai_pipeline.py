import io
import os
from pathlib import Path
from PIL import Image
from google import genai
from google.genai import types


_ASPECT_MAP = {
    "Instagram": "1:1",
    "WhatsApp":  "9:16",
    "Facebook":  "4:3",
    "Poster":    "3:4",
}

_FESTIVAL_CUES = {
    "Diwali":           "warm glowing diyas and oil lamps, colourful string lights, distant fireworks, marigold garlands, rangoli patterns on the ground, rich amber and gold tones, festive evening atmosphere",
    "Holi":             "vibrant clouds of coloured powder in magenta pink blue yellow green, joyful festival atmosphere, bright natural daylight, colourful confetti and flower petals",
    "Dhanteras":        "golden marigold flower garlands, clay oil lamps, gleaming gold coins and jewellery, auspicious red and gold textiles, warm amber evening glow, prosperity symbolism",
    "Independence Day": "Indian tricolour saffron white green flag motifs, confetti in orange white green, dramatic blue sky with clouds, proud patriotic atmosphere, kite flying in background",
    "Lohri":            "crackling open bonfire with orange red sparks flying upward, winter night sky, folk harvest festival atmosphere, sesame seeds and sugarcane, warm fire glow on dark background",
    "IPL":              "packed cricket stadium with floodlights blazing, crowd waving team colours, electric blue and green neon glow, sports energy, dramatic night sky, celebration confetti",
}

_MIME_MAP = {
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def _get_client():
    project  = os.getenv("GOOGLE_CLOUD_PROJECT",  "").strip()
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT not set in .env")
    return genai.Client(vertexai=True, project=project, location=location)


async def generate_brief(
    bike_model: str,
    festival: str,
    platform_name: str,
    bike_image_path,          # Path | str — actual bike photo for Vision analysis
) -> str:
    client    = _get_client()
    cues      = _FESTIVAL_CUES.get(festival, festival)
    bike_path = Path(bike_image_path)
    mime_type = _MIME_MAP.get(bike_path.suffix.lower(), "image/png")

    print("[AI PIPELINE] Reading bike image for Gemini Vision analysis …")
    with open(bike_path, "rb") as f:
        image_bytes = f.read()

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    text_part  = types.Part.from_text(text=(
        f"You are a creative director at a premium automotive marketing agency.\n\n"
        f"Step 1 — Study this motorcycle image carefully:\n"
        f"  • Note its EXACT primary and secondary colours\n"
        f"  • Identify its style: sporty / commuter / scooter / adventure / premium\n"
        f"  • Capture its energy and visual personality\n\n"
        f"Step 2 — Write a vivid photorealistic BACKGROUND scene description for "
        f"an AI image generator (Imagen 4). This scene sits BEHIND this exact bike "
        f"in a Hero MotoCorp {festival} marketing poster for {platform_name}.\n\n"
        f"Festival atmosphere cues: {cues}\n\n"
        f"Scene requirements:\n"
        f"  • Color-match the scene's lighting and tones to COMPLEMENT the bike's "
        f"actual colours you observed\n"
        f"  • Match the scene energy to the bike's style and personality\n"
        f"  • Rich {festival} festival atmosphere\n"
        f"  • Clear flat visible ground surface (road / floor) where the bike will stand\n"
        f"  • NO motorcycles, NO vehicles, NO people, NO text, NO logos\n"
        f"  • Photorealistic 8K commercial advertising photography style\n"
        f"  • Cinematic depth of field, dramatic professional lighting\n\n"
        f"Output: ONLY the Imagen scene prompt text (130-160 words). "
        f"No headings, no explanation, no quotes."
    ))

    print("[AI PIPELINE] Sending bike image + festival brief to Gemini 2.5 Flash Vision …")
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, text_part],
    )
    brief = response.text.strip()
    print(f"[AI PIPELINE] Vision brief ready ({len(brief.split())} words)")
    return brief


async def generate_background(
    brief: str, platform_name: str, target_width: int, target_height: int
) -> Image.Image:
    client       = _get_client()
    aspect_ratio = _ASPECT_MAP.get(platform_name, "1:1")

    for model_id in (
        "imagen-4.0-generate-preview-06-06",
        "imagen-3.0-generate-001",
    ):
        try:
            print(f"[AI PIPELINE] Trying {model_id} …")
            response = client.models.generate_images(
                model=model_id,
                prompt=brief,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=aspect_ratio,
                ),
            )
            img_bytes = response.generated_images[0].image.image_bytes
            img = Image.open(io.BytesIO(img_bytes))
            print(f"[AI PIPELINE] Background generated with {model_id}")
            return img.resize((target_width, target_height), Image.Resampling.LANCZOS).convert("RGBA")
        except Exception as exc:
            print(f"[AI PIPELINE] {model_id} failed: {exc}")

    raise RuntimeError(
        "All Imagen models failed — check Vertex AI access, billing, and model availability in your region."
    )
