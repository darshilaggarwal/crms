from django.urls import path
from dashboard.views import DashboardSummaryView, AgentSummaryView

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('agents/', AgentSummaryView.as_view(), name='agent-summary'),
]
