from django.urls import path
from loans.views import (
    CustomerListCreateView, CustomerDetailView,
    LoanListCreateView, LoanDetailView,
    RepaymentScheduleListView
)

urlpatterns = [
    # Customer Endpoints
    path('customers/', CustomerListCreateView.as_view(), name='customer-list'),
    path('customers/<int:pk>/', CustomerDetailView.as_view(), name='customer-detail'),

    # Loan Endpoints
    path('', LoanListCreateView.as_view(), name='loan-list'),
    path('<int:pk>/', LoanDetailView.as_view(), name='loan-detail'),
    path('<int:loan_id>/schedule/', RepaymentScheduleListView.as_view(), name='loan-schedule'),
]
