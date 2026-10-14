"""
essay_scorer.py

Service layer between FastAPI and the ML pipeline.

Loads the saved final model bundle ONCE (results/models/final_essay_scorer.joblib,
produced by src/models/train_final.py) and scores any essay by:
  1. Extracting the exact numeric features used in training (src/features/model_features.py)
  2. Ridge (word + char TF-IDF + features) prediction = the score
     (a feature-only Gradient Boosting prediction is returned as a second opinion)
  3. Computing writing statistics and readability
  4. Rule-based feedback derived from those real measurements

This module NEVER trains the model. If the model file is missing it raises
an error instead of inventing a score.
"""

import os
import re
import sys
from collections import Counter

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, hstack
from sklearn.metrics.pairwise import cosine_similarity

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "src"))

from features.model_features import compute_features  # noqa: E402
from features.text_features import _word_tokens  # noqa: E402
from nltk.tokenize import sent_tokenize  # noqa: E402

MODEL_PATH = os.path.join(PROJECT_ROOT, "results", "models", "final_essay_scorer.joblib")

SCORE_LABELS = {
    1: "Very limited",
    2: "Limited",
    3: "Developing",
    4: "Adequate",
    5: "Strong",
    6: "Excellent",
}
SCALE = [{"score": k, "label": v} for k, v in SCORE_LABELS.items()]

STOP_WORDS = {
    "that", "this", "with", "have", "from", "they", "been", "were", "more", "when",
    "will", "would", "could", "their", "than", "other", "about", "into", "also",
    "some", "what", "which", "there", "these", "them", "each", "make", "like",
    "does", "very", "just", "over", "such", "after", "most", "only", "many",
    "then", "because", "should", "people", "your", "while", "being", "where",
}

_model = None


class ModelNotLoadedError(RuntimeError):
    pass


def load_model():
    """Load the bundle once and cache it. Returns None if unavailable."""
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        bundle = joblib.load(MODEL_PATH)
        required = {"tfidf_word", "tfidf_char", "scaler", "ridge", "gb", "num_cols"}
        missing = required - set(bundle)
        if missing:
            raise ValueError(f"Model bundle missing components: {missing}")
        _model = bundle
        print(f"[essay_scorer] Model loaded from {MODEL_PATH}")
    return _model


def model_info() -> dict:
    model = load_model()
    if model is None:
        return {"loaded": False}
    m = model.get("metrics", {})
    return {
        "loaded": True,
        "name": "Ridge regression on word + char TF-IDF + 17 handcrafted features",
        "version": model.get("version"),
        "trained_on": "ASAP 2.0 (24,728 essays, grades 6-12)",
        "test_essays": model.get("n_test"),
        "qwk": m.get("QWK"),
        "mae": m.get("MAE"),
        "rmse": m.get("RMSE"),
        "within_one": m.get("Within 1 point"),
    }


# ─── Scoring ──────────────────────────────────────────────────────────

def _predict(feats: dict, clean: str, model: dict) -> dict:
    num = model["scaler"].transform(pd.DataFrame([feats])[model["num_cols"]])
    X = hstack([
        model["tfidf_word"].transform([clean]),
        model["tfidf_char"].transform([clean]),
        csr_matrix(num),
    ]).tocsr()
    ridge = float(model["ridge"].predict(X)[0])
    gb = float(model["gb"].predict(num)[0])
    return {
        "score": float(np.clip(ridge, 1, 6)),  # Ridge is the final model (best on test set)
        "ridge": round(float(np.clip(ridge, 1, 6)), 3),
        "gradient_boosting": round(float(np.clip(gb, 1, 6)), 3),
    }


def _topic_overlap(topic: str, clean: str, model: dict) -> float | None:
    """Cosine similarity between topic and essay in the model's word TF-IDF space."""
    if not topic or not topic.strip():
        return None
    vec = model["tfidf_word"]
    sim = cosine_similarity(vec.transform([topic.lower()]), vec.transform([clean]))[0, 0]
    return round(float(sim), 3)


