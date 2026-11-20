from django.urls import path
from .views import DatasetProfileView, CleaningPreviewView, ExecuteCleaningView, DatasetDiffView

urlpatterns = [
    path('<uuid:dataset_id>/profile/', DatasetProfileView.as_view(), name='dataset-profile'),
    path('<uuid:dataset_id>/clean-preview/', CleaningPreviewView.as_view(), name='clean-preview'),
    path('<uuid:dataset_id>/clean/', ExecuteCleaningView.as_view(), name='clean-execute'),
    path('<uuid:dataset_id>/diff/', DatasetDiffView.as_view(), name='dataset-diff'),
]
