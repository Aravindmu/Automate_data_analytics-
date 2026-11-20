from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
import pandas as pd
import numpy as np

from datasets.models import Dataset
from datasets.loaders import DatasetLoader
from .visualization_service import VisualizationService

class ChartGenerationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            config = request.data
            chart_spec = VisualizationService.generate_chart(df, config)
            return Response(chart_spec)
        except Exception as e:
            return Response({"error": f"Chart generation failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

class ChartGalleryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            gallery = VisualizationService.get_suggested_gallery(df)
            return Response({"suggestions": gallery})
        except Exception as e:
            return Response({"error": f"Failed to generate gallery: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EDASummaryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            num_df = df.select_dtypes(include=[np.number])

            correlations_summary = []
            if num_df.shape[1] >= 2:
                corr = num_df.corr().round(3)
                # Find top positive and negative correlations
                corr_pairs = []
                for i in range(len(corr.columns)):
                    for j in range(i + 1, len(corr.columns)):
                        c1, c2 = corr.columns[i], corr.columns[j]
                        val = corr.iloc[i, j]
                        if not np.isnan(val):
                            corr_pairs.append({
                                "col1": c1,
                                "col2": c2,
                                "correlation": float(val),
                                "strength": "Strong" if abs(val) > 0.7 else ("Moderate" if abs(val) > 0.4 else "Weak")
                            })
                corr_pairs.sort(key=lambda x: abs(x['correlation']), reverse=True)
                correlations_summary = corr_pairs[:10]

            return Response({
                "dataset_id": str(dataset.id),
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "top_correlations": correlations_summary
            })
        except Exception as e:
            return Response({"error": f"Failed to generate EDA summary: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
