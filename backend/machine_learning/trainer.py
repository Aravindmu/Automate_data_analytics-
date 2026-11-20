import os
import time
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from pathlib import Path
from django.conf import settings
from sklearn.model_selection import cross_val_score

from .splitters import DataSplitter
from .preprocessing import PipelineBuilder
from .model_registry import ModelRegistry
from .evaluation import ModelEvaluator
from .optimization import HyperparameterOptimizer
from .explainability import ExplainabilityService
from .leakage_detector import LeakageDetectorService
from .imbalance import ImbalanceService
from experiments.models import Experiment

class ModelTrainerService:
    @classmethod
    def train_models(cls, dataset, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        End-to-end multi-model training and evaluation pipeline.
        Features automatic problem detection, leakage scanning, imbalance mitigation,
        SHAP explanations, and model diagnostics.
        """
        start_time = time.time()
        from datasets.loaders import DatasetLoader
        df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)

        target_col = config.get('target_column')
        if not target_col or target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset.")

        # 1. Automatic Problem Type Detection
        problem_type = config.get('problem_type', 'auto')
        target_series = df[target_col].dropna()
        if problem_type in ['auto', '', None]:
            if pd.api.types.is_numeric_dtype(target_series) and target_series.nunique() > 10:
                problem_type = 'regression'
            elif target_series.nunique() == 2:
                problem_type = 'binary_classification'
            else:
                problem_type = 'multiclass_classification'

        selected_models = config.get('algorithms')
        if not selected_models:
            if problem_type == 'regression':
                selected_models = ['linear_regression', 'ridge', 'random_forest', 'xgboost']
            else:
                selected_models = ['logistic_regression', 'random_forest', 'xgboost', 'lightgbm']

        test_size = float(config.get('test_size', 0.2))
        random_state = int(config.get('random_state', 42))
        cv_folds = int(config.get('cv_folds', 3))
        primary_metric = config.get('primary_metric', 'r2' if problem_type == 'regression' else 'f1')
        enable_tuning = bool(config.get('enable_hyperparameter_tuning', False))
        tuning_trials = int(config.get('tuning_trials', 5))
        excluded_features = config.get('excluded_features', [])
        split_strategy = config.get('split_strategy', 'stratified')

        # Drop excluded features
        feature_df = df.drop(columns=[c for c in excluded_features if c in df.columns])

        # 2. Automated Data Leakage Detection Scan
        leakage_report = LeakageDetectorService.scan_for_leakage(feature_df, target_col, problem_type)

        # 3. Leakage-free train/test split
        X_train, X_test, y_train, y_test = DataSplitter.split(
            df=feature_df,
            target_column=target_col,
            problem_type=problem_type,
            test_size=test_size,
            random_state=random_state,
            split_strategy=split_strategy
        )

        # 4. Imbalance Assessment & Mitigation
        imbalance_assessment = None
        imbalance_report = None
        if 'class' in problem_type:
            imbalance_assessment = ImbalanceService.assess_imbalance(y_train)
            if config.get('enable_imbalance_handling', False) and imbalance_assessment['is_imbalanced']:
                imb_strategy = config.get('imbalance_strategy', 'smote')
                X_train, y_train, imbalance_report = ImbalanceService.balance_dataset(
                    X_train, y_train, strategy=imb_strategy, random_state=random_state
                )

        numeric_features = list(X_train.select_dtypes(include=[np.number]).columns)
        categorical_features = list(X_train.select_dtypes(exclude=[np.number]).columns)

        results = []
        artifacts_dir = settings.MEDIA_ROOT / 'models' / str(dataset.id)
        os.makedirs(artifacts_dir, exist_ok=True)

        for model_key in selected_models:
            t0 = time.time()
            best_params = {}
            trials_history = []

            # Hyperparameter Tuning if enabled
            if enable_tuning:
                try:
                    best_params, trials_history = HyperparameterOptimizer.optimize(
                        model_key=model_key,
                        problem_type=problem_type,
                        X_train=X_train,
                        y_train=y_train,
                        numeric_features=numeric_features,
                        categorical_features=categorical_features,
                        metric=primary_metric,
                        n_trials=tuning_trials,
                        cv_folds=cv_folds
                    )
                except Exception:
                    best_params = {}

            # Build pipeline
            estimator = ModelRegistry.get_model(problem_type, model_key, best_params)
            preprocessor = PipelineBuilder.build_preprocessor(numeric_features, categorical_features)
            pipeline = PipelineBuilder.build_full_pipeline(preprocessor, estimator)

            # Fit strictly on training fold
            pipeline.fit(X_train, y_train)
            train_duration = round(time.time() - t0, 3)

            # Evaluate on untouched test set
            y_pred = pipeline.predict(X_test)
            y_prob = None
            if hasattr(pipeline, 'predict_proba') and 'class' in problem_type:
                try:
                    y_prob = pipeline.predict_proba(X_test)
                except Exception:
                    pass

            if problem_type == 'regression':
                metrics = ModelEvaluator.evaluate_regression(
                    y_true=y_test.to_numpy(),
                    y_pred=y_pred,
                    n_features=X_train.shape[1]
                )
                # Training set evaluation for overfitting check
                train_pred = pipeline.predict(X_train)
                train_score = ModelEvaluator.evaluate_regression(y_train.to_numpy(), train_pred, X_train.shape[1]).get(primary_metric, 0.0)
            else:
                metrics = ModelEvaluator.evaluate_classification(
                    y_true=y_test.to_numpy(),
                    y_pred=y_pred,
                    y_prob=y_prob,
                    labels=pipeline.classes_ if hasattr(pipeline, 'classes_') else None
                )
                train_pred = pipeline.predict(X_train)
                train_score = ModelEvaluator.evaluate_classification(y_train.to_numpy(), train_pred).get(primary_metric, 0.0)

            # Cross-Validation
            try:
                cv_scoring = 'r2' if problem_type == 'regression' else 'f1_weighted'
                cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv_folds, scoring=cv_scoring)
                cv_mean = round(float(np.mean(cv_scores)), 4)
                cv_std = round(float(np.std(cv_scores)), 4)
            except Exception:
                cv_mean = 0.0
                cv_std = 0.0

            # Feature importances
            importances = ExplainabilityService.get_feature_importances(
                pipeline=pipeline,
                X_test=X_test,
                y_test=y_test,
                feature_names=list(X_train.columns)
            )

            # Model Diagnostics (Overfitting check)
            test_metric_val = metrics.get(primary_metric, cv_mean)
            diagnostics = ExplainabilityService.compute_model_diagnostics(
                pipeline=pipeline,
                train_metric=float(train_score),
                test_metric=float(test_metric_val),
                cv_scores={"mean": cv_mean, "std": cv_std},
                problem_type=problem_type
            )

            # SHAP attribution
            shap_info = ExplainabilityService.compute_shap_explanations(pipeline, X_test)

            # Save serialized pipeline
            artifact_filename = f"{model_key}_{int(time.time())}.joblib"
            artifact_path = artifacts_dir / artifact_filename
            joblib.dump(pipeline, artifact_path)

            input_schema = {
                "numeric": {c: {"min": float(X_train[c].min()), "max": float(X_train[c].max()), "median": float(X_train[c].median())} for c in numeric_features if X_train[c].notna().any()},
                "categorical": {c: [str(val) for val in X_train[c].dropna().unique()[:30]] for c in categorical_features},
                "target": target_col,
                "problem_type": problem_type
            }

            # Record Experiment in SQLite DB
            exp = Experiment.objects.create(
                project=dataset.project,
                dataset=dataset,
                model_name=ModelRegistry.REGRESSION_MODELS.get(model_key, ModelRegistry.CLASSIFICATION_MODELS.get(model_key, {})).get('name', model_key),
                model_key=model_key,
                problem_type=problem_type,
                target_column=target_col,
                features=list(X_train.columns),
                hyperparameters=best_params,
                metrics=metrics,
                cv_scores={"mean": cv_mean, "std": cv_std, "folds": cv_folds},
                training_time_seconds=train_duration,
                artifact_path=str(artifact_path),
                input_schema=input_schema
            )

            results.append({
                "experiment_id": str(exp.id),
                "model_key": model_key,
                "model_name": exp.model_name,
                "metrics": metrics,
                "cv_score_mean": cv_mean,
                "cv_score_std": cv_std,
                "training_time": train_duration,
                "feature_importance": importances,
                "diagnostics": diagnostics,
                "shap": shap_info,
                "tuning_applied": enable_tuning and len(best_params) > 0,
                "best_hyperparameters": best_params,
                "artifact_path": str(artifact_path)
            })

        # Rank models by primary metric
        lower_is_better = primary_metric.lower() in ['rmse', 'mae', 'mse', 'log_loss']
        def get_sort_key(res):
            val = res['metrics'].get(primary_metric)
            if val is None:
                val = res['cv_score_mean']
            return val if not lower_is_better else -val

        results.sort(key=get_sort_key, reverse=True)
        best_model = results[0] if results else None

        return {
            "dataset_id": str(dataset.id),
            "target_column": target_col,
            "problem_type": problem_type,
            "primary_metric": primary_metric,
            "total_models_trained": len(results),
            "execution_time_total": round(time.time() - start_time, 2),
            "best_model": best_model,
            "models_comparison": results,
            "train_size": len(X_train),
            "test_size": len(X_test),
            "leakage_check": leakage_report,
            "imbalance_assessment": imbalance_assessment,
            "imbalance_mitigation": imbalance_report
        }
