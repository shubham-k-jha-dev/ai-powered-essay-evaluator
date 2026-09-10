"""
evaluate.py

Metrics for Review 1 - Step 9:
  - regression metrics (MAE, MSE, RMSE, R2) for the main scoring task
  - classification metrics (accuracy, precision, recall, F1, confusion
    matrix) for the SECONDARY Low/Medium/High experiment only
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix,
)


def regression_metrics(y_true, y_pred) -> dict:
    """MAE, MSE, RMSE, R2 - the four metrics used for the main task."""
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    return {"MAE": round(mae, 4), "MSE": round(mse, 4), "RMSE": round(rmse, 4), "R2": round(r2, 4)}


def classification_metrics(y_true, y_pred) -> dict:
    """
    Accuracy, precision, recall, F1 for the SECONDARY classification
    experiment. Uses 'weighted' averaging since Low/Medium/High are not
    perfectly balanced classes.
    """
    return {
        "Accuracy": round(accuracy_score(y_true, y_pred), 4),
        "Precision": round(precision_score(y_true, y_pred, average="weighted", zero_division=0), 4),
        "Recall": round(recall_score(y_true, y_pred, average="weighted", zero_division=0), 4),
        "F1": round(f1_score(y_true, y_pred, average="weighted", zero_division=0), 4),
    }


def plot_confusion_matrix(y_true, y_pred, labels, title="Confusion Matrix", save_path=None):
    """Plot and optionally save a labeled confusion matrix heatmap."""
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=labels, yticklabels=labels, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(title)
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path)
    plt.show()
    return cm
