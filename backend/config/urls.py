from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/datasets/', include('datasets.urls')),
    path('api/data-quality/', include('data_quality.urls')),
    path('api/eda/', include('eda.urls')),
    path('api/feature-engineering/', include('feature_engineering.urls')),
    path('api/models/', include('machine_learning.urls')),
    path('api/experiments/', include('experiments.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/samples/', include('sample_data.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
