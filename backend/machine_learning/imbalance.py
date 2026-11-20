import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from collections import Counter

class ImbalanceService:
    @staticmethod
    def assess_imbalance(y: pd.Series) -> Dict[str, Any]:
        """
        Computes class distribution, counts, percentages, and imbalance ratio.
        """
        counts = y.value_counts().to_dict()
        total = len(y.dropna())
        dist = {str(k): {"count": int(v), "percentage": round((v / total) * 100, 2)} for k, v in counts.items()}
        
        sorted_counts = sorted(counts.values(), reverse=True)
        majority = sorted_counts[0] if sorted_counts else 0
        minority = sorted_counts[-1] if sorted_counts else 0
        imbalance_ratio = round(majority / max(1, minority), 2)

        is_imbalanced = imbalance_ratio >= 2.0 and len(counts) >= 2

        severity = 'BALANCED'
        if imbalance_ratio >= 10.0:
            severity = 'SEVERE'
        elif imbalance_ratio >= 4.0:
            severity = 'HIGH'
        elif imbalance_ratio >= 2.0:
            severity = 'MODERATE'

        return {
            "is_imbalanced": is_imbalanced,
            "severity": severity,
            "imbalance_ratio": imbalance_ratio,
            "total_samples": total,
            "class_distribution": dist,
            "recommendation": (
                f"Class ratio is {imbalance_ratio}:1. Apply SMOTE oversampling or class weighting."
                if is_imbalanced else "Dataset classes are relatively balanced."
            )
        }

    @staticmethod
    def balance_dataset(
        X: pd.DataFrame,
        y: pd.Series,
        strategy: str = 'smote',
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.Series, Dict[str, Any]]:
        """
        Applies resampler on numerical feature space.
        Strategies:
        - 'smote': Synthetic Minority Over-sampling Technique
        - 'adasyn': Adaptive Synthetic
        - 'undersample': Random Under-sampling
        - 'none': Return unmodified
        """
        initial_counts = y.value_counts().to_dict()

        if strategy == 'none' or len(initial_counts) < 2:
            return X, y, {"strategy_applied": "none", "initial_counts": initial_counts, "final_counts": initial_counts}

        # Check if imblearn is installed
        try:
            from imblearn.over_sampling import SMOTE, ADASYN
            from imblearn.under_sampling import RandomUnderSampler
        except ImportError:
            return X, y, {
                "strategy_applied": "skipped",
                "reason": "imbalanced-learn not installed",
                "initial_counts": initial_counts,
                "final_counts": initial_counts
            }

        # Only apply resampling on numeric features for safety
        num_cols = list(X.select_dtypes(include=[np.number]).columns)
        if len(num_cols) < X.shape[1]:
            # Impute/encode categorical columns simply for resampler if necessary
            X_encoded = pd.get_dummies(X, drop_first=True)
        else:
            X_encoded = X.copy()

        # Fill NaNs
        X_clean = X_encoded.fillna(X_encoded.median())
        y_clean = y.loc[X_clean.index]

        try:
            if strategy == 'smote':
                k_neighbors = min(5, min(y_clean.value_counts()) - 1)
                if k_neighbors < 1:
                    return X, y, {"strategy_applied": "skipped", "reason": "Minority class too small for SMOTE"}
                sampler = SMOTE(k_neighbors=k_neighbors, random_state=random_state)
            elif strategy == 'adasyn':
                n_neighbors = min(5, min(y_clean.value_counts()) - 1)
                if n_neighbors < 1:
                    return X, y, {"strategy_applied": "skipped", "reason": "Minority class too small for ADASYN"}
                sampler = ADASYN(n_neighbors=n_neighbors, random_state=random_state)
            elif strategy == 'undersample':
                sampler = RandomUnderSampler(random_state=random_state)
            else:
                return X, y, {"strategy_applied": "unknown", "initial_counts": initial_counts}

            X_res, y_res = sampler.fit_resample(X_clean, y_clean)
            final_counts = y_res.value_counts().to_dict()

            report = {
                "strategy_applied": strategy,
                "initial_counts": initial_counts,
                "final_counts": final_counts,
                "samples_before": len(y_clean),
                "samples_after": len(y_res)
            }
            return X_res, y_res, report
        except Exception as e:
            return X, y, {
                "strategy_applied": "failed",
                "error": str(e),
                "initial_counts": initial_counts,
                "final_counts": initial_counts
            }
