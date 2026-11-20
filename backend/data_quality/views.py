import os
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.conf import settings

from datasets.models import Dataset
from datasets.loaders import DatasetLoader
from datasets.serializers import DatasetSerializer
from .profiler import DatasetProfiler
from .quality_report import QualityScoreCalculator
from .cleaner import DataCleaner

class DatasetProfileView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, dataset_id):
        return self._get_profile(dataset_id)

    def post(self, request, dataset_id):
        return self._get_profile(dataset_id)

    def _get_profile(self, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            profile_data = DatasetProfiler.profile(df)
            quality_data = QualityScoreCalculator.calculate(df, profile_data)

            # Update dataset metadata with score
            dataset.metadata['quality_score'] = quality_data['overall_score']
            dataset.metadata['quality_grade'] = quality_data['grade']
            dataset.processing_status = 'profiled'
            dataset.save(update_fields=['metadata', 'processing_status'])

            return Response({
                "dataset_id": str(dataset.id),
                "name": dataset.name,
                "version": dataset.version,
                "profiling": profile_data,
                "quality_score": quality_data
            })
        except Exception as e:
            return Response({"error": f"Failed to profile dataset: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CleaningPreviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            config = request.data.get('config', {})
            cleaned_df, audit = DataCleaner.clean(df, config)

            # Return top 20 rows of cleaned preview
            preview_records = cleaned_df.head(20).replace({float('nan'): None, float('inf'): None, float('-inf'): None}).to_dict(orient='records')

            return Response({
                "audit": audit,
                "preview_records": preview_records,
                "new_columns": list(cleaned_df.columns),
            })
        except Exception as e:
            return Response({"error": f"Cleaning preview failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

class ExecuteCleaningView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            config = request.data.get('config', {})
            cleaned_df, audit = DataCleaner.clean(df, config)

            # Save as new version file
            upload_dir = settings.MEDIA_ROOT / 'datasets'
            os.makedirs(upload_dir, exist_ok=True)
            new_version = dataset.version + 1
            new_filename = f"{Path(dataset.original_filename).stem}_v{new_version}.parquet"
            target_path = upload_dir / new_filename

            cleaned_df.to_parquet(target_path, index=False)
            file_size = os.path.getsize(target_path)

            # Create new Dataset record referencing the parent
            new_dataset = Dataset.objects.create(
                project=dataset.project,
                name=f"{dataset.name} (Cleaned v{new_version})",
                file_path=str(target_path),
                original_filename=new_filename,
                file_format='parquet',
                file_size=file_size,
                row_count=len(cleaned_df),
                column_count=len(cleaned_df.columns),
                version=new_version,
                parent_dataset=dataset,
                processing_status='cleaned',
                metadata={
                    'columns': list(cleaned_df.columns),
                    'dtypes': {c: str(t) for c, t in cleaned_df.dtypes.items()}
                },
                cleaning_history=dataset.cleaning_history + [audit]
            )

            return Response({
                "message": "Dataset cleaned and new version created successfully.",
                "audit": audit,
                "new_dataset": DatasetSerializer(new_dataset).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Cleaning execution failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DatasetDiffView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, dataset_id):
        try:
            current = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"error": "Dataset not found"}, status=status.HTTP_404_NOT_FOUND)

        if not current.parent_dataset:
            return Response({"error": "This is an original dataset with no previous versions to compare."}, status=status.HTTP_400_BAD_REQUEST)

        parent = current.parent_dataset
        try:
            curr_df = DatasetLoader.load_file_to_df(current.file_path, current.file_format)
            parent_df = DatasetLoader.load_file_to_df(parent.file_path, parent.file_format)

            cols_added = [c for c in curr_df.columns if c not in parent_df.columns]
            cols_removed = [c for c in parent_df.columns if c not in curr_df.columns]
            cols_common = [c for c in curr_df.columns if c in parent_df.columns]

            diff_summary = {
                "parent_version": parent.version,
                "current_version": current.version,
                "parent_rows": len(parent_df),
                "current_rows": len(curr_df),
                "row_difference": len(curr_df) - len(parent_df),
                "parent_columns": len(parent_df.columns),
                "current_columns": len(curr_df.columns),
                "columns_added": cols_added,
                "columns_dropped": cols_removed,
                "parent_missing": int(parent_df.isna().sum().sum()),
                "current_missing": int(curr_df.isna().sum().sum()),
                "cleaning_history": current.cleaning_history,
            }

            return Response(diff_summary)
        except Exception as e:
            return Response({"error": f"Failed to compute diff: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
