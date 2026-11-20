from rest_framework import serializers
from .models import Dataset

class DatasetSerializer(serializers.ModelSerializer):
    formatted_size = serializers.SerializerMethodField()

    class Meta:
        model = Dataset
        fields = [
            'id', 'project', 'name', 'file_path', 'original_filename',
            'file_format', 'file_size', 'formatted_size', 'row_count',
            'column_count', 'version', 'parent_dataset', 'processing_status',
            'metadata', 'cleaning_history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'file_size', 'row_count', 'column_count']

    def get_formatted_size(self, obj):
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"

class DatasetUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    project_id = serializers.UUIDField(required=False, allow_null=True)
    name = serializers.CharField(max_length=255, required=False)

class APIImportSerializer(serializers.Serializer):
    url = serializers.URLField()
    name = serializers.CharField(max_length=255)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    method = serializers.ChoiceField(choices=['GET', 'POST'], default='GET')
    headers = serializers.DictField(required=False, default=dict)
    auth_type = serializers.ChoiceField(choices=['none', 'bearer', 'api_key'], default='none')
    token = serializers.CharField(required=False, allow_blank=True, default='')
    api_key_header = serializers.CharField(required=False, default='X-API-Key')
    json_path = serializers.CharField(required=False, allow_blank=True, default='')
    timeout = serializers.IntegerField(default=30, min_value=1, max_value=60)
