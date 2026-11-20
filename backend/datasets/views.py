import os
import json
from pathlib import Path
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from django.http import FileResponse, Http404

from .models import Dataset
from .serializers import DatasetSerializer, DatasetUploadSerializer, APIImportSerializer
from .loaders import DatasetLoader
from .validators import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, detect_encoding, detect_csv_delimiter
from projects.services import ProjectService

class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all().order_by('-created_at')
    serializer_class = DatasetSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_dataset(self, request):
        serializer = DatasetUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = serializer.validated_data['file']
        project_id = serializer.validated_data.get('project_id')
        custom_name = serializer.validated_data.get('name')

        ext = Path(uploaded_file.name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {"error": f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if uploaded_file.size > MAX_FILE_SIZE_BYTES:
            return Response(
                {"error": f"File size exceeds limit of {MAX_FILE_SIZE_BYTES / (1024*1024):.0f}MB"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save to media/datasets
        upload_dir = settings.MEDIA_ROOT / 'datasets'
        os.makedirs(upload_dir, exist_ok=True)
        safe_filename = f"{Path(uploaded_file.name).stem}_{int(uploaded_file.size)}_{os.urandom(4).hex()}{ext}"
        target_path = upload_dir / safe_filename

        with open(target_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # Map extension to format
        fmt_map = {
            '.csv': 'csv',
            '.xlsx': 'excel',
            '.xls': 'excel',
            '.json': 'json',
            '.parquet': 'parquet'
        }
        file_format = fmt_map.get(ext, 'csv')

        # Load dataframe to inspect rows and columns
        try:
            df = DatasetLoader.load_file_to_df(str(target_path), file_format)
            row_count, col_count = df.shape
        except Exception as e:
            if os.path.exists(target_path):
                os.remove(target_path)
            return Response({"error": f"Failed to parse uploaded dataset: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve project
        project = None
        if project_id:
            from projects.models import Project
            project = Project.objects.filter(id=project_id).first()
        if not project:
            project = ProjectService.get_or_create_default_project()

        dataset_name = custom_name.strip() if custom_name else Path(uploaded_file.name).stem

        dataset = Dataset.objects.create(
            project=project,
            name=dataset_name,
            file_path=str(target_path),
            original_filename=uploaded_file.name,
            file_format=file_format,
            file_size=uploaded_file.size,
            row_count=row_count,
            column_count=col_count,
            processing_status='uploaded',
            metadata={
                'columns': list(df.columns),
                'dtypes': {c: str(t) for c, t in df.dtypes.items()}
            }
        )

        return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='api-import')
    def api_import(self, request):
        serializer = APIImportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        config = serializer.validated_data
        save_dir = str(settings.MEDIA_ROOT / 'datasets')

        try:
            saved_path, df, safe_meta = DatasetLoader.fetch_api_dataset(config, save_dir)
        except Exception as e:
            return Response({"error": f"API Ingestion failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        project_id = config.get('project_id')
        project = None
        if project_id:
            from projects.models import Project
            project = Project.objects.filter(id=project_id).first()
        if not project:
            project = ProjectService.get_or_create_default_project()

        file_size = os.path.getsize(saved_path)
        row_count, col_count = df.shape

        dataset = Dataset.objects.create(
            project=project,
            name=config['name'],
            file_path=saved_path,
            original_filename=Path(saved_path).name,
            file_format='api',
            file_size=file_size,
            row_count=row_count,
            column_count=col_count,
            processing_status='uploaded',
            metadata={
                **safe_meta,
                'columns': list(df.columns),
                'dtypes': {c: str(t) for c, t in df.dtypes.items()}
            }
        )

        return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        dataset = self.get_object()
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 500)

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            total_rows = len(df)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size

            # Slice and fill na safely for json preview
            sliced_df = df.iloc[start_idx:end_idx].copy()
            # Replace NaNs/Infs with None for clean JSON serialization
            records = sliced_df.replace({float('nan'): None, float('inf'): None, float('-inf'): None}).to_dict(orient='records')

            return Response({
                "dataset_id": str(dataset.id),
                "name": dataset.name,
                "version": dataset.version,
                "total_rows": total_rows,
                "total_columns": len(df.columns),
                "page": page,
                "page_size": page_size,
                "columns": list(df.columns),
                "data": records,
            })
        except Exception as e:
            return Response({"error": f"Failed to preview dataset: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='schema')
    def schema(self, request, pk=None):
        dataset = self.get_object()
        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            schema_info = []

            for col in df.columns:
                series = df[col]
                dtype_str = str(series.dtype)
                null_count = int(series.isna().sum())
                unique_count = int(series.nunique(dropna=True))
                
                # Classify type
                if pd.api.types.is_numeric_dtype(series):
                    col_type = 'numeric'
                elif pd.api.types.is_datetime64_any_dtype(series):
                    col_type = 'datetime'
                elif pd.api.types.is_bool_dtype(series):
                    col_type = 'boolean'
                else:
                    col_type = 'categorical'

                sample_vals = series.dropna().head(3).tolist()

                schema_info.append({
                    "name": col,
                    "dtype": dtype_str,
                    "type_category": col_type,
                    "null_count": null_count,
                    "null_percentage": round((null_count / len(df)) * 100, 2) if len(df) > 0 else 0,
                    "unique_count": unique_count,
                    "sample_values": sample_vals
                })

            return Response({
                "dataset_id": str(dataset.id),
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "schema": schema_info
            })
        except Exception as e:
            return Response({"error": f"Failed to inspect schema: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='excel-sheets')
    def excel_sheets(self, request, pk=None):
        dataset = self.get_object()
        sheets = DatasetLoader.inspect_excel_sheets(dataset.file_path)
        return Response({"sheets": sheets})

    @action(detail=True, methods=['get'], url_path='download')
    def download_file(self, request, pk=None):
        dataset = self.get_object()
        if not os.path.exists(dataset.file_path):
            raise Http404("Dataset file not found.")

        filename = dataset.original_filename or f"{dataset.name}.csv"
        return FileResponse(open(dataset.file_path, 'rb'), as_attachment=True, filename=filename)
