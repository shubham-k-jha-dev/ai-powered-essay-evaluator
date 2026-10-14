"""
predict.py - load the saved essay scorer and predict a score for one essay.
Used by the backend (FastAPI) later. Mirrors notebook 05 exactly.
"""
import re
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from features.text_features import extract_all_features


def load_scorer(path="results/models/essay_scorer.joblib"):
    return joblib.load(path)


def predict_score(essay_text, bundle, prompt_name="unknown"):
    original = essay_text.strip()
    clean = re.sub(r"\s+", " ", original.lower()).strip()

    feats = extract_all_features(original)           # same features as notebook 03
    words = [w for w in clean.split() if w.isalpha()]
    feats["log_word_count"] = np.log1p(feats["word_count"])
    feats["long_word_ratio"] = sum(len(w) >= 7 for w in words) / len(words) if words else 0
    feats["commas_per_sentence"] = original.count(",") / max(feats["sentence_count"], 1)
    feats["paragraph_count"] = len(re.findall(r"\n\s*\n", original)) + 1

    num = bundle["scaler"].transform(pd.DataFrame([feats])[bundle["num_cols"]])
    prompt = bundle["onehot"].transform(pd.DataFrame({"prompt_name": [prompt_name]}))

    X_comb = hstack([bundle["tfidf"].transform([clean]), csr_matrix(num), prompt]).tocsr()
    X_dense = np.hstack([num, prompt.toarray()])

    ridge_pred = bundle["ridge"].predict(X_comb)[0]
    gb_pred = bundle["gb"].predict(X_dense)[0]
    return float(np.clip((ridge_pred + gb_pred) / 2, 1, 6))