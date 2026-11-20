from django.urls import path
from .views import ExportPDFReportView, ExportExcelReportView, ExportJSONSummaryView

urlpatterns = [
    path('<uuid:dataset_id>/pdf/', ExportPDFReportView.as_view(), name='export-pdf'),
    path('<uuid:dataset_id>/excel/', ExportExcelReportView.as_view(), name='export-excel'),
    path('<uuid:dataset_id>/json/', ExportJSONSummaryView.as_view(), name='export-json'),
]
