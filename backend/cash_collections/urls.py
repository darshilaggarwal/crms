from django.urls import path
from cash_collections.views import (
    RecordPaymentView,
    AgentDailyCollectionsView,
    SubmitToBranchView,
    PendingSubmissionsView,
    VerifySubmissionView,
    CollectionHistoryView,
)

urlpatterns = [
    # Agent endpoints
    path('collect/', RecordPaymentView.as_view(), name='record-payment'),
    path('my-collections/', AgentDailyCollectionsView.as_view(), name='agent-collections'),
    path('submit-to-branch/', SubmitToBranchView.as_view(), name='submit-to-branch'),

    # Branch manager endpoints
    path('submissions/', PendingSubmissionsView.as_view(), name='pending-submissions'),
    path('submissions/<int:pk>/verify/', VerifySubmissionView.as_view(), name='verify-submission'),

    # History / reporting
    path('history/', CollectionHistoryView.as_view(), name='collection-history'),
]