def score_essay(text: str, topic: str | None = None) -> dict:
    model = load_model()
    if model is None:
        raise ModelNotLoadedError(
            "Trained model not found. Run: .venv\\Scripts\\python src\\models\\train_final.py"
        )

    feats, clean = compute_features(text)
    pred = _predict(feats, clean, model)
    score = pred["score"]
    band = int(np.rint(score))

    stats = _statistics(feats, text)
    checks = _mechanics_checks(text)
    overlap = _topic_overlap(topic or "", clean, model)
    strengths, weaknesses, suggestions = _feedback(score, stats, checks, overlap)

    return {
        "score": round(score, 2),
        "rounded_score": band,
        "label": SCORE_LABELS[band],
        "scale": {"min": 1, "max": 6, "levels": SCALE},
        "model_breakdown": pred,
        "model": model_info(),
        "statistics": stats,
        "topic": {"provided": overlap is not None, "keyword_overlap": overlap},
        "mechanics_checks": checks,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
    }


# ─── Statistics ───────────────────────────────────────────────────────

def _statistics(f: dict, text: str) -> dict:
    words = [w.lower() for w in _word_tokens(text)]
    paragraphs = [p for p in re.split(r"\n\s*\n|\n", text) if p.strip()]
    return {
        "word_count": int(f["word_count"]),
        "character_count": int(f["character_count"]),
        "sentence_count": int(f["sentence_count"]),
        "paragraph_count": len(paragraphs),
        "avg_sentence_length": round(float(f["avg_sentence_length"]), 1),
        "sentence_length_std": round(float(f["sentence_length_std"]), 1),
        "avg_word_length": round(float(f["avg_word_length"]), 2),
        "unique_words": int(f["unique_word_count"]),
        "type_token_ratio": round(float(f["type_token_ratio"]), 3),
        "long_word_ratio": round(float(f["long_word_ratio"]), 3),
        "transition_words_per_100": round(float(f["transition_rate"]), 2),
        "flesch_reading_ease": round(float(f["flesch_reading_ease"]), 1),
        "flesch_kincaid_grade": round(float(f["flesch_kincaid_grade"]), 1),
        "reading_time_min": round(len(words) / 200, 1),
    }


# ─── Simple, honest mechanics checks (rule-based, NOT a grammar checker) ──

def _mechanics_checks(text: str) -> list:
    issues = []
    lower_i = re.findall(r"(?:^|\s)i(?=[\s',.])", text)
    if lower_i:
        issues.append({"type": "capitalization",
                       "message": f'The pronoun "I" is written in lowercase {len(lower_i)} time(s).'})

    sentences = sent_tokenize(text)
    lower_start = [s for s in sentences if s[:1].isalpha() and s[:1].islower()]
    if lower_start:
        issues.append({"type": "capitalization",
                       "message": f"{len(lower_start)} sentence(s) start with a lowercase letter, "
                                  f'e.g. "{lower_start[0][:60]}".'})

    long_sents = [s for s in sentences if len(_word_tokens(s)) > 40]
    if long_sents:
        issues.append({"type": "long_sentence",
                       "message": f"{len(long_sents)} sentence(s) are over 40 words, "
                                  f'e.g. "{long_sents[0][:70]}...".'})

    doubled = re.findall(r"\b(\w+)\s+\1\b", text, flags=re.IGNORECASE)
    doubled = [d for d in doubled if not d.isdigit()]
    if doubled:
        issues.append({"type": "repeated_word",
                       "message": f'Repeated word(s) next to each other: "{doubled[0]} {doubled[0]}".'})

    if re.search(r"\s+[,.;:!?]", text):
        issues.append({"type": "punctuation", "message": "There is a space before some punctuation marks."})
    if re.search(r"[,.;:!?](?=[A-Za-z])", re.sub(r"\b\w\.\w\.", "", text)):
        issues.append({"type": "punctuation", "message": "Some punctuation marks are not followed by a space."})

    counts = Counter(w.lower() for w in _word_tokens(text) if len(w) > 3)
    total = max(sum(counts.values()), 1)
    overused = [(w, c) for w, c in counts.most_common(15)
                if w not in STOP_WORDS and c >= 5 and c / total > 0.015][:3]
    for w, c in overused:
        issues.append({"type": "word_choice", "message": f'"{w}" is used {c} times — consider synonyms.'})
    return issues


