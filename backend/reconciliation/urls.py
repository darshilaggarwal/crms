from django.urls import path
from reconciliation.views import BankDepositListCreateView, BankDepositDetailView, SettleDepositView

urlpatterns = [
    path('deposits/', BankDepositListCreateView.as_view(), name='bank-deposit-list'),
    path('deposits/<int:pk>/', BankDepositDetailView.as_view(), name='bank-deposit-detail'),
    path('deposits/<int:pk>/settle/', SettleDepositView.as_view(), name='settle-deposit'),
]
