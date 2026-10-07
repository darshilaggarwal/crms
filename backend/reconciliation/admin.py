from django.contrib import admin
from reconciliation.models import BankDeposit

@admin.register(BankDeposit)
class BankDepositAdmin(admin.ModelAdmin):
    list_display = ['reference_utr', 'branch', 'bank_name', 'amount', 'deposit_date', 'status']
    list_filter = ['status', 'branch', 'bank_name']
    search_fields = ['reference_utr']
    readonly_fields = ['created_at']
