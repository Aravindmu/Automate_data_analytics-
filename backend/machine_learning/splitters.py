import pandas as pd
import numpy as np
from typing import Tuple
from sklearn.model_selection import train_test_split, TimeSeriesSplit

class DataSplitter:
    @staticmethod
    def split(
        df: pd.DataFrame,
        target_column: str,
        problem_type: str,
        test_size: float = 0.2,
        random_state: int = 42,
        split_strategy: str = 'stratified', # stratified, random, time_series
        time_column: str = None
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Leakage-free train/test dataset partitioner.
        Returns X_train, X_test, y_train, y_test.
        """
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' does not exist in dataframe.")

        # Drop rows where target is NaN
        clean_df = df.dropna(subset=[target_column]).copy()
        
        # Sort chronologically if time-series splitting requested
        if split_strategy == 'time_series' and time_column and time_column in clean_df.columns:
            clean_df = clean_df.sort_values(by=time_column)

        y = clean_df[target_column]
        X = clean_df.drop(columns=[target_column])

        # Drop time column from features if specified
        if time_column and time_column in X.columns and split_strategy == 'time_series':
            X = X.drop(columns=[time_column])

        if split_strategy == 'time_series':
            # Cut chronologically: first (1-test_size) for train, rest for test
            split_idx = int(len(clean_df) * (1 - test_size))
            X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
            y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
            return X_train, X_test, y_train, y_test

        # Classification Stratification check
        stratify = None
        if problem_type in ['classification', 'binary_classification', 'multiclass_classification'] and split_strategy == 'stratified':
            # Check if each class has at least 2 samples
            val_counts = y.value_counts()
            if (val_counts >= 2).all() and len(val_counts) > 1:
                stratify = y

        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=test_size,
            random_state=random_state,
            stratify=stratify
        )

        return X_train, X_test, y_train, y_test
