"""
train_and_save_model.py

One-time script: trains the best baseline model (Random Forest with
handcrafted NLP features) on the processed dataset and saves it to disk.

Run once before starting the API:
    python backend/train_and_save_model.py

The saved model is loaded by the FastAPI backend at startup — no training
happens when the server starts.
"""

import sys, os, joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

# Add project root to path so we can import from src/
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from src.features.text_features import extract_all_features

PROCESSED_DATA_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "essays_processed.csv")
MODEL_SAVE_PATH = os.path.join(PROJECT_ROOT, "results", "models", "random_forest_model.joblib")

FEATURE_COLUMNS = [
    "word_count", "character_count", "sentence_count",
    "avg_word_length", "avg_sentence_length", "sentence_length_std",
    "unique_word_count", "type_token_ratio",
    "flesch_reading_ease", "flesch_kincaid_grade",
]


def main():
    print("[1/4] Loading processed data...")
    df = pd.read_csv(PROCESSED_DATA_PATH)
    print(f"       {len(df)} rows loaded.")

    # Check if feature columns already exist
    missing_features = [c for c in FEATURE_COLUMNS if c not in df.columns]

    if missing_features:
        print(f"[2/4] Extracting features ({len(missing_features)} missing columns)...")
        # Use original_text if available, else full_text
        text_col = "original_text" if "original_text" in df.columns else "full_text"
        feature_df = pd.DataFrame([extract_all_features(t) for t in df[text_col]])
        for col in FEATURE_COLUMNS:
            if col in feature_df.columns:
                df[col] = feature_df[col].values
    else:
        print("[2/4] Features already present in processed data.")

    # Drop rows with NaN in features or score
    df = df.dropna(subset=FEATURE_COLUMNS + ["score"]).reset_index(drop=True)
    print(f"       {len(df)} usable rows after dropping NaN.")

    X = df[FEATURE_COLUMNS].values
    y = df["score"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"[3/4] Training Random Forest (train={len(X_train)}, test={len(X_test)})...")
    model = RandomForestRegressor(
        n_estimators=150, max_depth=20, random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    from sklearn.metrics import mean_absolute_error, r2_score
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"       Test MAE: {mae:.4f}  |  Test R²: {r2:.4f}")

    print(f"[4/4] Saving model to {MODEL_SAVE_PATH} ...")
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    joblib.dump(model, MODEL_SAVE_PATH)
    print("       Done!")


if __name__ == "__main__":
    main()
