from django.db import models
from django.contrib.auth.models import User
from projects.models import Project
import uuid

class Dataset(models.Model):
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('profiled', 'Profiled'),
        ('cleaned', 'Cleaned'),
        ('transformed', 'Transformed'),
        ('error', 'Error'),
    ]

    FORMAT_CHOICES = [
        ('csv', 'CSV'),
        ('excel', 'Excel (.xlsx/.xls)'),
        ('json', 'JSON'),
        ('parquet', 'Parquet'),
        ('api', 'REST API Import'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='datasets', null=True, blank=True)
    name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=1024)
    original_filename = models.CharField(max_length=255)
    file_format = models.CharField(max_length=32, choices=FORMAT_CHOICES, default='csv')
    file_size = models.BigIntegerField(default=0)  # in bytes
    row_count = models.IntegerField(default=0)
    column_count = models.IntegerField(default=0)
    version = models.IntegerField(default=1)
    parent_dataset = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='versions')
    processing_status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='uploaded')
    metadata = models.JSONField(default=dict, blank=True)
    cleaning_history = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (v{self.version})"
