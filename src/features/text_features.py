"""
text_features.py

Handcrafted NLP features for the Review 1 baseline (Step 6):
  - basic counts (word / character / sentence)
  - average sentence length, average word length
  - vocabulary richness (unique word count, type-token ratio)
  - readability (Flesch Reading Ease, Flesch-Kincaid Grade)
  - sentence length variation

Uses NLTK for tokenization/sentence-splitting. Requires the 'punkt'
tokenizer data (see notebook 03 for the one-time download call).
"""

import numpy as np
import pandas as pd
import textstat
from nltk.tokenize import sent_tokenize, word_tokenize


def _word_tokens(text: str) -> list:
    # keep only alphabetic tokens for word-level stats (drops standalone
    # punctuation tokens like "," or "." from word counts)
    return [w for w in word_tokenize(text) if w.isalpha()]


def extract_basic_features(text: str) -> dict:
    """Word/character/sentence counts and average lengths for one essay."""
    sentences = sent_tokenize(text)
    words = _word_tokens(text)

    word_count = len(words)
    sentence_count = max(len(sentences), 1)  # avoid divide-by-zero
    character_count = len(text)

    avg_word_length = np.mean([len(w) for w in words]) if words else 0.0
    sentence_lengths = [len(_word_tokens(s)) for s in sentences] if sentences else [0]
    avg_sentence_length = np.mean(sentence_lengths)
    sentence_length_std = np.std(sentence_lengths)

    return {
        "word_count": word_count,
        "character_count": character_count,
        "sentence_count": sentence_count,
        "avg_word_length": round(avg_word_length, 3),
        "avg_sentence_length": round(avg_sentence_length, 3),
        "sentence_length_std": round(sentence_length_std, 3),
    }


def extract_vocabulary_features(text: str) -> dict:
    """Vocabulary richness features for one essay."""
    words = [w.lower() for w in _word_tokens(text)]
    unique_word_count = len(set(words))
    type_token_ratio = round(unique_word_count / len(words), 4) if words else 0.0

    return {
        "unique_word_count": unique_word_count,
        "type_token_ratio": type_token_ratio,
    }


def extract_readability_features(text: str) -> dict:
    """
    Readability scores via textstat.
    - flesch_reading_ease: higher = easier to read (roughly 0-100)
    - flesch_kincaid_grade: approximate US school grade level needed to
      understand the text
    """
    try:
        ease = textstat.flesch_reading_ease(text)
        grade = textstat.flesch_kincaid_grade(text)
    except Exception:
        ease, grade = np.nan, np.nan

    return {
        "flesch_reading_ease": round(ease, 2) if ease is not None else np.nan,
        "flesch_kincaid_grade": round(grade, 2) if grade is not None else np.nan,
    }


def extract_all_features(text: str) -> dict:
    """Combine all handcrafted features for a single essay into one dict."""
    features = {}
    features.update(extract_basic_features(text))
    features.update(extract_vocabulary_features(text))
    features.update(extract_readability_features(text))
    return features


def build_feature_dataframe(texts: pd.Series) -> pd.DataFrame:
    """
    Apply extract_all_features to every essay in a Series and return a
    DataFrame with one row per essay, one column per feature. Row order
    matches the input Series, and the index is preserved so it can be
    joined back to the original dataframe.
    """
    records = [extract_all_features(t) for t in texts]
    return pd.DataFrame.from_records(records, index=texts.index)
