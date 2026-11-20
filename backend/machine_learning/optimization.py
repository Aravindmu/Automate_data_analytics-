import optuna
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.model_selection import cross_val_score
from .model_registry import ModelRegistry
from .preprocessing import PipelineBuilder

optuna.logging.set_verbosity(optuna.logging.WARNING)

class HyperparameterOptimizer:
    @staticmethod
    def optimize(
        model_key: str,
        problem_type: str,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        numeric_features: list,
        categorical_features: list,
        metric: str = 'f1' if 'class' in 'problem_type' else 'r2',
        n_trials: int = 10,
        cv_folds: int = 3
    ) -> Tuple[Dict[str, Any], Any]:
        """
        Runs Optuna trials to identify optimal hyperparameters using cross-validation.
        Ensures preprocessing is re-fit inside each CV fold without leakage.
        """
        catalog = ModelRegistry.REGRESSION_MODELS if problem_type == 'regression' else ModelRegistry.CLASSIFICATION_MODELS
        if model_key not in catalog:
            return {}, None

        optuna_space_fn = catalog[model_key]['optuna_space']
        constructor = catalog[model_key]['constructor']

        scoring_map = {
            'r2': 'r2',
            'neg_rmse': 'neg_root_mean_squared_error',
            'neg_mae': 'neg_mean_absolute_error',
            'accuracy': 'accuracy',
            'f1': 'f1_weighted',
            'roc_auc': 'roc_auc_ovr'
        }
        scorer = scoring_map.get(metric, 'r2' if problem_type == 'regression' else 'f1_weighted')
        direction = "maximize"

        trials_history = []

        def objective(trial):
            params = optuna_space_fn(trial)
            estimator = constructor(**params)
            preprocessor = PipelineBuilder.build_preprocessor(numeric_features, categorical_features)
            pipeline = PipelineBuilder.build_full_pipeline(preprocessor, estimator)

            try:
                scores = cross_val_score(pipeline, X_train, y_train, cv=cv_folds, scoring=scorer, n_jobs=-1)
                mean_score = float(np.mean(scores))
            except Exception:
                mean_score = -999.0

            trials_history.append({
                "trial_number": trial.number,
                "score": round(mean_score, 4),
                "params": params
            })
            return mean_score

        study = optuna.create_study(direction=direction)
        study.optimize(objective, n_trials=n_trials)

        best_params = study.best_params
        return best_params, trials_history
