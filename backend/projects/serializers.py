from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    dataset_count = serializers.SerializerMethodField()
    experiment_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'owner', 'created_at', 'updated_at', 'dataset_count', 'experiment_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'dataset_count', 'experiment_count']

    def get_dataset_count(self, obj):
        return obj.datasets.count() if hasattr(obj, 'datasets') else 0

    def get_experiment_count(self, obj):
        return obj.experiments.count() if hasattr(obj, 'experiments') else 0
