import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter()

DATA_DIR = Path("data")
GUIDELINES_PATH = DATA_DIR / "guidelines.json"

DEFAULT_GUIDELINES = {
    "brand_name": "",
    "guidelines": "",
    "negative_prompt": "",
    "apply_to_image": True,
    "apply_to_video": False,
}


class GuidelinesPayload(BaseModel):
    brand_name: str = ""
    guidelines: str = ""
    negative_prompt: str = ""
    apply_to_image: bool = True
    apply_to_video: bool = False


def _ensure_guidelines_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not GUIDELINES_PATH.exists():
        GUIDELINES_PATH.write_text(json.dumps(DEFAULT_GUIDELINES, indent=2), encoding="utf-8")


def read_guidelines() -> dict:
    _ensure_guidelines_file()
    try:
        with GUIDELINES_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Guidelines file contains invalid JSON") from exc

    return {**DEFAULT_GUIDELINES, **data}


def write_guidelines(payload: GuidelinesPayload) -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data = payload.model_dump()
    GUIDELINES_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


@router.get("", response_model=GuidelinesPayload)
@router.get("/", response_model=GuidelinesPayload, include_in_schema=False)
async def get_guidelines():
    return read_guidelines()


@router.post("", response_model=GuidelinesPayload)
@router.post("/", response_model=GuidelinesPayload, include_in_schema=False)
async def save_guidelines(payload: GuidelinesPayload):
    return write_guidelines(payload)
