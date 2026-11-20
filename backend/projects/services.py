from .models import Project
from django.contrib.auth.models import User

class ProjectService:
    @staticmethod
    def get_or_create_default_project(user=None):
        project = Project.objects.filter(name="Default Workspace").first()
        if not project:
            if not user:
                user = User.objects.filter(username="demo_scientist").first()
            project = Project.objects.create(
                name="Default Workspace",
                description="Default automated data science & machine learning project workspace.",
                owner=user
            )
        return project
