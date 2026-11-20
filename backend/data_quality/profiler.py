import numpy as np
import pandas as pd
from typing import Dict, Any, List

class DatasetProfiler:
    @staticmethod
    def profile(df: pd.DataFrame) -> Dict[str, Any]:
        """Comprehensive dataset profiling producing accurate statistical analysis and data quality indicators."""
        total_rows, total_cols = df.shape
        total_cells = total_rows * total_cols if total_rows > 0 and total_cols > 0 else 1

        # Memory usage
        memory_bytes = df.memory_usage(deep=True).sum()
        memory_mb = round(memory_bytes / (1024 * 1024), 2)

        # Duplicate rows
        duplicate_rows = int(df.duplicated().sum())

        # Column classification
        numeric_cols = []
        categorical_cols = []
        datetime_cols = []
        boolean_cols = []
        text_cols = []

        columns_profile = []
        total_missing = 0
        constant_cols = []
        high_cardinality_cols = []

        for col in df.columns:
            s = df[col]
            missing_count = int(s.isna().sum())
            total_missing += missing_count
            unique_count = int(s.nunique(dropna=True))
            missing_pct = round((missing_count / total_rows) * 100, 2) if total_rows > 0 else 0
            unique_pct = round((unique_count / total_rows) * 100, 2) if total_rows > 0 else 0

            # Classification
            if pd.api.types.is_bool_dtype(s):
                dtype_group = 'boolean'
                boolean_cols.append(col)
            elif pd.api.types.is_datetime64_any_dtype(s):
                dtype_group = 'datetime'
                datetime_cols.append(col)
            elif pd.api.types.is_numeric_dtype(s):
                dtype_group = 'numeric'
                numeric_cols.append(col)
            else:
                # String / Categorical / Object
                # Check if it could be a date
                is_date = False
                non_null = s.dropna()
                if len(non_null) > 0 and s.dtype == 'object':
                    # Check first few items
                    sample = non_null.head(5)
                    try:
                        pd.to_datetime(sample, errors='raise')
                        is_date = True
                    except Exception:
                        is_date = False

                if is_date:
                    dtype_group = 'datetime'
                    datetime_cols.append(col)
                elif unique_count > 50 and unique_pct > 60:
                    dtype_group = 'text'
                    text_cols.append(col)
                else:
                    dtype_group = 'categorical'
                    categorical_cols.append(col)

            # Check flags
            if unique_count <= 1 and total_rows > 1:
                constant_cols.append(col)
            if dtype_group in ['categorical', 'text'] and unique_count > 100 and unique_pct > 30:
                high_cardinality_cols.append(col)

            # Column stats
            col_stat: Dict[str, Any] = {
                "name": col,
                "dtype": str(s.dtype),
                "dtype_group": dtype_group,
                "missing_count": missing_count,
                "missing_pct": missing_pct,
                "unique_count": unique_count,
                "unique_pct": unique_pct,
                "is_constant": unique_count <= 1,
                "is_high_cardinality": col in high_cardinality_cols
            }

            if dtype_group == 'numeric':
                clean_s = s.dropna()
                if len(clean_s) > 0:
                    q25 = float(clean_s.quantile(0.25))
                    q50 = float(clean_s.quantile(0.50))
                    q75 = float(clean_s.quantile(0.75))
                    iqr = q75 - q25
                    lower_bound = q25 - 1.5 * iqr
                    upper_bound = q75 + 1.5 * iqr
                    outliers_count = int(((clean_s < lower_bound) | (clean_s > upper_bound)).sum())

                    col_stat["stats"] = {
                        "mean": round(float(clean_s.mean()), 4),
                        "median": round(q50, 4),
                        "std": round(float(clean_s.std(ddof=1)), 4) if len(clean_s) > 1 else 0.0,
                        "var": round(float(clean_s.var(ddof=1)), 4) if len(clean_s) > 1 else 0.0,
                        "min": round(float(clean_s.min()), 4),
                        "max": round(float(clean_s.max()), 4),
                        "q25": round(q25, 4),
                        "q50": round(q50, 4),
                        "q75": round(q75, 4),
                        "iqr": round(iqr, 4),
                        "skewness": round(float(clean_s.skew()), 4) if len(clean_s) > 2 else 0.0,
                        "kurtosis": round(float(clean_s.kurtosis()), 4) if len(clean_s) > 3 else 0.0,
                        "outliers_count": outliers_count,
                        "outliers_pct": round((outliers_count / len(clean_s)) * 100, 2)
                    }

                    # Histogram bins preview
                    try:
                        counts, bin_edges = np.histogram(clean_s, bins=10)
                        col_stat["histogram"] = {
                            "bins": [round(float(b), 2) for b in bin_edges],
                            "counts": [int(c) for c in counts]
                        }
                    except Exception:
                        col_stat["histogram"] = None
                else:
                    col_stat["stats"] = None
                    col_stat["histogram"] = None

            elif dtype_group in ['categorical', 'boolean', 'text']:
                clean_s = s.dropna().astype(str)
                if len(clean_s) > 0:
                    val_counts = clean_s.value_counts()
                    top_categories = val_counts.head(10).to_dict()
                    rare_cats = val_counts[val_counts / len(clean_s) < 0.02].count()

                    col_stat["stats"] = {
                        "top_value": str(val_counts.index[0]),
                        "top_frequency": int(val_counts.iloc[0]),
                        "top_frequency_pct": round((val_counts.iloc[0] / len(clean_s)) * 100, 2),
                        "rare_categories_count": int(rare_cats),
                        "category_distribution": {str(k): int(v) for k, v in top_categories.items()}
                    }
                else:
                    col_stat["stats"] = None

            columns_profile.append(col_stat)

        # Missing heatmap matrix (sample of rows for visual rendering)
        sample_size = min(100, total_rows)
        sample_df = df.head(sample_size)
        missing_matrix = sample_df.isna().astype(int).values.tolist()

        return {
            "overview": {
                "total_rows": total_rows,
                "total_columns": total_cols,
                "memory_usage_mb": memory_mb,
                "duplicate_rows": duplicate_rows,
                "duplicate_pct": round((duplicate_rows / total_rows) * 100, 2) if total_rows > 0 else 0,
                "total_missing_cells": total_missing,
                "missing_pct": round((total_missing / total_cells) * 100, 2),
                "numeric_columns_count": len(numeric_cols),
                "categorical_columns_count": len(categorical_cols),
                "datetime_columns_count": len(datetime_cols),
                "boolean_columns_count": len(boolean_cols),
                "text_columns_count": len(text_cols),
                "constant_columns": constant_cols,
                "high_cardinality_columns": high_cardinality_cols,
            },
            "columns": columns_profile,
            "missing_matrix": {
                "columns": list(df.columns),
                "matrix": missing_matrix,
                "sample_rows": sample_size
            }
        }
