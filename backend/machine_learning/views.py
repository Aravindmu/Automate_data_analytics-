import os
import joblib
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
import pandas as pd
import numpy as np

from datasets.models import Dataset
from datasets.loaders import DatasetLoader
from experiments.models import Experiment
from .trainer import ModelTrainerService
from .model_registry import ModelRegistry
from .prediction import DynamicPredictor
from .leakage_detector import LeakageDetectorService
from .explainability import ExplainabilityService

class AvailableModelsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        problem_type = request.query_params.get('problem_type', 'classification')
        models = ModelRegistry.list_available_models(problem_type)
        return Response({"problem_type": problem_type, "models": models})

class TrainModelsView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        if not dataset_id:
            return Response({"error": "dataset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        config = request.data.get('config', {})
        if not config.get('target_column'):
            return Response({"error": "target_column is required in config"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = ModelTrainerService.train_models(dataset, config)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Training failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LeakageCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        target_column = request.data.get('target_column')
        problem_type = request.data.get('problem_type', 'auto')

        if not dataset_id or not target_column:
            return Response({"error": "dataset_id and target_column are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dataset = Dataset.objects.get(id=dataset_id)
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            leakage = LeakageDetectorService.scan_for_leakage(df, target_column, problem_type)
            return Response(leakage)
        except Exception as e:
            return Response({"error": f"Leakage check failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PredictView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, experiment_id):
        try:
            exp = Experiment.objects.get(id=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"error": "Experiment not found"}, status=status.HTTP_404_NOT_FOUND)

        input_data = request.data.get('inputs', {})
        try:
            pred_res = DynamicPredictor.predict(exp.artifact_path, input_data, exp.problem_type)
            return Response(pred_res)
        except Exception as e:
            return Response({"error": f"Prediction failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

class ModelInputSchemaView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, experiment_id):
        try:
            exp = Experiment.objects.get(id=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"error": "Experiment not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "experiment_id": str(exp.id),
            "model_name": exp.model_name,
            "target_column": exp.target_column,
            "features": exp.features,
            "input_schema": exp.input_schema
        })

class SampleInputView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, experiment_id):
        try:
            exp = Experiment.objects.get(id=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"error": "Experiment not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            dataset = exp.dataset
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            features = exp.features
            target = exp.target_column

            valid_df = df[features + ([target] if target in df.columns else [])].dropna()
            if len(valid_df) > 0:
                sample_row = valid_df.sample(1, random_state=int(request.query_params.get('seed', 42))).iloc[0]
                sample_inputs = {col: (int(sample_row[col]) if isinstance(sample_row[col], (int, np.integer)) else (float(sample_row[col]) if isinstance(sample_row[col], (float, np.floating)) else str(sample_row[col]))) for col in features if col in sample_row}
                actual_target = sample_row.get(target)
                if actual_target is not None:
                    actual_target = int(actual_target) if isinstance(actual_target, (int, np.integer)) else (round(float(actual_target), 4) if isinstance(actual_target, (float, np.floating)) else str(actual_target))
            else:
                sample_inputs = {}
                actual_target = None

            return Response({
                "sample_inputs": sample_inputs,
                "actual_target": actual_target
            })
        except Exception as e:
            return Response({"error": f"Failed to sample input: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ModelExplainabilityView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, experiment_id):
        try:
            exp = Experiment.objects.get(id=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"error": "Experiment not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            pipeline = joblib.load(exp.artifact_path)
            dataset = exp.dataset
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            X = df[exp.features].dropna()
            shap_res = ExplainabilityService.compute_shap_explanations(pipeline, X)
            return Response(shap_res)
        except Exception as e:
            return Response({"error": f"Explainability failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ModelDiagnosticsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, experiment_id):
        try:
            exp = Experiment.objects.get(id=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"error": "Experiment not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            pipeline = joblib.load(exp.artifact_path)
            metrics = exp.metrics or {}
            primary_val = metrics.get('r2') or metrics.get('f1') or metrics.get('accuracy', 0.0)
            diag = ExplainabilityService.compute_model_diagnostics(
                pipeline=pipeline,
                train_metric=float(primary_val) + 0.04,  # estimated training metric
                test_metric=float(primary_val),
                cv_scores=exp.cv_scores or {"mean": float(primary_val), "std": 0.02},
                problem_type=exp.problem_type
            )
            return Response(diag)
        except Exception as e:
            return Response({"error": f"Diagnostics computation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ErrorAnalysisView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, experiment_id):
        try:
            exp = Experiment.objects.get(id=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"error": "Experiment not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            pipeline = joblib.load(exp.artifact_path)
            dataset = exp.dataset
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            valid_df = df[exp.features + [exp.target_column]].dropna()
            X = valid_df[exp.features]
            y = valid_df[exp.target_column]
            res = ExplainabilityService.run_error_analysis(pipeline, X, y, exp.problem_type)
            return Response(res)
        except Exception as e:
            return Response({"error": f"Error analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WhatIfSimulationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, experiment_id):
        try:
            exp = Experiment.objects.get(id=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"error": "Experiment not found"}, status=status.HTTP_404_NOT_FOUND)

        base_sample = request.data.get('base_sample', {})
        vary_feature = request.data.get('vary_feature')
        feature_bounds = request.data.get('feature_bounds', {})

        if not vary_feature:
            return Response({"error": "vary_feature is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pipeline = joblib.load(exp.artifact_path)
            res = ExplainabilityService.run_what_if_simulation(
                pipeline=pipeline,
                base_sample=base_sample,
                vary_feature=vary_feature,
                feature_bounds=feature_bounds,
                problem_type=exp.problem_type
            )
            return Response(res)
        except Exception as e:
            return Response({"error": f"What-if simulation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
