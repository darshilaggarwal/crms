"""
CMRS URL Configuration
All API routes registered here with Swagger docs.
"""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # API Schema & Swagger Docs (Interactive API testing)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Authentication Endpoints
    path('api/auth/', include('users.urls')),

    # Core Application Endpoints
    path('api/loans/', include('loans.urls')),
    path('api/collections/', include('cash_collections.urls')),
    path('api/reconciliation/', include('reconciliation.urls')),
    path('api/dashboard/', include('dashboard.urls')),

    # Frontend Single Page App Catch-all
    path('', TemplateView.as_view(template_name='index.html'), name='frontend-root'),
]
