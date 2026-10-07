"""
CMRS - User Models
Custom User with Role-Based Access Control (RBAC).

Roles:
  - AGENT:          Field collection agent. Collects cash from customers.
  - BRANCH_MANAGER: Branch-level manager. Verifies agent submissions and creates bank deposits.
  - ADMIN:          Head-office admin. Views all dashboards and reports.
"""

import logging
from django.contrib.auth.models import AbstractUser
from django.db import models

audit_logger = logging.getLogger('cmrs.audit')


class Branch(models.Model):
    """
    Represents a physical company branch office.
    Example: Gurugram Main Branch, Faridabad Branch.
    Each agent and branch manager belongs to one branch.
    """
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)  # e.g. 'BR-GGN-01'
    city = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class User(AbstractUser):
    """
    Custom User Model extending Django's AbstractUser.
    Adds 'role' and 'branch' fields for RBAC enforcement.
    """

    class Role(models.TextChoices):
        AGENT = 'AGENT', 'Collection Agent'
        BRANCH_MANAGER = 'BRANCH_MANAGER', 'Branch Manager'
        ADMIN = 'ADMIN', 'Admin / Head Office'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.AGENT,
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text='The branch this user belongs to. Admins may have no branch.'
    )

    phone = models.CharField(max_length=15, blank=True)
    employee_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ── Role check helpers ────────────────────────────────────────────────
    @property
    def is_agent(self):
        return self.role == self.Role.AGENT

    @property
    def is_branch_manager(self):
        return self.role == self.Role.BRANCH_MANAGER

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    def __str__(self):
        return f"{self.get_full_name()} [{self.role}] - {self.username}"

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
