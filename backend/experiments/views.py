import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse, Http404

from .models import Experiment
from .serializers import ExperimentSerializer

class ExperimentViewSet(viewsets.ModelViewSet):
    queryset = Experiment.objects.all().order_by('-created_at')
    serializer_class = ExperimentSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Experiment.objects.all().order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            qs = qs.filter(dataset_id=dataset_id)
        return qs

    @action(detail=True, methods=['get'], url_path='download-model')
    def download_model(self, request, pk=None):
        experiment = self.get_object()
        if not os.path.exists(experiment.artifact_path):
            raise Http404("Trained model artifact not found.")

        filename = f"{experiment.model_key}_model.joblib"
        return FileResponse(open(experiment.artifact_path, 'rb'), as_attachment=True, filename=filename)
