from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Project
from .serializers import ProjectSerializer
from .services import ProjectService

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        # Auto-ensure default project exists
        ProjectService.get_or_create_default_project()
        return Project.objects.all().order_by('-updated_at')

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(owner=user)
