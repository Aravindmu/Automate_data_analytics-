from django.db import models
from projects.models import Project
from datasets.models import Dataset
import uuid

class Experiment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='experiments', null=True, blank=True)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='experiments')
    model_name = models.CharField(max_length=255)
    model_key = models.CharField(max_length=100)
    problem_type = models.CharField(max_length=64)
    target_column = models.CharField(max_length=255)
    features = models.JSONField(default=list)
    hyperparameters = models.JSONField(default=dict)
    metrics = models.JSONField(default=dict)
    cv_scores = models.JSONField(default=dict)
    training_time_seconds = models.FloatField(default=0.0)
    artifact_path = models.CharField(max_length=1024)
    input_schema = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.model_name} on {self.dataset.name} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
