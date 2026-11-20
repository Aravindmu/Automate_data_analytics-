import os
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.conf import settings

from datasets.models import Dataset
from datasets.loaders import DatasetLoader
from datasets.serializers import DatasetSerializer
from .transformations import FeatureEngineeringService
from .extraction import FeatureExtractionService
from .selection import FeatureSelectionService

class FEPreviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            config = request.data.get('config', {})
            transformed_df, report = FeatureEngineeringService.apply_feature_engineering(df, config)

            preview_records = transformed_df.head(20).replace({float('nan'): None, float('inf'): None, float('-inf'): None}).to_dict(orient='records')
            return Response({
                "report": report,
                "preview_records": preview_records,
                "total_columns": len(transformed_df.columns),
                "columns": list(transformed_df.columns)
            })
        except Exception as e:
            return Response({"error": f"Feature engineering preview failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

class FEApplyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            config = request.data.get('config', {})
            transformed_df, report = FeatureEngineeringService.apply_feature_engineering(df, config)

            upload_dir = settings.MEDIA_ROOT / 'datasets'
            os.makedirs(upload_dir, exist_ok=True)
            new_version = dataset.version + 1
            new_filename = f"{Path(dataset.original_filename).stem}_fe_v{new_version}.parquet"
            target_path = upload_dir / new_filename

            transformed_df.to_parquet(target_path, index=False)
            file_size = os.path.getsize(target_path)

            new_dataset = Dataset.objects.create(
                project=dataset.project,
                name=f"{dataset.name} (FE v{new_version})",
                file_path=str(target_path),
                original_filename=new_filename,
                file_format='parquet',
                file_size=file_size,
                row_count=len(transformed_df),
                column_count=len(transformed_df.columns),
                version=new_version,
                parent_dataset=dataset,
                processing_status='transformed',
                metadata={
                    'columns': list(transformed_df.columns),
                    'dtypes': {c: str(t) for c, t in transformed_df.dtypes.items()}
                },
                cleaning_history=dataset.cleaning_history + [{"feature_engineering": report}]
            )

            return Response({
                "message": "Features engineered and new dataset version generated.",
                "report": report,
                "new_dataset": DatasetSerializer(new_dataset).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Feature engineering failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FeatureImportanceView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        target_col = request.data.get('target_column')
        problem_type = request.data.get('problem_type', 'auto')
        if not target_col:
            return Response({"error": "target_column is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            res = FeatureEngineeringService.calculate_feature_importance(df, target_col, problem_type)
            return Response(res)
        except Exception as e:
            return Response({"error": f"Failed to compute feature importance: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FeatureExtractionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        config = request.data.get('config', {})
        apply_mode = request.data.get('apply', False)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            transformed_df, report = FeatureExtractionService.extract_features(df, config)

            if not apply_mode:
                preview_records = transformed_df.head(20).replace({float('nan'): None, float('inf'): None, float('-inf'): None}).to_dict(orient='records')
                return Response({
                    "report": report,
                    "preview_records": preview_records,
                    "total_columns": len(transformed_df.columns),
                    "columns": list(transformed_df.columns)
                })

            # Save as new version
            upload_dir = settings.MEDIA_ROOT / 'datasets'
            os.makedirs(upload_dir, exist_ok=True)
            new_version = dataset.version + 1
            new_filename = f"{Path(dataset.original_filename).stem}_extract_v{new_version}.parquet"
            target_path = upload_dir / new_filename

            transformed_df.to_parquet(target_path, index=False)
            file_size = os.path.getsize(target_path)

            new_dataset = Dataset.objects.create(
                project=dataset.project,
                name=f"{dataset.name} (Extract v{new_version})",
                file_path=str(target_path),
                original_filename=new_filename,
                file_format='parquet',
                file_size=file_size,
                row_count=len(transformed_df),
                column_count=len(transformed_df.columns),
                version=new_version,
                parent_dataset=dataset,
                processing_status='transformed',
                metadata={
                    'columns': list(transformed_df.columns),
                    'dtypes': {c: str(t) for c, t in transformed_df.dtypes.items()}
                },
                cleaning_history=dataset.cleaning_history + [{"feature_extraction": report}]
            )

            return Response({
                "message": "Features extracted and new dataset version generated.",
                "report": report,
                "new_dataset": DatasetSerializer(new_dataset).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Feature extraction failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FeatureSelectionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        config = request.data.get('config', {})
        apply_mode = request.data.get('apply', False)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            
            # If not apply mode, return analytical assessment
            if not apply_mode:
                analysis = FeatureSelectionService.analyze_selection(df, config)
                return Response(analysis)

            transformed_df, report = FeatureSelectionService.apply_selection(df, config)

            # Save as new version
            upload_dir = settings.MEDIA_ROOT / 'datasets'
            os.makedirs(upload_dir, exist_ok=True)
            new_version = dataset.version + 1
            new_filename = f"{Path(dataset.original_filename).stem}_select_v{new_version}.parquet"
            target_path = upload_dir / new_filename

            transformed_df.to_parquet(target_path, index=False)
            file_size = os.path.getsize(target_path)

            new_dataset = Dataset.objects.create(
                project=dataset.project,
                name=f"{dataset.name} (Select v{new_version})",
                file_path=str(target_path),
                original_filename=new_filename,
                file_format='parquet',
                file_size=file_size,
                row_count=len(transformed_df),
                column_count=len(transformed_df.columns),
                version=new_version,
                parent_dataset=dataset,
                processing_status='transformed',
                metadata={
                    'columns': list(transformed_df.columns),
                    'dtypes': {c: str(t) for c, t in transformed_df.dtypes.items()}
                },
                cleaning_history=dataset.cleaning_history + [{"feature_selection": report}]
            )

            return Response({
                "message": "Feature selection applied and new dataset version generated.",
                "report": report,
                "new_dataset": DatasetSerializer(new_dataset).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Feature selection failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