# ─── Feedback (rule-based on real measurements) ───────────────────────

def _feedback(score: float, s: dict, checks: list, overlap: float | None):
    strengths, weaknesses, suggestions = [], [], []
    wc, asl, ttr = s["word_count"], s["avg_sentence_length"], s["type_token_ratio"]

    if score >= 4.5:
        strengths.append("The model rates this essay in the upper range of the 1-6 scale.")
    if wc >= 400:
        strengths.append(f"Well-developed length ({wc} words) gives room to support ideas with detail.")
    elif wc < 200:
        weaknesses.append(f"The essay is short ({wc} words). Higher-scoring essays in the training data are usually 350+ words.")
        suggestions.append("Develop each main point with an explanation and a specific example or piece of evidence.")
    elif wc < 300:
        weaknesses.append(f"At {wc} words, ideas may not be fully developed.")
        suggestions.append("Add another body paragraph or expand existing ones with evidence and analysis.")

    if s["paragraph_count"] >= 4:
        strengths.append(f"Clear organisation into {s['paragraph_count']} paragraphs.")
    elif s["paragraph_count"] <= 2 and wc > 150:
        weaknesses.append("The essay has little paragraph structure.")
        suggestions.append("Organise the essay into an introduction, 2-3 body paragraphs (one idea each) and a conclusion.")

    if s["long_word_ratio"] >= 0.2:
        strengths.append("Uses a good proportion of precise, sophisticated vocabulary.")
    elif s["long_word_ratio"] < 0.12:
        weaknesses.append("Vocabulary is mostly short, everyday words.")
        suggestions.append("Replace vague words (good, bad, things, stuff) with more specific, topic-related vocabulary.")

    if ttr < 0.38 and wc > 150:
        weaknesses.append(f"Low vocabulary variety (type-token ratio {ttr:.2f}); words are repeated often.")
        suggestions.append("Vary word choice — look at the overused words flagged below and use synonyms.")
    elif ttr >= 0.5 and wc >= 250:
        strengths.append(f"Varied vocabulary (type-token ratio {ttr:.2f}).")

    if 12 <= asl <= 24 and s["sentence_length_std"] >= 4:
        strengths.append(f"Good sentence variety (average {asl} words, with a mix of lengths).")
    elif asl > 28:
        weaknesses.append(f"Sentences are long on average ({asl} words), which can hurt clarity.")
        suggestions.append("Split long sentences that join several ideas with 'and' or commas.")
    elif asl < 10:
        weaknesses.append(f"Sentences are very short on average ({asl} words), which can sound choppy.")
        suggestions.append("Combine related short sentences using words like 'because', 'although' or 'which'.")

    if s["transition_words_per_100"] >= 1.5:
        strengths.append("Uses transition words to connect ideas.")
    else:
        weaknesses.append("Few transition words, so the links between ideas may be unclear.")
        suggestions.append("Use transitions such as 'For example', 'However', 'As a result' and 'In conclusion'.")

    if checks:
        weaknesses.append(f"{len(checks)} basic mechanics/word-choice issue(s) were detected (see checks).")
        suggestions.append("Proofread for capitalization, spacing and punctuation before submitting.")
    else:
        strengths.append("No basic mechanics issues were detected by the rule-based checks.")

    if overlap is not None:
        if overlap >= 0.15:
            strengths.append("The essay's vocabulary overlaps well with the given topic.")
        elif overlap < 0.05:
            weaknesses.append("The essay shares very few keywords with the given topic — check that it addresses the prompt.")
            suggestions.append("Refer directly to the key terms of the assignment prompt in your introduction and conclusion.")

    if not strengths:
        strengths.append("The essay communicates a position that can be built upon.")
    if not suggestions:
        suggestions.append("To push the score higher, add more specific evidence and deeper analysis of each point.")
    return strengths[:6], weaknesses[:6], suggestions[:6]
