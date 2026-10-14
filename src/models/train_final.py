"""
train_final.py — train, compare and save the model used by the website.

Run from the project root (takes a few minutes):
    .venv\\Scripts\\python src\\models\\train_final.py

What it does
  1. Loads data/processed/essays_processed.csv (output of notebook 03).
  2. Uses the SAME 80/20 split (random_state=42) as notebooks 04/05 so
     numbers are directly comparable with the saved baseline results.
  3. Re-trains the notebook-05 ensemble (prompt-aware) as the reference.
  4. Trains the improved, prompt-independent model:
       Ridge on [word 1-2gram TF-IDF + char 3-5gram TF-IDF + 17 numeric features].
     A HistGradientBoosting model and a Ridge+GB average are also evaluated;
     the average scored slightly worse, so Ridge alone is the final scorer.
     It does NOT need the essay prompt, so the website can score any essay.
  5. Writes results/metrics/final_model_comparison.csv + final_model_metrics.json
     and saves results/models/final_essay_scorer.joblib.
"""

import json
import os
import sys
import time

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, hstack
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.metrics import cohen_kappa_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "src"))

from features.model_features import NB05_COLS, BASE_COLS, NUM_COLS, extra_features  # noqa: E402

DATA = os.path.join(ROOT, "data", "processed", "essays_processed.csv")
MODEL_OUT = os.path.join(ROOT, "results", "models", "final_essay_scorer.joblib")
METRICS_DIR = os.path.join(ROOT, "results", "metrics")
RANDOM_STATE = 42


def metrics(name, y_true, y_pred, secs):
    y_pred = np.clip(y_pred, 1, 6)
    rounded = np.rint(y_pred).astype(int)
    return {
        "Model": name,
        "MAE": round(mean_absolute_error(y_true, y_pred), 4),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "R2": round(r2_score(y_true, y_pred), 4),
        "QWK": round(cohen_kappa_score(y_true, rounded, weights="quadratic"), 4),
        "Exact acc (rounded)": round(float((rounded == y_true).mean()), 4),
        "Within 1 point": round(float((np.abs(rounded - y_true) <= 1).mean()), 4),
        "Training Time (s)": round(secs, 1),
    }


