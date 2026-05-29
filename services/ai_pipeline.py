import io
import os
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


def _get_client():
    project  = os.getenv("GOOGLE_CLOUD_PROJECT",  "").strip()
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT not set in .env")
    return genai.Client(vertexai=True, project=project, location=location)


async def generate_brief(bike_model: str, festival: str, platform_name: str) -> str:
    client = _get_client()
    cues   = _FESTIVAL_CUES.get(festival, festival)

    prompt = (
        f"You are a creative director at a premium automotive marketing agency. "
        f"Write a vivid photorealistic scene description for an AI image generation model.\n\n"
        f"Purpose: Background image for a Hero MotoCorp {bike_model} promotional poster.\n"
        f"Festival/Campaign: {festival}\n"
        f"Atmosphere: {cues}\n"
        f"Platform format: {platform_name}\n\n"
        f"Hard rules:\n"
        f"- NO motorcycles, NO vehicles, NO people, NO text, NO logos\n"
        f"- Must have a clear, flat, visible ground surface (road, floor, or ground)\n"
        f"- Photorealistic, high-end commercial advertising photography style\n"
        f"- 8K resolution, dramatic professional lighting, cinematic depth of field\n\n"
        f"Output: ONLY the image generation prompt text (120-160 words). "
        f"No headings, no explanation, no quotes."
    )

    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    return response.text.strip()


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
