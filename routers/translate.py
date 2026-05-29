from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
import os

router = APIRouter()

class TranslateRequest(BaseModel):
    text: str
    language: str

class TranslateResponse(BaseModel):
    translated: str

@router.post("/", response_model=TranslateResponse)
async def translate_text(req: TranslateRequest):
    if not req.text.strip() or req.language == "English":
        return TranslateResponse(translated=req.text)

    project = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()

    if not project:
        raise HTTPException(status_code=503, detail="GOOGLE_CLOUD_PROJECT not set in .env")

    prompt = (
        f"Translate the following short marketing hook banner to {req.language}. "
        f"Keep numbers, percentages, and brand names as-is. "
        f"Return ONLY the translated text — no quotes, no explanation, no formatting.\n\n"
        f"{req.text}"
    )

    try:
        print("[DEBUG] Initializing Vertex AI Implicit Client Client...")
        # Letting vertexai=True pull your escaped path directly from the background OS environment
        client = genai.Client(vertexai=True, project=project, location=location)

        print("[DEBUG] Dispatched text payload to Gemini...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        
        if not response or not response.text:
            raise ValueError("Empty generation response yielded by Vertex AI backend.")

        result = response.text.strip()
        print(f"[DEBUG] Translation complete: {result}")
        return TranslateResponse(translated=result)

    except Exception as e:
        print("\n" + "="*50)
        print("🚨 DIAGNOSTIC VERTEX AI SYSTEM LOG 🚨")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        print("="*50 + "\n")
        
        raise HTTPException(status_code=502, detail=f"Vertex AI request failed: {str(e)}")