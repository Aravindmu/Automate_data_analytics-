import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer, OneHotEncoder, OrdinalEncoder
from sklearn.feature_selection import mutual_info_regression, mutual_info_classif, VarianceThreshold
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

class FeatureEngineeringService:
    @staticmethod
    def apply_feature_engineering(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        transformed = df.copy()
        log_ops = []

        # 1. Mathematical / Interaction features
        interactions = config.get('interactions', [])
        for item in interactions:
            c1 = item.get('col1')
            c2 = item.get('col2')
            op = item.get('operator', 'multiply')
            name = item.get('name') or f"{c1}_{op}_{c2}"
            if c1 in transformed.columns and c2 in transformed.columns:
                if op == 'multiply':
                    transformed[name] = transformed[c1] * transformed[c2]
                elif op == 'add':
                    transformed[name] = transformed[c1] + transformed[c2]
                elif op == 'subtract':
                    transformed[name] = transformed[c1] - transformed[c2]
                elif op == 'divide':
                    transformed[name] = transformed[c1] / (transformed[c2].replace(0, np.nan))
                log_ops.append(f"Created interaction feature '{name}' ({c1} {op} {c2}).")

        # 2. Mathematical Transformations (Log, Power)
        math_transforms = config.get('math_transforms', [])
        for item in math_transforms:
            col = item.get('column')
            transform_type = item.get('type', 'log1p')
            if col in transformed.columns and pd.api.types.is_numeric_dtype(transformed[col]):
                new_col = f"{col}_{transform_type}"
                if transform_type == 'log1p':
                    # Shift minimum if negative
                    min_val = transformed[col].min()
                    shifted = transformed[col] if min_val >= 0 else transformed[col] - min_val + 1
                    transformed[new_col] = np.log1p(shifted)
                elif transform_type == 'sqrt':
                    transformed[new_col] = np.sqrt(transformed[col].clip(lower=0))
                elif transform_type == 'power':
                    pt = PowerTransformer(method='yeo-johnson')
                    vals = transformed[[col]].dropna()
                    transformed[new_col] = pt.fit_transform(vals)
                log_ops.append(f"Applied {transform_type} transform on '{col}'.")

        # 3. Binning
        binning = config.get('binning', [])
        for item in binning:
            col = item.get('column')
            n_bins = int(item.get('bins', 5))
            strategy = item.get('strategy', 'quantile')  # quantile, uniform
            if col in transformed.columns and pd.api.types.is_numeric_dtype(transformed[col]):
                new_col = f"{col}_binned"
                if strategy == 'quantile':
                    transformed[new_col] = pd.qcut(transformed[col], q=n_bins, labels=False, duplicates='drop')
                else:
                    transformed[new_col] = pd.cut(transformed[col], bins=n_bins, labels=False)
                log_ops.append(f"Binned '{col}' into {n_bins} intervals ({strategy}).")

        # 4. Scaling (optional on dataset preview)
        scaling_cfg = config.get('scaling', {})
        scale_type = scaling_cfg.get('type')  # standard, minmax, robust
        scale_cols = scaling_cfg.get('columns', [])
        if scale_type and scale_cols:
            valid_cols = [c for c in scale_cols if c in transformed.columns and pd.api.types.is_numeric_dtype(transformed[c])]
            if valid_cols:
                if scale_type == 'standard':
                    scaler = StandardScaler()
                elif scale_type == 'minmax':
                    scaler = MinMaxScaler()
                elif scale_type == 'robust':
                    scaler = RobustScaler()
                transformed[valid_cols] = scaler.fit_transform(transformed[valid_cols])
                log_ops.append(f"Applied {scale_type.title()} scaling to: {', '.join(valid_cols)}.")

        return transformed, {"operations": log_ops, "new_columns": list(transformed.columns)}

    @staticmethod
    def calculate_feature_importance(df: pd.DataFrame, target_col: str, problem_type: str = 'auto') -> Dict[str, Any]:
        """Calculates feature relevance and mutual information relative to target."""
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset.")

        clean_df = df.dropna(subset=[target_col]).copy()
        y = clean_df[target_col]
        X = clean_df.drop(columns=[target_col])

        # Auto-detect problem type if needed
        if problem_type == 'auto':
            if pd.api.types.is_numeric_dtype(y) and y.nunique() > 10:
                problem_type = 'regression'
            else:
                problem_type = 'classification'

        # Select numeric features for quick tree/mutual info evaluation
        num_X = X.select_dtypes(include=[np.number]).dropna()
        if num_X.empty:
            return {"features": [], "problem_type": problem_type}

        y_matched = y.loc[num_X.index]

        try:
            if problem_type == 'classification':
                y_cat = pd.factorize(y_matched)[0]
                rf = RandomForestClassifier(n_estimators=50, max_depth=8, random_state=42)
                rf.fit(num_X, y_cat)
                mi = mutual_info_classif(num_X, y_cat, random_state=42)
            else:
                rf = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42)
                rf.fit(num_X, y_matched)
                mi = mutual_info_regression(num_X, y_matched, random_state=42)

            feature_scores = []
            for col, imp, m in zip(num_X.columns, rf.feature_importances_, mi):
                feature_scores.append({
                    "feature": col,
                    "random_forest_importance": round(float(imp), 4),
                    "mutual_information": round(float(m), 4),
                })

            feature_scores.sort(key=lambda x: x['random_forest_importance'], reverse=True)
            return {"features": feature_scores, "problem_type": problem_type}
        except Exception as e:
            return {"features": [], "error": str(e), "problem_type": problem_type}
