import models, database, auth

import os
import io
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/genai", tags=["genai"])


class GenerationRequest(BaseModel):
    prompt: str
    influencer_id: Optional[int] = None


def get_stability_api():
    api_key = os.environ.get("STABILITY_KEY") or os.environ.get("STABILITY_API_KEY")
    if not api_key or api_key == "YOUR_STABILITY_AI_KEY_HERE":
        return None
    try:
        from stability_sdk import client
        return client.StabilityInference(key=api_key, verbose=False, engine="stable-diffusion-xl-1024-v1-0")
    except Exception:
        return None


@router.post("/generate-preview", status_code=status.HTTP_201_CREATED)
@limiter.limit(os.getenv("RATE_LIMIT_GENAI", "30/minute"))
def generate_preview_image(
    request: Request,
    req: GenerationRequest,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Generate a preview image. Falls back to a placeholder if no API key is set."""
    stability_api = get_stability_api()

    if stability_api is not None:
        try:
            import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation
            from PIL import Image

            answers = stability_api.generate(
                prompt=req.prompt, steps=30, cfg_scale=8.0,
                width=512, height=512, samples=1,
                sampler=generation.SAMPLER_K_DPMPP_2M
            )

            image_path = ""
            for resp in answers:
                for artifact in resp.artifacts:
                    if artifact.type == generation.ARTIFACT_IMAGE:
                        img = Image.open(io.BytesIO(artifact.binary))
                        output_dir = "generated_images"
                        os.makedirs(output_dir, exist_ok=True)
                        image_path = os.path.join(output_dir, f"preview_{current_user.id}_{artifact.seed}.png")
                        img.save(image_path)

            if not image_path:
                raise HTTPException(status_code=500, detail="Image generation failed.")
            return {"watermarked_url": image_path}

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")
    else:
        # Placeholder for dev — unique per prompt
        seed = abs(hash(req.prompt)) % 1000
        placeholder_url = f"https://picsum.photos/seed/{seed}/512/512"
        return {"watermarked_url": placeholder_url}
