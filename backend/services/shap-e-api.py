#!/usr/bin/env python3
"""
FastAPI wrapper around the existing Shap-E generation class so we only pay the model-load cost once.
Launch with `uvicorn shap-e-api:app --host 0.0.0.0 --port 8008 --workers 1`
It exposes POST /generate expecting JSON identical to the CLI argument.
Response: {success, ... same fields as original generator}
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
import uvicorn
import traceback
import os, sys
sys.path.append(os.path.dirname(__file__))
import importlib.util
spec = importlib.util.spec_from_file_location("shap_e_service", os.path.join(os.path.dirname(__file__), "shap-e.service.py"))
shap_e_service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shap_e_service)
ShapE3DModelGenerator = shap_e_service.ShapE3DModelGenerator

app = FastAPI(title="Shap-E 3D Generator", description="Persistent service for text-to-3D generation", version="0.1.0")

generator = ShapE3DModelGenerator()  # load once at startup

class GenerationRequest(BaseModel):
    name: str
    description: str | None = None
    concept: str | None = None
    difficulty: int | None = 2
    visualStyle: str | None = "realistic"
    educationalContext: str | None = None

@app.post("/generate")
async def generate_3d(req: GenerationRequest) -> Dict[str, Any]:
    try:
        result = generator.generate_3d_mesh(req.dict())
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("shap-e-api:app", host="0.0.0.0", port=8008, reload=False) 