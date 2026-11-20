import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.impute import KNNImputer
from sklearn.ensemble import IsolationForest

class DataCleaner:
    @staticmethod
    def clean(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes a sequence of configurable data cleaning operations on a copy of df.
        Returns the cleaned DataFrame and a comprehensive audit report of changes made.
        """
        cleaned = df.copy()
        initial_rows, initial_cols = cleaned.shape
        initial_missing = int(cleaned.isna().sum().sum())

        audit: Dict[str, Any] = {
            "initial_shape": [initial_rows, initial_cols],
            "initial_missing_count": initial_missing,
            "operations_applied": [],
            "duplicates_removed": 0,
            "outliers_modified": 0,
            "missing_values_imputed": 0,
            "columns_dropped": [],
            "columns_added": [],
            "renamed_columns": {},
        }

        # 1. String Normalization & Column Renaming
        str_norm_cfg = config.get('string_normalization', {})
        if str_norm_cfg.get('enabled', True):
            # Normalize column names
            if str_norm_cfg.get('clean_column_names', True):
                new_cols = {}
                for c in cleaned.columns:
                    # Replace special chars and strip
                    clean_name = re.sub(r'[^\w\s]', '', str(c)).strip()
                    clean_name = re.sub(r'\s+', '_', clean_name).lower()
                    if not clean_name:
                        clean_name = f"col_{len(new_cols)}"
                    new_cols[c] = clean_name
                cleaned.rename(columns=new_cols, inplace=True)
                audit['renamed_columns'] = {str(k): v for k, v in new_cols.items() if str(k) != v}
                audit['operations_applied'].append("Cleaned and normalized column names to snake_case.")

            # Replace placeholders with NaN
            placeholders = ['na', 'n/a', 'null', 'none', '?', '-', '--', 'nan', 'nil', 'unknown']
            for c in cleaned.select_dtypes(include=['object', 'string']).columns:
                cleaned[c] = cleaned[c].apply(lambda x: None if str(x).strip().lower() in placeholders or str(x).strip() == '' else x)
                # Trim leading/trailing whitespace
                if str_norm_cfg.get('strip_whitespace', True):
                    cleaned[c] = cleaned[c].apply(lambda x: x.strip() if isinstance(x, str) else x)

            audit['operations_applied'].append("Standardized missing placeholders & stripped text whitespace.")

        # 2. Duplicate Detection & Removal
        dup_cfg = config.get('duplicates', {})
        if dup_cfg.get('enabled', True):
            subset = dup_cfg.get('subset')
            keep = dup_cfg.get('keep', 'first')
            dups_count = int(cleaned.duplicated(subset=subset).sum())
            if dups_count > 0:
                cleaned.drop_duplicates(subset=subset, keep=keep, inplace=True)
                audit['duplicates_removed'] = dups_count
                audit['operations_applied'].append(f"Removed {dups_count} duplicate records.")

        # 3. Missing Value Imputation
        missing_cfg = config.get('missing_values', {})
        if missing_cfg.get('enabled', True):
            impute_count = 0
            default_num_strategy = missing_cfg.get('numeric_strategy', 'median')  # mean, median, constant, knn
            default_cat_strategy = missing_cfg.get('categorical_strategy', 'mode')  # mode, missing_token, constant
            col_strategies = missing_cfg.get('columns', {})

            # Numeric columns
            num_cols = cleaned.select_dtypes(include=[np.number]).columns
            for col in num_cols:
                n_missing = int(cleaned[col].isna().sum())
                if n_missing > 0:
                    strat = col_strategies.get(col, default_num_strategy)
                    if strat == 'mean':
                        val = cleaned[col].mean()
                        cleaned[col].fillna(val, inplace=True)
                    elif strat == 'median':
                        val = cleaned[col].median()
                        cleaned[col].fillna(val, inplace=True)
                    elif strat == 'constant':
                        const_val = missing_cfg.get('numeric_constant', 0)
                        cleaned[col].fillna(const_val, inplace=True)
                    impute_count += n_missing

            # If KNN imputation selected globally for numerics
            if default_num_strategy == 'knn' and len(num_cols) > 1 and cleaned[num_cols].isna().sum().sum() > 0:
                knn = KNNImputer(n_neighbors=5)
                cleaned[num_cols] = knn.fit_transform(cleaned[num_cols])

            # Categorical columns
            cat_cols = cleaned.select_dtypes(exclude=[np.number, 'datetime64']).columns
            for col in cat_cols:
                n_missing = int(cleaned[col].isna().sum())
                if n_missing > 0:
                    strat = col_strategies.get(col, default_cat_strategy)
                    if strat == 'mode':
                        mode_val = cleaned[col].mode()
                        fill_val = mode_val.iloc[0] if len(mode_val) > 0 else 'Unknown'
                        cleaned[col].fillna(fill_val, inplace=True)
                    elif strat == 'missing_token':
                        cleaned[col].fillna('Missing', inplace=True)
                    elif strat == 'constant':
                        const_val = missing_cfg.get('categorical_constant', 'Unknown')
                        cleaned[col].fillna(const_val, inplace=True)
                    impute_count += n_missing

            audit['missing_values_imputed'] = impute_count
            if impute_count > 0:
                audit['operations_applied'].append(f"Imputed {impute_count} missing values using selected strategies.")

        # 4. Outlier Handling
        outlier_cfg = config.get('outliers', {})
        if outlier_cfg.get('enabled', False):
            method = outlier_cfg.get('method', 'iqr')  # iqr, zscore, isolation_forest
            action = outlier_cfg.get('action', 'winsorize')  # winsorize, remove, keep
            target_cols = outlier_cfg.get('columns', list(cleaned.select_dtypes(include=[np.number]).columns))

            outliers_count = 0
            if action != 'keep':
                if method == 'iqr':
                    for col in target_cols:
                        if col in cleaned.columns and pd.api.types.is_numeric_dtype(cleaned[col]):
                            q25 = cleaned[col].quantile(0.25)
                            q75 = cleaned[col].quantile(0.75)
                            iqr = q75 - q25
                            lower = q25 - 1.5 * iqr
                            upper = q75 + 1.5 * iqr
                            mask = (cleaned[col] < lower) | (cleaned[col] > upper)
                            n_out = int(mask.sum())
                            if n_out > 0:
                                outliers_count += n_out
                                if action == 'winsorize':
                                    cleaned[col] = cleaned[col].clip(lower=lower, upper=upper)
                                elif action == 'remove':
                                    cleaned = cleaned[~mask]

                elif method == 'zscore':
                    for col in target_cols:
                        if col in cleaned.columns and pd.api.types.is_numeric_dtype(cleaned[col]):
                            mean = cleaned[col].mean()
                            std = cleaned[col].std()
                            if std > 0:
                                z = (cleaned[col] - mean) / std
                                mask = z.abs() > 3.0
                                n_out = int(mask.sum())
                                if n_out > 0:
                                    outliers_count += n_out
                                    if action == 'winsorize':
                                        cleaned[col] = cleaned[col].clip(lower=mean - 3 * std, upper=mean + 3 * std)
                                    elif action == 'remove':
                                        cleaned = cleaned[~mask]

                elif method == 'isolation_forest' and len(target_cols) > 1:
                    num_data = cleaned[target_cols].dropna()
                    if len(num_data) > 20:
                        iso = IsolationForest(contamination=0.03, random_state=42)
                        preds = iso.fit_predict(num_data)
                        outlier_indices = num_data.index[preds == -1]
                        outliers_count = len(outlier_indices)
                        if action == 'remove':
                            cleaned = cleaned.drop(index=outlier_indices)

            audit['outliers_modified'] = outliers_count
            if outliers_count > 0:
                audit['operations_applied'].append(f"Handled {outliers_count} outliers using {method.upper()} with action '{action}'.")

        # 5. Datetime Processing & Feature Extraction
        dt_cfg = config.get('datetime', {})
        if dt_cfg.get('enabled', True):
            for col in list(cleaned.columns):
                # Attempt datetime parse if object with date pattern
                if cleaned[col].dtype == 'object':
                    sample = cleaned[col].dropna().head(10)
                    if len(sample) > 0:
                        try:
                            # Try parsing
                            parsed = pd.to_datetime(cleaned[col], errors='coerce')
                            if parsed.notna().sum() > (len(cleaned) * 0.7):
                                cleaned[col] = parsed
                        except Exception:
                            pass

                # If datetime column, extract features if configured
                if pd.api.types.is_datetime64_any_dtype(cleaned[col]) and dt_cfg.get('extract_features', True):
                    cleaned[f"{col}_year"] = cleaned[col].dt.year
                    cleaned[f"{col}_month"] = cleaned[col].dt.month
                    cleaned[f"{col}_day"] = cleaned[col].dt.day
                    cleaned[f"{col}_dayofweek"] = cleaned[col].dt.dayofweek
                    cleaned[f"{col}_is_weekend"] = cleaned[col].dt.dayofweek.isin([5, 6]).astype(int)
                    audit['columns_added'].extend([f"{col}_year", f"{col}_month", f"{col}_day", f"{col}_dayofweek", f"{col}_is_weekend"])
                    audit['operations_applied'].append(f"Extracted temporal features from datetime column '{col}'.")

        # 6. Drop Constant or User-specified Columns
        drop_cols = config.get('drop_columns', [])
        if config.get('drop_constant_columns', False):
            const_cols = [c for c in cleaned.columns if cleaned[c].nunique(dropna=True) <= 1]
            drop_cols = list(set(drop_cols + const_cols))

        if drop_cols:
            valid_drops = [c for c in drop_cols if c in cleaned.columns]
            if valid_drops:
                cleaned.drop(columns=valid_drops, inplace=True)
                audit['columns_dropped'] = valid_drops
                audit['operations_applied'].append(f"Dropped columns: {', '.join(valid_drops)}.")

        final_rows, final_cols = cleaned.shape
        final_missing = int(cleaned.isna().sum().sum())

        audit['final_shape'] = [final_rows, final_cols]
        audit['final_missing_count'] = final_missing

        return cleaned, audit
