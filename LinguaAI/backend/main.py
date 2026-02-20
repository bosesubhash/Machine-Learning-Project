"""LinguaAI translation API using Hugging Face Helsinki models."""

from __future__ import annotations

from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline

SUPPORTED_MODELS = {
    ("en", "hi"): "Helsinki-NLP/opus-mt-en-hi",
    ("hi", "en"): "Helsinki-NLP/opus-mt-hi-en",
}


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source: str = Field(..., description="Source language code: en or hi")
    target: str = Field(..., description="Target language code: hi or en")

    @field_validator("source", "target")
    @classmethod
    def validate_language_code(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"en", "hi"}:
            raise ValueError("Only 'en' and 'hi' are supported.")
        return normalized

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Text cannot be empty.")
        return trimmed


class TranslationResponse(BaseModel):
    translated_text: str


@lru_cache(maxsize=2)
def get_translator(source: str, target: str):
    model_name = SUPPORTED_MODELS[(source, target)]
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

    # Task names follow transformers translation convention, e.g. translation_en_to_hi.
    task_name = f"translation_{source}_to_{target}"
    return pipeline(task_name, model=model, tokenizer=tokenizer)


app = FastAPI(
    title="LinguaAI API",
    version="1.0.0",
    description="English to Hindi and Hindi to English translation API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/translate", response_model=TranslationResponse)
async def translate(payload: TranslationRequest) -> TranslationResponse:
    source = payload.source
    target = payload.target
    text = payload.text

    if source == target:
        raise HTTPException(
            status_code=400,
            detail="Source and target must be different languages.",
        )

    if (source, target) not in SUPPORTED_MODELS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported translation pair. Use en->hi or hi->en.",
        )

    try:
        translator = get_translator(source, target)
        result = translator(text, max_length=512, truncation=True)
        translated_text = result[0]["translation_text"].strip()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Translation error: {exc}",
        ) from exc

    if not translated_text:
        raise HTTPException(
            status_code=500,
            detail="Model returned empty translation.",
        )

    return TranslationResponse(translated_text=translated_text)
