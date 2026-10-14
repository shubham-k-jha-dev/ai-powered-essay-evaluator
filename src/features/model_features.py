"""
model_features.py

Single source of truth for the numeric features fed to the final scorer.
Used by BOTH the training script (src/models/train_final.py) and the
FastAPI backend, so training and serving can never drift apart.

Base features come from text_features.py (notebook 03). The extra ones
were added in notebook 05 / the final training step:
  - log_word_count, long_word_ratio, commas_per_sentence, paragraph_count
  - mechanics proxies: lowercase " i " usage, sentences starting in lowercase
  - discourse: transition-word density
"""

import re
import numpy as np

from features.text_features import extract_all_features

BASE_COLS = [
    "word_count", "character_count", "sentence_count", "avg_word_length",
    "avg_sentence_length", "sentence_length_std", "unique_word_count",
    "type_token_ratio", "flesch_reading_ease", "flesch_kincaid_grade",
]
NB05_COLS = ["log_word_count", "long_word_ratio", "commas_per_sentence", "paragraph_count"]
NEW_COLS = ["lowercase_i_rate", "lowercase_sentence_start_rate", "transition_rate"]
NUM_COLS = BASE_COLS + NB05_COLS + NEW_COLS

TRANSITIONS = [
    "however", "therefore", "furthermore", "moreover", "in addition", "for example",
    "for instance", "in conclusion", "consequently", "as a result", "on the other hand",
    "in contrast", "additionally", "similarly", "finally", "first", "second", "third",
    "although", "because", "thus", "overall", "in fact", "nevertheless",
]
_TRANSITION_RE = re.compile(r"\b(" + "|".join(re.escape(t) for t in TRANSITIONS) + r")\b")


def clean_text(text: str) -> str:
    """Same normalisation as preprocess.clean_text: lowercase + collapse whitespace."""
    return re.sub(r"\s+", " ", text.lower()).strip()


def extra_features(original: str, clean: str, base: dict) -> dict:
    """Features layered on top of the base handcrafted set."""
    words = [w for w in clean.split() if w.isalpha()]
    n_words = max(base["word_count"], 1)
    n_sent = max(base["sentence_count"], 1)
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", original.strip()) if s]
    lower_starts = sum(1 for s in sentences if s[0].isalpha() and s[0].islower())
    return {
        "log_word_count": float(np.log1p(base["word_count"])),
        "long_word_ratio": sum(len(w) >= 7 for w in words) / len(words) if words else 0.0,
        "commas_per_sentence": original.count(",") / n_sent,
        "paragraph_count": len(re.findall(r"\n\s*\n", original)) + 1,
        "lowercase_i_rate": len(re.findall(r"(?:^|\s)i(?=[\s',.])", original)) / n_words,
        "lowercase_sentence_start_rate": lower_starts / max(len(sentences), 1),
        "transition_rate": len(_TRANSITION_RE.findall(clean)) / n_words * 100,
    }


def compute_features(original: str) -> tuple[dict, str]:
    """Return (all numeric features, clean_text) for one essay."""
    original = original.strip()
    clean = clean_text(original)
    feats = extract_all_features(original)
    feats.update(extra_features(original, clean, feats))
    return feats, clean
