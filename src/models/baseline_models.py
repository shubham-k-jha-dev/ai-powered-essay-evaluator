"""
baseline_models.py

Baseline models for Review 1 - Step 8:
  - 3 regressors for the main scoring task (Linear, Ridge, Random Forest)
  - 1 classifier for the secondary Low/Medium/High demonstration

Plain functions returning fresh, untrained model instances - no classes,
no pipelines-within-pipelines, so every step is easy to explain.
"""

import time

from sklearn.linear_model import LinearRegression, Ridge, LogisticRegression
from sklearn.ensemble import RandomForestRegressor


def get_baseline_regressors(random_state: int = 42) -> dict:
    """Return a dict of {name: fresh untrained regressor}."""
    return {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0, random_state=random_state),
        "Random Forest": RandomForestRegressor(
            n_estimators=150, max_depth=20, random_state=random_state, n_jobs=-1
        ),
    }


def get_baseline_classifier(random_state: int = 42):
    """
    Classifier for the SECONDARY Low/Medium/High experiment only
    (used to produce the confusion matrix requirement).
    """
    return LogisticRegression(max_iter=1000, random_state=random_state)


def train_and_time(model, X_train, y_train):
    """Fit a model and report how long it took, in seconds."""
    start = time.time()
    model.fit(X_train, y_train)
    elapsed = time.time() - start
    return model, round(elapsed, 3)
