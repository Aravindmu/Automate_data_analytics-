import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import PolynomialFeatures

class FeatureExtractionService:
    @staticmethod
    def extract_features(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Extracts new predictive features from text, datetime, numeric, and categorical columns.
        Returns transformed dataframe and operations audit.
        """
        transformed = df.copy()
        log_ops = []
        new_cols_created = []

        # 1. Text Feature Extraction
        text_config = config.get('text', [])
        for item in text_config:
            col = item.get('column')
            if col in transformed.columns:
                series = transformed[col].astype(str).fillna('')
                methods = item.get('methods', ['word_count', 'char_count'])
                
                if 'char_count' in methods:
                    char_col = f"{col}_char_count"
                    transformed[char_col] = series.str.len()
                    new_cols_created.append(char_col)
                    log_ops.append(f"Extracted character count from '{col}'.")

                if 'word_count' in methods:
                    word_col = f"{col}_word_count"
                    transformed[word_col] = series.apply(lambda s: len(s.split()))
                    new_cols_created.append(word_col)
                    log_ops.append(f"Extracted word count from '{col}'.")

                if 'avg_word_length' in methods:
                    avg_col = f"{col}_avg_word_len"
                    transformed[avg_col] = series.apply(
                        lambda s: (len(s) / max(1, len(s.split()))) if s.strip() else 0.0
                    ).round(2)
                    new_cols_created.append(avg_col)
                    log_ops.append(f"Extracted average word length from '{col}'.")

                if 'uppercase_count' in methods:
                    upper_col = f"{col}_uppercase_count"
                    transformed[upper_col] = series.apply(lambda s: sum(1 for c in s if c.isupper()))
                    new_cols_created.append(upper_col)
                    log_ops.append(f"Extracted uppercase character count from '{col}'.")

                if 'tfidf' in methods:
                    max_features = int(item.get('tfidf_max_features', 5))
                    try:
                        tfidf = TfidfVectorizer(max_features=max_features, stop_words='english')
                        tfidf_matrix = tfidf.fit_transform(series)
                        feature_names = [f"{col}_tfidf_{re.sub(r'[^a-zA-Z0-9]', '_', fn)}" for fn in tfidf.get_feature_names_out()]
                        tfidf_df = pd.DataFrame(tfidf_matrix.toarray(), columns=feature_names, index=transformed.index)
                        transformed = pd.concat([transformed, tfidf_df], axis=1)
                        new_cols_created.extend(feature_names)
                        log_ops.append(f"Extracted top {len(feature_names)} TF-IDF n-grams from '{col}'.")
                    except Exception as e:
                        log_ops.append(f"TF-IDF extraction for '{col}' skipped: {str(e)}.")

        # 2. Datetime Feature Extraction
        date_config = config.get('datetime', [])
        for item in date_config:
            col = item.get('column')
            if col in transformed.columns:
                parsed_dt = pd.to_datetime(transformed[col], errors='coerce')
                parts = item.get('parts', ['year', 'month', 'day', 'dayofweek', 'is_weekend', 'quarter'])

                if 'year' in parts:
                    y_col = f"{col}_year"
                    transformed[y_col] = parsed_dt.dt.year
                    new_cols_created.append(y_col)

                if 'month' in parts:
                    m_col = f"{col}_month"
                    transformed[m_col] = parsed_dt.dt.month
                    new_cols_created.append(m_col)

                if 'day' in parts:
                    d_col = f"{col}_day"
                    transformed[d_col] = parsed_dt.dt.day
                    new_cols_created.append(d_col)

                if 'hour' in parts:
                    h_col = f"{col}_hour"
                    transformed[h_col] = parsed_dt.dt.hour
                    new_cols_created.append(h_col)

                if 'dayofweek' in parts:
                    dow_col = f"{col}_dayofweek"
                    transformed[dow_col] = parsed_dt.dt.dayofweek
                    new_cols_created.append(dow_col)

                if 'day_name' in parts:
                    name_col = f"{col}_day_name"
                    transformed[name_col] = parsed_dt.dt.day_name()
                    new_cols_created.append(name_col)

                if 'is_weekend' in parts:
                    w_col = f"{col}_is_weekend"
                    transformed[w_col] = parsed_dt.dt.dayofweek.isin([5, 6]).astype(int)
                    new_cols_created.append(w_col)

                if 'quarter' in parts:
                    q_col = f"{col}_quarter"
                    transformed[q_col] = parsed_dt.dt.quarter
                    new_cols_created.append(q_col)

                if 'dayofyear' in parts:
                    doy_col = f"{col}_dayofyear"
                    transformed[doy_col] = parsed_dt.dt.dayofyear
                    new_cols_created.append(doy_col)

                log_ops.append(f"Extracted temporal components ({', '.join(parts)}) from '{col}'.")

        # 3. Polynomial Features
        poly_config = config.get('polynomial', {})
        poly_cols = poly_config.get('columns', [])
        degree = int(poly_config.get('degree', 2))
        include_bias = bool(poly_config.get('include_bias', False))
        interaction_only = bool(poly_config.get('interaction_only', False))

        valid_poly_cols = [c for c in poly_cols if c in transformed.columns and pd.api.types.is_numeric_dtype(transformed[c])]
        if len(valid_poly_cols) >= 2:
            try:
                poly = PolynomialFeatures(degree=degree, include_bias=include_bias, interaction_only=interaction_only)
                poly_data = transformed[valid_poly_cols].fillna(transformed[valid_poly_cols].median())
                poly_matrix = poly.fit_transform(poly_data)
                feature_names = poly.get_feature_names_out(valid_poly_cols)
                
                # Exclude original columns
                new_poly_names = [f"poly_{fn.replace(' ', '_').replace('^', '_pow_')}" for fn in feature_names if fn not in valid_poly_cols and fn != '1']
                poly_slice = poly_matrix[:, len(valid_poly_cols) + (1 if include_bias else 0):]
                
                if poly_slice.shape[1] == len(new_poly_names):
                    poly_df = pd.DataFrame(poly_slice, columns=new_poly_names, index=transformed.index)
                    transformed = pd.concat([transformed, poly_df], axis=1)
                    new_cols_created.extend(new_poly_names)
                    log_ops.append(f"Generated {len(new_poly_names)} polynomial interactions (degree {degree}) for {', '.join(valid_poly_cols)}.")
            except Exception as e:
                log_ops.append(f"Polynomial generation failed: {str(e)}.")

        # 4. Target Encoding / Frequency Encoding
        encoding_config = config.get('encoding', [])
        target_col = config.get('target_column')

        for enc in encoding_config:
            col = enc.get('column')
            method = enc.get('method', 'frequency')  # 'frequency' or 'target'
            if col in transformed.columns:
                if method == 'frequency':
                    freq_map = transformed[col].value_counts(normalize=True).to_dict()
                    f_col = f"{col}_freq_encoded"
                    transformed[f_col] = transformed[col].map(freq_map).round(4)
                    new_cols_created.append(f_col)
                    log_ops.append(f"Applied frequency encoding on '{col}'.")
                elif method == 'target' and target_col and target_col in transformed.columns:
                    target_means = transformed.groupby(col)[target_col].mean().to_dict()
                    t_col = f"{col}_target_encoded"
                    transformed[t_col] = transformed[col].map(target_means).round(4)
                    new_cols_created.append(t_col)
                    log_ops.append(f"Applied target encoding on '{col}' using target '{target_col}'.")

        report = {
            "operations": log_ops,
            "new_features_count": len(new_cols_created),
            "new_features": new_cols_created,
            "total_columns": len(transformed.columns)
        }
        return transformed, report
