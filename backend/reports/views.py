from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.http import HttpResponse, Http404

from datasets.models import Dataset
from datasets.loaders import DatasetLoader
from experiments.models import Experiment
from data_quality.profiler import DatasetProfiler
from data_quality.quality_report import QualityScoreCalculator
from .pdf_generator import PDFReportGenerator
from .excel_generator import ExcelReportGenerator

class ExportPDFReportView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            raise Http404("Dataset not found")

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            profile_data = DatasetProfiler.profile(df)
            quality_data = QualityScoreCalculator.calculate(df, profile_data)
            experiments = list(Experiment.objects.filter(dataset=dataset).order_by('-created_at'))

            pdf_buffer = PDFReportGenerator.generate_analytical_report(dataset, profile_data, quality_data, experiments)
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{dataset.name}_analytical_report.pdf"'
            return response
        except Exception as e:
            return Response({"error": f"Failed to generate PDF report: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExportExcelReportView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            raise Http404("Dataset not found")

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            profile_data = DatasetProfiler.profile(df)
            quality_data = QualityScoreCalculator.calculate(df, profile_data)
            experiments = list(Experiment.objects.filter(dataset=dataset).order_by('-created_at'))

            excel_buffer = ExcelReportGenerator.generate_excel_workbook(dataset, profile_data, quality_data, experiments)
            response = HttpResponse(excel_buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="{dataset.name}_report.xlsx"'
            return response
        except Exception as e:
            return Response({"error": f"Failed to generate Excel report: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExportJSONSummaryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            raise Http404("Dataset not found")

        try:
            df = DatasetLoader.load_file_to_df(dataset.file_path, dataset.file_format)
            profile_data = DatasetProfiler.profile(df)
            quality_data = QualityScoreCalculator.calculate(df, profile_data)
            experiments = list(Experiment.objects.filter(dataset=dataset).values('model_name', 'model_key', 'problem_type', 'metrics', 'cv_scores', 'training_time_seconds'))

            return Response({
                "dataset_id": str(dataset.id),
                "name": dataset.name,
                "version": dataset.version,
                "overview": profile_data['overview'],
                "quality_score": quality_data,
                "columns": profile_data['columns'],
                "experiments": experiments,
                "cleaning_history": dataset.cleaning_history
            })
        except Exception as e:
            return Response({"error": f"Failed to generate JSON summary: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
