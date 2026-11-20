from rest_framework import serializers
from .models import Experiment

class ExperimentSerializer(serializers.ModelSerializer):
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)

    class Meta:
        model = Experiment
        fields = [
            'id', 'project', 'dataset', 'dataset_name', 'model_name', 'model_key',
            'problem_type', 'target_column', 'features', 'hyperparameters',
            'metrics', 'cv_scores', 'training_time_seconds', 'input_schema',
            'artifact_path', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'dataset_name']
