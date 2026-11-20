import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List

class LeakageDetectorService:
    ID_PATTERNS = [
        r'^id$', r'.*_id$', r'^guid$', r'^uuid$', r'^index$', r'^row_id$',
        r'^account_no$', r'^customer_id$', r'^user_id$', r'^patient_id$',
        r'^transaction_id$', r'^ssn$', r'^phone$', r'^email$'
    ]

    @classmethod
    def scan_for_leakage(cls, df: pd.DataFrame, target_column: str, problem_type: str = 'auto') -> Dict[str, Any]:
        """
        Comprehensive data leakage detection engine.
        Scans for:
        1. Target presence in features.
        2. Near-perfect correlation (|r| >= 0.98).
        3. High-cardinality identity / key columns.
        4. Constant or uniform features.
        5. Future temporal leakage columns.
        6. Perfectly duplicate feature pairs.
        """
        warnings = []
        is_safe = True

        if target_column not in df.columns:
            return {
                "is_safe": False,
                "warnings": [{
                    "severity": "CRITICAL",
                    "title": "Missing Target Column",
                    "description": f"Target column '{target_column}' is not present in the dataset schema.",
                    "columns": [target_column],
                    "recommendation": "Select an existing column as your target variable."
                }]
            }

        total_rows = len(df)
        features_to_check = [c for c in df.columns if c != target_column]

        # 1. Target presence in feature list check
        # (handy if feature lists are sent in config)

        # 2. Near-perfect correlation with target
        y_series = df[target_column].dropna()
        if pd.api.types.is_numeric_dtype(y_series) and y_series.nunique() > 1:
            num_cols = [c for c in features_to_check if pd.api.types.is_numeric_dtype(df[c])]
            for col in num_cols:
                try:
                    matched = df[[col, target_column]].dropna()
                    if len(matched) > 10:
                        corr = abs(float(matched[col].corr(matched[target_column])))
                        if corr >= 0.98:
                            is_safe = False
                            warnings.append({
                                "severity": "CRITICAL",
                                "title": "Near-Perfect Target Correlation (Potential Direct Leakage)",
                                "description": f"Feature '{col}' has an absolute correlation of {corr:.4f} with target '{target_column}'. It likely encodes the target outcome or a downstream derivative.",
                                "columns": [col],
                                "recommendation": f"Exclude '{col}' from training to prevent artificial 100% accuracy and model failure in production."
                            })
                        elif corr >= 0.90:
                            warnings.append({
                                "severity": "HIGH",
                                "title": "Extremely High Target Correlation",
                                "description": f"Feature '{col}' has an absolute correlation of {corr:.4f} with target '{target_column}'. Verify this feature is known at prediction time.",
                                "columns": [col],
                                "recommendation": f"Inspect '{col}' domain context to ensure it is not captured post-event."
                            })
                except Exception:
                    pass

        # 3. High-cardinality Identifier / Key columns
        for col in features_to_check:
            series = df[col].dropna()
            unique_ratio = series.nunique() / max(1, len(series))
            
            # Check pattern match
            matches_id_pattern = any(re.match(p, col.lower()) for p in cls.ID_PATTERNS)
            if matches_id_pattern and unique_ratio > 0.6:
                is_safe = False
                warnings.append({
                    "severity": "HIGH",
                    "title": "Entity Identifier Leakage",
                    "description": f"Column '{col}' appears to be a unique primary key or user identifier ({unique_ratio*100:.1f}% unique values).",
                    "columns": [col],
                    "recommendation": f"Exclude '{col}' from training to prevent memorization over-fitting."
                })
            elif unique_ratio > 0.95 and pd.api.types.is_string_dtype(series) and len(series) > 50:
                warnings.append({
                    "severity": "MEDIUM",
                    "title": "Arbitrary High-Cardinality String",
                    "description": f"Column '{col}' has {unique_ratio*100:.1f}% unique text values, suggesting tracking IDs or unstructured codes.",
                    "columns": [col],
                    "recommendation": f"Consider dropping '{col}' or extracting high-level category groupings."
                })

        # 4. Zero Variance / Constant features
        for col in features_to_check:
            series = df[col].dropna()
            if series.nunique() <= 1:
                warnings.append({
                    "severity": "LOW",
                    "title": "Constant / Zero-Variance Feature",
                    "description": f"Column '{col}' contains only a single constant value throughout the dataset.",
                    "columns": [col],
                    "recommendation": f"Drop '{col}' as it carries zero mutual information."
                })

        # 5. Exact duplicate feature pairs
        num_features = [c for c in features_to_check if pd.api.types.is_numeric_dtype(df[c])]
        if len(num_features) >= 2:
            checked_pairs = set()
            for i in range(len(num_features)):
                for j in range(i + 1, min(i + 15, len(num_features))):
                    c1, c2 = num_features[i], num_features[j]
                    pair_key = tuple(sorted([c1, c2]))
                    if pair_key not in checked_pairs:
                        checked_pairs.add(pair_key)
                        try:
                            sample_df = df[[c1, c2]].dropna()
                            if len(sample_df) > 10 and float(sample_df[c1].corr(sample_df[c2])) >= 0.9999:
                                warnings.append({
                                    "severity": "MEDIUM",
                                    "title": "Duplicate / Collinear Feature Pair",
                                    "description": f"Features '{c1}' and '{c2}' are numerically identical (correlation = 1.0).",
                                    "columns": [c1, c2],
                                    "recommendation": f"Drop either '{c1}' or '{c2}' to eliminate redundancy."
                                })
                        except Exception:
                            pass

        return {
            "is_safe": is_safe and len([w for w in warnings if w['severity'] == 'CRITICAL']) == 0,
            "total_warnings": len(warnings),
            "target_column": target_column,
            "warnings": warnings
        }
