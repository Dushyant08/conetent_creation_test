from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import traceback

from services.image_generator import edit_image_text

router = APIRouter()


class EditImageRequest(BaseModel):
    base_filename: str
    campaign_header: Optional[str] = ""
    offers: Optional[List[str]] = []
    dealer_address: Optional[str] = ""


class EditImageResponse(BaseModel):
    filename: str
    url: str


@router.post("/", response_model=EditImageResponse)
async def edit_image_endpoint(request: EditImageRequest):
    try:
        result = await edit_image_text(
            base_filename=request.base_filename,
            campaign_header=request.campaign_header or "",
            offers=(request.offers or [])[:3],
            dealer_address=request.dealer_address or "",
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    return EditImageResponse(filename=result.filename, url=result.url)
