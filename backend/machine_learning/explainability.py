import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.inspection import permutation_importance

class ExplainabilityService:
    @staticmethod
    def get_feature_importances(pipeline, X_test: pd.DataFrame, y_test: pd.Series, feature_names: List[str]) -> List[Dict[str, Any]]:
        """
        Extracts global feature importances from the pipeline.
        Tries estimator feature_importances_ or coef_, falls back to permutation importance on X_test.
        """
        model = pipeline.named_steps.get('model')
        preprocessor = pipeline.named_steps.get('preprocessor')

        try:
            if hasattr(preprocessor, 'get_feature_names_out'):
                names = list(preprocessor.get_feature_names_out())
            else:
                names = feature_names
        except Exception:
            names = feature_names

        importances = None

        # 1. Tree models feature_importances_
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
        # 2. Linear models coefficients
        elif hasattr(model, 'coef_'):
            coef = model.coef_
            importances = np.mean(np.abs(coef), axis=0) if coef.ndim > 1 else np.abs(coef)

        # 3. Permutation fallback
        if importances is None or len(importances) != len(names):
            try:
                sub_X = X_test.head(100)
                sub_y = y_test.head(100)
                perm = permutation_importance(pipeline, sub_X, sub_y, n_repeats=3, random_state=42)
                return [
                    {"feature": f, "importance": round(float(imp), 4)}
                    for f, imp in sorted(zip(X_test.columns, perm.importances_mean), key=lambda x: x[1], reverse=True)[:15]
                ]
            except Exception:
                return []

        clean_names = [n.replace('num__', '').replace('cat__', '') for n in names]
        pairs = sorted(zip(clean_names, importances), key=lambda x: x[1], reverse=True)

        return [
            {"feature": f, "importance": round(float(imp), 4)}
            for f, imp in pairs[:15]
        ]

    @staticmethod
    def compute_shap_explanations(pipeline, X_sample: pd.DataFrame, max_samples: int = 50) -> Dict[str, Any]:
        """
        Computes SHAP feature attribution summary for the pipeline estimator.
        """
        try:
            import shap
            sub_X = X_sample.head(max_samples)
            preprocessor = pipeline.named_steps.get('preprocessor')
            model = pipeline.named_steps.get('model')

            if preprocessor:
                transformed_X = preprocessor.transform(sub_X)
                feature_names = [c.replace('num__', '').replace('cat__', '') for c in preprocessor.get_feature_names_out()]
            else:
                transformed_X = sub_X.values
                feature_names = list(sub_X.columns)

            # Try TreeExplainer, fallback to Explainer
            try:
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(transformed_X)
            except Exception:
                explainer = shap.Explainer(model, transformed_X)
                shap_values = explainer(transformed_X).values

            # Normalize multidimensional classification output if needed
            if isinstance(shap_values, list) and len(shap_values) > 0:
                vals = np.mean(np.abs(shap_values[1] if len(shap_values) > 1 else shap_values[0]), axis=0)
            elif hasattr(shap_values, 'ndim') and shap_values.ndim == 3:
                vals = np.mean(np.abs(shap_values[:, :, 0]), axis=0)
            elif hasattr(shap_values, 'ndim') and shap_values.ndim == 2:
                vals = np.mean(np.abs(shap_values), axis=0)
            else:
                vals = np.abs(np.array(shap_values))

            ranked = sorted(zip(feature_names, vals), key=lambda x: x[1], reverse=True)[:12]
            return {
                "available": True,
                "summary": [{"feature": f, "mean_shap": round(float(v), 4)} for f, v in ranked]
            }
        except Exception as e:
            return {
                "available": False,
                "reason": str(e),
                "summary": []
            }

    @staticmethod
    def run_error_analysis(pipeline, X_test: pd.DataFrame, y_test: pd.Series, problem_type: str) -> Dict[str, Any]:
        """
        Pinpoints worst-case predictive errors and residual outliers for model debugging.
        """
        try:
            y_pred = pipeline.predict(X_test)
            analysis_df = X_test.copy()
            analysis_df['actual'] = y_test.values
            analysis_df['predicted'] = y_pred

            if problem_type == 'regression':
                analysis_df['abs_error'] = np.abs(analysis_df['actual'] - analysis_df['predicted']).round(4)
                worst_records = analysis_df.sort_values(by='abs_error', ascending=False).head(10)
                
                return {
                    "problem_type": "regression",
                    "mean_error": round(float(analysis_df['abs_error'].mean()), 4),
                    "median_error": round(float(analysis_df['abs_error'].median()), 4),
                    "max_error": round(float(analysis_df['abs_error'].max()), 4),
                    "error_quantiles": {
                        "q25": round(float(analysis_df['abs_error'].quantile(0.25)), 4),
                        "q75": round(float(analysis_df['abs_error'].quantile(0.75)), 4),
                        "q95": round(float(analysis_df['abs_error'].quantile(0.95)), 4)
                    },
                    "worst_samples": worst_records.replace({float('nan'): None}).to_dict(orient='records')
                }
            else:
                analysis_df['is_correct'] = analysis_df['actual'] == analysis_df['predicted']
                misclassified = analysis_df[~analysis_df['is_correct']].head(10)
                
                total = len(analysis_df)
                wrong_count = int((~analysis_df['is_correct']).sum())
                error_rate = round((wrong_count / max(1, total)) * 100, 2)

                return {
                    "problem_type": "classification",
                    "total_samples": total,
                    "misclassified_count": wrong_count,
                    "error_rate_pct": error_rate,
                    "worst_samples": misclassified.replace({float('nan'): None}).to_dict(orient='records')
                }
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def run_what_if_simulation(
        pipeline,
        base_sample: Dict[str, Any],
        vary_feature: str,
        feature_bounds: Dict[str, Any],
        problem_type: str,
        steps: int = 15
    ) -> Dict[str, Any]:
        """
        Simulates how altering a single feature value perturbs the model prediction curve.
        """
        min_val = float(feature_bounds.get('min', 0))
        max_val = float(feature_bounds.get('max', 100))
        if min_val == max_val:
            min_val -= 1
            max_val += 1

        values_range = np.linspace(min_val, max_val, steps).round(2).tolist()
        simulation_curve = []

        for val in values_range:
            modified_input = dict(base_sample)
            modified_input[vary_feature] = val
            df_row = pd.DataFrame([modified_input])

            try:
                pred = pipeline.predict(df_row)[0]
                pred_val = float(pred) if isinstance(pred, (int, float, np.floating, np.integer)) else str(pred)

                confidence = None
                if hasattr(pipeline, 'predict_proba') and 'class' in problem_type:
                    probs = pipeline.predict_proba(df_row)[0]
                    confidence = round(float(np.max(probs)) * 100, 1)

                simulation_curve.append({
                    "feature_value": val,
                    "prediction": pred_val,
                    "confidence": confidence
                })
            except Exception:
                pass

        return {
            "vary_feature": vary_feature,
            "min_val": min_val,
            "max_val": max_val,
            "baseline_value": base_sample.get(vary_feature),
            "curve": simulation_curve
        }

    @staticmethod
    def compute_model_diagnostics(
        pipeline,
        train_metric: float,
        test_metric: float,
        cv_scores: Dict[str, Any],
        problem_type: str
    ) -> Dict[str, Any]:
        """
        Detects overfitting, variance stability, and calibration health.
        """
        gap = round(abs(train_metric - test_metric), 4)
        cv_std = cv_scores.get('std', 0.0)

        # Diagnose Overfitting / Generalization
        if gap > 0.15:
            overfit_risk = "HIGH"
            overfit_assessment = f"Significant performance gap ({gap:.4f}) between train and holdout metrics. The model has likely memorized training patterns."
        elif gap > 0.07:
            overfit_risk = "MODERATE"
            overfit_assessment = f"Moderate gap ({gap:.4f}) observed. Light regularization or feature pruning recommended."
        else:
            overfit_risk = "LOW"
            overfit_assessment = f"Tight generalization gap ({gap:.4f}). Model exhibits robust cross-validation stability."

        # Variance Stability
        stability = "HIGH" if cv_std < 0.03 else ("MODERATE" if cv_std < 0.07 else "VOLATILE")

        return {
            "overfit_risk": overfit_risk,
            "generalization_gap": gap,
            "overfit_assessment": overfit_assessment,
            "cv_stability": stability,
            "cv_std": cv_std,
            "train_score": round(train_metric, 4),
            "test_score": round(test_metric, 4)
        }
