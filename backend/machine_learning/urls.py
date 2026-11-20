from django.urls import path
from .views import (
    AvailableModelsView,
    TrainModelsView,
    LeakageCheckView,
    PredictView,
    ModelInputSchemaView,
    SampleInputView,
    ModelExplainabilityView,
    ModelDiagnosticsView,
    ErrorAnalysisView,
    WhatIfSimulationView
)

urlpatterns = [
    path('available/', AvailableModelsView.as_view(), name='available-models'),
    path('train/', TrainModelsView.as_view(), name='train-models'),
    path('leakage-check/', LeakageCheckView.as_view(), name='leakage-check'),
    path('<uuid:experiment_id>/schema/', ModelInputSchemaView.as_view(), name='model-schema'),
    path('<uuid:experiment_id>/predict/', PredictView.as_view(), name='model-predict'),
    path('<uuid:experiment_id>/sample-input/', SampleInputView.as_view(), name='model-sample-input'),
    path('<uuid:experiment_id>/explainability/', ModelExplainabilityView.as_view(), name='model-explainability'),
    path('<uuid:experiment_id>/diagnostics/', ModelDiagnosticsView.as_view(), name='model-diagnostics'),
    path('<uuid:experiment_id>/error-analysis/', ErrorAnalysisView.as_view(), name='model-error-analysis'),
    path('<uuid:experiment_id>/what-if/', WhatIfSimulationView.as_view(), name='model-what-if'),
]
