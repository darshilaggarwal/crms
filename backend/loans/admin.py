from django.contrib import admin
from loans.models import Customer, Loan, RepaymentSchedule

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'business_name', 'assigned_agent', 'city']
    search_fields = ['name', 'phone', 'business_name']
    list_filter = ['city', 'assigned_agent']

@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ['loan_number', 'customer', 'principal_amount', 'outstanding_amount', 'status']
    list_filter = ['status']
    search_fields = ['loan_number', 'customer__name']

@admin.register(RepaymentSchedule)
class RepaymentScheduleAdmin(admin.ModelAdmin):
    list_display = ['loan', 'installment_number', 'due_date', 'expected_amount', 'paid_amount', 'status']
    list_filter = ['status']
