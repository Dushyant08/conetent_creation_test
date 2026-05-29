from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import re
import traceback

from services.image_generator import generate_image


def _build_filename(bike_name: str, color_name: str, festival: str) -> str:
    def clean(s: str) -> str:
        return re.sub(r'[<>:"/\\|?*\s]', '_', s).strip("_")
    return f"{clean(bike_name)}_{clean(color_name)}_{clean(festival)}.jpeg"


router = APIRouter()


class GenerateImageRequest(BaseModel):
    bike_id:         str
    bike_name:       str
    color_id:        str
    color_name:      str
    festival:        str
    campaign_header: Optional[str]       = ""
    offers:          Optional[List[str]] = []
    dealer_address:  Optional[str]       = ""
    platform_name:   Optional[str]       = ""
    platform_width:  Optional[int]       = 1080
    platform_height: Optional[int]       = 1080


class GenerateImageResponse(BaseModel):
    filename:    str
    url:         str
    prompt_used: str
    base_filename: str


@router.post("/", response_model=GenerateImageResponse)
async def generate_image_endpoint(request: GenerateImageRequest):
    filename = _build_filename(request.bike_name, request.color_name, request.festival)
    try:
        result = await generate_image(
            bike_id=request.bike_id,
            bike_name=request.bike_name,
            color_id=request.color_id,
            color_name=request.color_name,
            festival=request.festival,
            campaign_header=request.campaign_header or "",
            offers=(request.offers or [])[:3],
            dealer_address=request.dealer_address or "",
            platform_name=request.platform_name or "",
            platform_width=request.platform_width or 1080,
            platform_height=request.platform_height or 1080,
            filename=filename,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    return GenerateImageResponse(
        filename=result.filename,
        url=result.url,
        prompt_used=result.prompt,
        base_filename=result.base_filename,
    )
