from django.contrib import admin
from cash_collections.models import Collection, AgentSubmission

@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'agent', 'amount_collected', 'status', 'collected_at']
    list_filter = ['status', 'agent']
    search_fields = ['receipt_number']
    readonly_fields = ['receipt_number', 'collected_at']

@admin.register(AgentSubmission)
class AgentSubmissionAdmin(admin.ModelAdmin):
    list_display = ['agent', 'branch', 'expected_amount', 'actual_amount', 'discrepancy', 'status']
    list_filter = ['status', 'branch']
