"""
preprocess.py

Data cleaning and text preprocessing functions (Review 1 - Step 5).

Kept as plain functions (no classes) so every step can be explained line
by line in a viva. See notebooks/03_preprocessing_and_features.ipynb for
the walkthrough that uses these.
"""

import re
import pandas as pd


def check_data_quality(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run the Review 1 data-quality checks and return a one-row-per-check
    summary table. Does NOT modify df - purely diagnostic.
    """
    checks = {
        "missing_essay_id": df["essay_id"].isnull().sum(),
        "missing_full_text": df["full_text"].isnull().sum(),
        "missing_score": df["score"].isnull().sum(),
        "empty_or_whitespace_only_essay": df["full_text"].fillna("").str.strip().eq("").sum(),
        "duplicate_essay_id": df["essay_id"].duplicated().sum(),
        "duplicate_essay_text": df["full_text"].duplicated().sum(),
        "invalid_score_non_numeric": pd.to_numeric(df["score"], errors="coerce").isnull().sum() - df["score"].isnull().sum(),
        "leading_or_trailing_whitespace_in_essay": (df["full_text"].fillna("") != df["full_text"].fillna("").str.strip()).sum(),
    }
    return pd.DataFrame.from_dict(checks, orient="index", columns=["count"])


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply the cleaning decisions explained in notebook 03. Every removal
    is deliberate and counted - we never silently drop rows.

    Decisions:
    - Rows with a missing essay OR a missing score are dropped: neither
      the model input nor the target can be reconstructed, so the row is
      unusable for supervised learning.
    - Rows where the essay is empty or whitespace-only after stripping
      are dropped for the same reason (no real input signal).
    - Exact duplicate essay_id rows are dropped, keeping the first
      occurrence, to avoid the same essay influencing training more than
      once (which would bias evaluation).
    - Leading/trailing whitespace in the essay text is stripped (does not
      remove any row, just tidies the string).
    """
    df = df.copy()
    n_start = len(df)

    df = df.dropna(subset=["full_text", "score"])
    df = df[df["full_text"].str.strip().ne("")]

    df["full_text"] = df["full_text"].str.strip()

    df = df.drop_duplicates(subset=["essay_id"], keep="first")

    n_end = len(df)
    print(f"[clean_dataset] {n_start} -> {n_end} rows "
          f"({n_start - n_end} rows removed: missing/empty essay or score, or duplicate essay_id).")

    return df.reset_index(drop=True)


def clean_text(text: str) -> str:
    """
    Light text normalization for the 'clean_text' column.

    Deliberately conservative: essay-quality analysis (grammar, sentence
    structure, readability) needs punctuation and sentence boundaries, so
    we do NOT strip punctuation or stopwords here. We only:
      - lowercase
      - collapse repeated whitespace/newlines into single spaces

    The untouched original stays available in 'original_text' for any
    feature that needs real punctuation/casing (e.g. readability scores).
    """
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text


def add_clean_text_column(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add 'original_text' (untouched copy of full_text) and 'clean_text'
    (lightly normalized) columns, without destroying full_text.
    """
    df = df.copy()
    df["original_text"] = df["full_text"]
    df["clean_text"] = df["full_text"].apply(clean_text)
    return df


def bucket_score(score: float) -> str:
    """
    Map a numeric score (observed range 1-6, see notebook 01) into three
    ordinal categories, splitting the observed range into equal thirds:
        1-2 -> Low
        3-4 -> Medium
        5-6 -> High

    Used ONLY for the secondary classification experiment (to produce a
    confusion matrix). The main scoring task remains regression on the
    raw numeric score - this bucketing is not used to train the primary
    model.
    """
    if score <= 2:
        return "Low"
    elif score <= 4:
        return "Medium"
    else:
        return "High"


def add_score_category_column(df: pd.DataFrame) -> pd.DataFrame:
    """Add a 'score_category' column using bucket_score()."""
    df = df.copy()
    df["score_category"] = df["score"].apply(bucket_score)
    return df
