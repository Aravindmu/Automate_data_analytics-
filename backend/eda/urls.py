from django.urls import path
from .views import ChartGenerationView, ChartGalleryView, EDASummaryView

urlpatterns = [
    path('<uuid:dataset_id>/chart/', ChartGenerationView.as_view(), name='generate-chart'),
    path('<uuid:dataset_id>/gallery/', ChartGalleryView.as_view(), name='chart-gallery'),
    path('<uuid:dataset_id>/summary/', EDASummaryView.as_view(), name='eda-summary'),
]
