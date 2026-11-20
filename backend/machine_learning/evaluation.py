import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, log_loss,
    confusion_matrix, classification_report
)

class ModelEvaluator:
    @staticmethod
    def evaluate_regression(y_true: np.ndarray, y_pred: np.ndarray, n_features: int) -> Dict[str, Any]:
        mae = float(mean_absolute_error(y_true, y_pred))
        mse = float(mean_squared_error(y_true, y_pred))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_true, y_pred))

        # Adjusted R²
        n = len(y_true)
        p = n_features
        if n > p + 1:
            adj_r2 = float(1 - (1 - r2) * (n - 1) / (n - p - 1))
        else:
            adj_r2 = r2

        # Residuals analysis (sample up to 100 points for visualization)
        sample_indices = np.random.choice(len(y_true), size=min(100, len(y_true)), replace=False)
        residuals = [float(y_true[i] - y_pred[i]) for i in sample_indices]
        sample_actual = [float(y_true[i]) for i in sample_indices]
        sample_predicted = [float(y_pred[i]) for i in sample_indices]

        return {
            "mae": round(mae, 4),
            "mse": round(mse, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
            "adjusted_r2": round(adj_r2, 4),
            "residuals_plot": {
                "actual": sample_actual,
                "predicted": sample_predicted,
                "residuals": residuals
            }
        }

    @staticmethod
    def evaluate_classification(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray = None, labels: List[Any] = None) -> Dict[str, Any]:
        acc = float(accuracy_score(y_true, y_pred))
        prec_macro = float(precision_score(y_true, y_pred, average='macro', zero_division=0))
        prec_weighted = float(precision_score(y_true, y_pred, average='weighted', zero_division=0))
        rec_macro = float(recall_score(y_true, y_pred, average='macro', zero_division=0))
        rec_weighted = float(recall_score(y_true, y_pred, average='weighted', zero_division=0))
        f1_macro = float(f1_score(y_true, y_pred, average='macro', zero_division=0))
        f1_weighted = float(f1_score(y_true, y_pred, average='weighted', zero_division=0))

        # ROC-AUC & Log Loss if probabilities provided
        roc_auc = None
        pr_auc = None
        loss = None

        unique_classes = np.unique(y_true)
        is_binary = len(unique_classes) == 2

        if y_prob is not None:
            try:
                if is_binary:
                    # Select positive class prob
                    prob_pos = y_prob[:, 1] if y_prob.ndim == 2 and y_prob.shape[1] == 2 else y_prob
                    roc_auc = float(roc_auc_score(y_true, prob_pos))
                    pr_auc = float(average_precision_score(y_true, prob_pos))
                    loss = float(log_loss(y_true, y_prob))
                else:
                    roc_auc = float(roc_auc_score(y_true, y_prob, multi_class='ovr'))
                    loss = float(log_loss(y_true, y_prob))
            except Exception:
                pass

        # Confusion Matrix
        cm = confusion_matrix(y_true, y_pred, labels=labels)
        label_strs = [str(l) for l in (labels if labels is not None else unique_classes)]

        # Classification report
        try:
            clf_rep = classification_report(y_true, y_pred, labels=labels, output_dict=True, zero_division=0)
        except Exception:
            clf_rep = {}

        return {
            "accuracy": round(acc, 4),
            "precision": round(prec_weighted, 4),
            "precision_macro": round(prec_macro, 4),
            "recall": round(rec_weighted, 4),
            "recall_macro": round(rec_macro, 4),
            "f1": round(f1_weighted, 4),
            "f1_macro": round(f1_macro, 4),
            "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
            "pr_auc": round(pr_auc, 4) if pr_auc is not None else None,
            "log_loss": round(loss, 4) if loss is not None else None,
            "confusion_matrix": {
                "matrix": cm.tolist(),
                "labels": label_strs
            },
            "classification_report": clf_rep
        }
