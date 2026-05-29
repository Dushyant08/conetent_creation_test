import os
from fastapi import APIRouter
from pathlib import Path
from typing import List
from pydantic import BaseModel

router = APIRouter()

ASSET_BASE = Path(__file__).resolve().parent.parent / "assets"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _asset_url(relative_path: str) -> str:
    base = os.getenv("AZURE_BLOB_URL", "").strip().rstrip("/")
    if base:
        return f"{base}/{relative_path}"
    return f"/assets/{relative_path}"


class ColorItem(BaseModel):
    id: str
    name: str
    url: str


class ModelItem(BaseModel):
    id: str
    name: str
    url: str
    colors: List[ColorItem]


class SegmentItem(BaseModel):
    id: str
    name: str
    models: List[ModelItem]


class BackgroundItem(BaseModel):
    id: str
    name: str
    url: str


@router.get("/segments", response_model=List[SegmentItem])
def get_segments():
    segments_dir = ASSET_BASE / "segments"
    if not segments_dir.exists():
        return []
    result = []
    for seg_dir in sorted(segments_dir.iterdir()):
        if not seg_dir.is_dir():
            continue
        models = []
        for model_dir in sorted(seg_dir.iterdir()):
            if not model_dir.is_dir():
                continue
            colors = []
            colors_dir = model_dir / "colors"
            if colors_dir.exists():
                for f in sorted(colors_dir.iterdir()):
                    if f.suffix.lower() in SUPPORTED_EXTENSIONS:
                        color_rel = f"segments/{seg_dir.name}/{model_dir.name}/colors/{f.name}"
                        colors.append(ColorItem(
                            id=f.stem,
                            name=f.stem,
                            url=_asset_url(color_rel),
                        ))
            
            bike_rel = ""
            for f in sorted(model_dir.iterdir()):
                if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS:
                    bike_rel = f"segments/{seg_dir.name}/{model_dir.name}/{f.name}"
                    break
            
            bike_url = _asset_url(bike_rel) if bike_rel else (colors[0].url if colors else "")

            models.append(ModelItem(
                id=model_dir.name,
                name=model_dir.name,
                url=bike_url,
                colors=colors,
            ))
        result.append(SegmentItem(
            id=seg_dir.name,
            name=seg_dir.name,
            models=models,
        ))
    return result


@router.get("/backgrounds", response_model=List[BackgroundItem])
def get_backgrounds():
    bg_dir = ASSET_BASE / "backgrounds"
    bg_dir.mkdir(parents=True, exist_ok=True)
    result = []
    for f in sorted(bg_dir.iterdir()):
        if f.suffix.lower() in SUPPORTED_EXTENSIONS:
            result.append(BackgroundItem(
                id=f.stem,
                name=f.stem,
                url=_asset_url(f"backgrounds/{f.name}"),
            ))
    return result
