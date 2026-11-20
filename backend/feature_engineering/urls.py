from django.urls import path
from .views import (
    FEPreviewView,
    FEApplyView,
    FeatureImportanceView,
    FeatureExtractionView,
    FeatureSelectionView
)

urlpatterns = [
    path('<uuid:dataset_id>/preview/', FEPreviewView.as_view(), name='fe-preview'),
    path('<uuid:dataset_id>/apply/', FEApplyView.as_view(), name='fe-apply'),
    path('<uuid:dataset_id>/importance/', FeatureImportanceView.as_view(), name='feature-importance'),
    path('<uuid:dataset_id>/extract/', FeatureExtractionView.as_view(), name='feature-extract'),
    path('<uuid:dataset_id>/select/', FeatureSelectionView.as_view(), name='feature-select'),
]
