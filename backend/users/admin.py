from django.contrib import admin
from users.models import Branch, User

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'city', 'is_active']
    search_fields = ['name', 'code', 'city']

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'get_full_name', 'role', 'branch', 'employee_id']
    list_filter = ['role', 'branch']
    search_fields = ['username', 'first_name', 'last_name', 'employee_id']