def main():
    t0 = time.time()
    df = pd.read_csv(DATA)
    df = df.dropna(subset=["original_text", "clean_text", "score"] + BASE_COLS).reset_index(drop=True)
    print(f"Loaded {len(df)} essays")

    extra = pd.DataFrame(
        [extra_features(o.strip(), c, r) for o, c, r in
         zip(df["original_text"], df["clean_text"], df[BASE_COLS].to_dict("records"))]
    )
    df = pd.concat([df, extra], axis=1)

    train, test = train_test_split(df, test_size=0.2, random_state=RANDOM_STATE)
    y_tr, y_te = train["score"].values, test["score"].values
    rows = []

    # ── Reference: notebook-05 prompt-aware ensemble ────────────────────
    t = time.time()
    nb_cols = BASE_COLS + NB05_COLS
    tf_old = TfidfVectorizer(max_features=10000, ngram_range=(1, 2), min_df=3, sublinear_tf=True)
    sc_old = StandardScaler()
    oh = OneHotEncoder(handle_unknown="ignore")
    Xtr = hstack([tf_old.fit_transform(train["clean_text"]), csr_matrix(sc_old.fit_transform(train[nb_cols])),
                  oh.fit_transform(train[["prompt_name"]])]).tocsr()
    Xte = hstack([tf_old.transform(test["clean_text"]), csr_matrix(sc_old.transform(test[nb_cols])),
                  oh.transform(test[["prompt_name"]])]).tocsr()
    r_old = Ridge(alpha=3).fit(Xtr, y_tr)
    Dtr = np.hstack([sc_old.transform(train[nb_cols]), oh.transform(train[["prompt_name"]]).toarray()])
    Dte = np.hstack([sc_old.transform(test[nb_cols]), oh.transform(test[["prompt_name"]]).toarray()])
    g_old = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.05, random_state=RANDOM_STATE).fit(Dtr, y_tr)
    p_old = (r_old.predict(Xte) + g_old.predict(Dte)) / 2
    rows.append(metrics("Notebook 05 ensemble (needs prompt label)", y_te, p_old, time.time() - t))
    # same model but with the prompt unknown (what happens for a new topic)
    Xte_np = hstack([tf_old.transform(test["clean_text"]), csr_matrix(sc_old.transform(test[nb_cols])),
                     csr_matrix((len(test), len(oh.categories_[0])))]).tocsr()
    Dte_np = np.hstack([sc_old.transform(test[nb_cols]), np.zeros((len(test), len(oh.categories_[0])))])
    rows.append(metrics("Notebook 05 ensemble, prompt NOT given", y_te,
                        (r_old.predict(Xte_np) + g_old.predict(Dte_np)) / 2, 0))
    print(rows[-2]); print(rows[-1])

    # ── Improved, prompt-independent model ──────────────────────────────
    t = time.time()
    tf_word = TfidfVectorizer(max_features=20000, ngram_range=(1, 2), min_df=3, sublinear_tf=True)
    tf_char = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=30000,
                              min_df=5, sublinear_tf=True)
    scaler = StandardScaler()
    Ntr, Nte = scaler.fit_transform(train[NUM_COLS]), scaler.transform(test[NUM_COLS])
    Xtr = hstack([tf_word.fit_transform(train["clean_text"]), tf_char.fit_transform(train["clean_text"]),
                  csr_matrix(Ntr)]).tocsr()
    Xte = hstack([tf_word.transform(test["clean_text"]), tf_char.transform(test["clean_text"]),
                  csr_matrix(Nte)]).tocsr()
    print(f"Vectorised in {time.time() - t:.0f}s, shape {Xtr.shape}")

    grid = GridSearchCV(Ridge(), {"alpha": [1, 3, 10]}, cv=3, scoring="neg_root_mean_squared_error")
    grid.fit(Xtr, y_tr)
    ridge = grid.best_estimator_
    p_ridge = ridge.predict(Xte)
    rows.append(metrics(f"Ridge word+char TF-IDF + features (alpha={grid.best_params_['alpha']})",
                        y_te, p_ridge, time.time() - t))
    print(rows[-1])

    t = time.time()
    gb = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, random_state=RANDOM_STATE).fit(Ntr, y_tr)
    p_gb = gb.predict(Nte)
    rows.append(metrics("Gradient Boosting on 17 features", y_te, p_gb, time.time() - t))
    print(rows[-1])

    p_ens = (p_ridge + p_gb) / 2
    rows.append(metrics("Ridge + GB average (no prompt needed)", y_te, p_ens, 0))
    print(rows[-1])
    # The averaged ensemble was slightly WORSE than Ridge alone, so Ridge is the final scorer.
    final = dict(rows[-3], Model="FINAL: " + rows[-3]["Model"])
    rows.append(final)

    table = pd.DataFrame(rows)
    os.makedirs(METRICS_DIR, exist_ok=True)
    table.to_csv(os.path.join(METRICS_DIR, "final_model_comparison.csv"), index=False)

    bundle = {
        "version": "final-2", "final_model": "ridge",
        "tfidf_word": tf_word, "tfidf_char": tf_char, "scaler": scaler,
        "ridge": ridge, "gb": gb, "num_cols": NUM_COLS,
        "score_min": 1, "score_max": 6,
        "metrics": final, "n_train": int(len(train)), "n_test": int(len(test)),
    }
    joblib.dump(bundle, MODEL_OUT, compress=3)
    with open(os.path.join(METRICS_DIR, "final_model_metrics.json"), "w") as f:
        json.dump({"final_model": final, "comparison": rows, "n_train": len(train), "n_test": len(test)}, f, indent=2)
    print(table.to_string(index=False))
    print(f"Saved {MODEL_OUT}  (total {time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
