import numpy as np
import pandas as pd
from typing import List, Tuple
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, OneHotEncoder

class PipelineBuilder:
    @staticmethod
    def build_preprocessor(
        numeric_features: List[str],
        categorical_features: List[str],
        scaler_type: str = 'standard', # standard, minmax, robust, none
        num_impute_strategy: str = 'median',
        cat_impute_strategy: str = 'most_frequent'
    ) -> ColumnTransformer:
        """
        Builds a leakage-free Scikit-learn ColumnTransformer.
        Transformers are fitted ONLY on training folds and serialize cleanly.
        """
        transformers = []

        # 1. Numeric pipeline
        if numeric_features:
            num_steps = [
                ('imputer', SimpleImputer(strategy=num_impute_strategy))
            ]
            if scaler_type == 'standard':
                num_steps.append(('scaler', StandardScaler()))
            elif scaler_type == 'minmax':
                num_steps.append(('scaler', MinMaxScaler()))
            elif scaler_type == 'robust':
                num_steps.append(('scaler', RobustScaler()))

            num_pipeline = Pipeline(steps=num_steps)
            transformers.append(('num', num_pipeline, numeric_features))

        # 2. Categorical pipeline
        if categorical_features:
            cat_pipeline = Pipeline(steps=[
                ('imputer', SimpleImputer(strategy=cat_impute_strategy, fill_value='missing')),
                ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
            ])
            transformers.append(('cat', cat_pipeline, categorical_features))

        preprocessor = ColumnTransformer(transformers=transformers, remainder='drop')
        return preprocessor

    @staticmethod
    def build_full_pipeline(preprocessor: ColumnTransformer, estimator) -> Pipeline:
        """Constructs an integrated end-to-end pipeline containing preprocessor + estimator."""
        return Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', estimator)
        ])
