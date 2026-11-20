import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.feature_selection import (
    VarianceThreshold,
    SelectKBest,
    f_classif,
    f_regression,
    mutual_info_classif,
    mutual_info_regression,
    RFE
)
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

class FeatureSelectionService:
    @staticmethod
    def analyze_selection(df: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes feature importances, low variance columns, collinearity, and statistical relevance.
        """
        target_col = config.get('target_column')
        problem_type = config.get('problem_type', 'auto')
        var_threshold = float(config.get('variance_threshold', 0.01))
        corr_threshold = float(config.get('correlation_threshold', 0.90))

        clean_df = df.copy()
        numeric_cols = list(clean_df.select_dtypes(include=[np.number]).columns)
        if target_col and target_col in numeric_cols:
            numeric_cols.remove(target_col)

        # 1. Variance Analysis
        var_results = []
        low_variance_dropped = []
        for col in numeric_cols:
            series = clean_df[col].dropna()
            var_val = float(series.var()) if len(series) > 1 else 0.0
            is_low = var_val <= var_threshold
            var_results.append({
                "feature": col,
                "variance": round(var_val, 4),
                "is_low_variance": is_low
            })
            if is_low:
                low_variance_dropped.append(col)

        # 2. Correlation Collinearity Analysis
        collinear_pairs = []
        high_corr_dropped = set()
        if len(numeric_cols) >= 2:
            corr_mat = clean_df[numeric_cols].corr().abs().copy()
            corr_vals = corr_mat.to_numpy(copy=True)
            np.fill_diagonal(corr_vals, 0)
            corr_mat = pd.DataFrame(corr_vals, index=corr_mat.index, columns=corr_mat.columns)
            
            for i in range(len(numeric_cols)):
                for j in range(i + 1, len(numeric_cols)):
                    c1, c2 = numeric_cols[i], numeric_cols[j]
                    val = float(corr_mat.loc[c1, c2])
                    if val >= corr_threshold:
                        collinear_pairs.append({
                            "feature_a": c1,
                            "feature_b": c2,
                            "correlation": round(val, 4),
                            "recommended_to_drop": c2
                        })
                        high_corr_dropped.add(c2)

        # 3. Target Relevance / SelectKBest (if target available)
        relevance_scores = []
        if target_col and target_col in clean_df.columns:
            valid_rows = clean_df.dropna(subset=[target_col])
            y = valid_rows[target_col]
            X = valid_rows[numeric_cols].fillna(valid_rows[numeric_cols].median())

            if problem_type == 'auto':
                problem_type = 'regression' if pd.api.types.is_numeric_dtype(y) and y.nunique() > 10 else 'classification'

            if not X.empty:
                try:
                    if problem_type == 'classification':
                        y_enc = pd.factorize(y)[0]
                        mi_scores = mutual_info_classif(X, y_enc, random_state=42)
                        f_scores, _ = f_classif(X, y_enc)
                    else:
                        mi_scores = mutual_info_regression(X, y, random_state=42)
                        f_scores, _ = f_regression(X, y)

                    for col, mi, f_val in zip(numeric_cols, mi_scores, f_scores):
                        relevance_scores.append({
                            "feature": col,
                            "mutual_info": round(float(mi), 4),
                            "f_score": round(float(f_val) if not np.isnan(f_val) else 0.0, 2)
                        })
                    relevance_scores.sort(key=lambda x: x['mutual_info'], reverse=True)
                except Exception:
                    pass

        return {
            "target_column": target_col,
            "problem_type": problem_type,
            "variance_analysis": var_results,
            "low_variance_dropped": low_variance_dropped,
            "collinear_pairs": collinear_pairs,
            "high_corr_dropped": list(high_corr_dropped),
            "relevance_rankings": relevance_scores
        }

    @staticmethod
    def apply_selection(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes feature selection, dropping unwanted features and returning filtered DataFrame.
        """
        transformed = df.copy()
        log_ops = []
        dropped_cols = []

        # Explicit features to drop
        drop_list = config.get('drop_features', [])
        for col in drop_list:
            if col in transformed.columns:
                transformed.drop(columns=[col], inplace=True)
                dropped_cols.append(col)
                log_ops.append(f"Explicitly dropped feature '{col}'.")

        # Automatic low variance filtering
        if config.get('drop_low_variance', False):
            threshold = float(config.get('variance_threshold', 0.01))
            num_cols = list(transformed.select_dtypes(include=[np.number]).columns)
            target = config.get('target_column')
            if target in num_cols:
                num_cols.remove(target)
            for c in num_cols:
                if transformed[c].var() <= threshold:
                    transformed.drop(columns=[c], inplace=True)
                    dropped_cols.append(c)
                    log_ops.append(f"Dropped low variance feature '{c}' (var <= {threshold}).")

        # Automatic high correlation filtering
        if config.get('drop_high_correlation', False):
            corr_threshold = float(config.get('correlation_threshold', 0.95))
            num_cols = list(transformed.select_dtypes(include=[np.number]).columns)
            target = config.get('target_column')
            if target in num_cols:
                num_cols.remove(target)

            if len(num_cols) >= 2:
                corr_matrix = transformed[num_cols].corr().abs().copy()
                upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                to_drop = [col for col in upper.columns if any(upper[col] > corr_threshold)]
                for c in to_drop:
                    if c in transformed.columns:
                        transformed.drop(columns=[c], inplace=True)
                        dropped_cols.append(c)
                        log_ops.append(f"Dropped collinear feature '{c}' (corr > {corr_threshold}).")

        # Select Top K features if specified
        top_k = config.get('select_k_best')
        target_col = config.get('target_column')
        if top_k and target_col and target_col in transformed.columns:
            k_val = int(top_k)
            numeric_cols = list(transformed.select_dtypes(include=[np.number]).columns)
            if target_col in numeric_cols:
                numeric_cols.remove(target_col)

            if len(numeric_cols) > k_val:
                valid_df = transformed.dropna(subset=[target_col])
                X = valid_df[numeric_cols].fillna(valid_df[numeric_cols].median())
                y = valid_df[target_col]
                problem_type = config.get('problem_type', 'regression')

                if problem_type == 'classification':
                    score_fn = mutual_info_classif
                    y_proc = pd.factorize(y)[0]
                else:
                    score_fn = mutual_info_regression
                    y_proc = y

                selector = SelectKBest(score_func=score_fn, k=k_val)
                selector.fit(X, y_proc)
                selected_mask = selector.get_support()
                selected_names = [col for col, keep in zip(numeric_cols, selected_mask) if keep]
                unselected = [col for col in numeric_cols if col not in selected_names]

                for c in unselected:
                    if c in transformed.columns:
                        transformed.drop(columns=[c], inplace=True)
                        dropped_cols.append(c)
                log_ops.append(f"SelectKBest retained top {k_val} features out of {len(numeric_cols)} based on mutual information.")

        report = {
            "operations": log_ops,
            "dropped_features": list(set(dropped_cols)),
            "remaining_features_count": len(transformed.columns),
            "remaining_features": list(transformed.columns)
        }
        return transformed, report
