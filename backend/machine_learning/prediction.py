import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List

class DynamicPredictor:
    @staticmethod
    def predict(pipeline_path: str, input_data: Dict[str, Any], problem_type: str) -> Dict[str, Any]:
        """
        Executes inference using the saved Scikit-learn Pipeline with full preprocessing preserved.
        """
        if not os.path.exists(pipeline_path):
            raise FileNotFoundError(f"Trained model artifact not found at {pipeline_path}")

        # Load pipeline
        pipeline = joblib.load(pipeline_path)

        # Convert dictionary input to single-row DataFrame
        input_df = pd.DataFrame([input_data])

        # Execute prediction through pipeline
        prediction = pipeline.predict(input_df)
        pred_val = prediction[0]

        result: Dict[str, Any] = {
            "prediction": int(pred_val) if isinstance(pred_val, (np.integer, bool)) else (round(float(pred_val), 4) if isinstance(pred_val, (float, np.floating)) else str(pred_val)),
            "inputs_used": input_data,
            "problem_type": problem_type
        }

        # Probabilities for classification
        if hasattr(pipeline, 'predict_proba') and 'class' in problem_type:
            try:
                probabilities = pipeline.predict_proba(input_df)[0]
                classes = [str(c) for c in pipeline.classes_]
                class_probs = {c: round(float(p) * 100, 2) for c, p in zip(classes, probabilities)}
                result["probabilities"] = class_probs
                result["confidence"] = max(class_probs.values())
            except Exception:
                pass

        return result
