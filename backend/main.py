"""
main.py — FastAPI backend for the AI Essay Evaluator.

Start (from the project root):
    .venv\\Scripts\\python -m uvicorn backend.main:app --port 8000

Endpoints:
  GET  /api/health    — health check + whether the model is loaded
  GET  /api/model     — model description and its held-out test metrics
  POST /api/evaluate  — score an essay with the trained model
"""

import os
import sys
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from backend.essay_scorer import ModelNotLoadedError, load_model, model_info, score_essay  # noqa: E402

MIN_WORDS = 30
MAX_CHARS = 30000

app = FastAPI(title="AI Essay Evaluator API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EvaluateRequest(BaseModel):
    essay: str = Field(..., max_length=MAX_CHARS)
    topic: str | None = Field(None, max_length=1000)


@app.on_event("startup")
def startup():
    """Load the saved model once (never trains)."""
    import nltk
    for pkg in ("punkt", "punkt_tab"):
        try:
            nltk.data.find(f"tokenizers/{pkg}")
        except LookupError:
            nltk.download(pkg, quiet=True)
    load_model()


@app.get("/api/health")
def health():
    loaded = load_model() is not None
    return {"status": "ok" if loaded else "model_missing", "model_loaded": loaded}


@app.get("/api/model")
def get_model():
    return model_info()


@app.post("/api/evaluate")
def evaluate(req: EvaluateRequest):
    essay = req.essay.strip()
    n_words = len(essay.split())
    if n_words < MIN_WORDS:
        raise HTTPException(422, f"Please enter at least {MIN_WORDS} words (currently {n_words}).")
    start = time.perf_counter()
    try:
        result = score_essay(essay, req.topic)
    except ModelNotLoadedError as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # surface real errors instead of fake results
        raise HTTPException(500, f"Evaluation failed: {e}")
    result["elapsed_ms"] = round((time.perf_counter() - start) * 1000)
    return result
