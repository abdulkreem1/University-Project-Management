from django.db import models
from django.conf import settings


class Notification(models.Model):
    CATEGORY_CHOICES = [
        ('system', 'System'),
        ('account', 'Account'),
        ('project', 'Project'),
        ('proposal', 'Proposal'),
        ('application', 'Application'),
        ('invitation', 'Invitation'),
        ('workflow', 'Workflow'),
        ('task', 'Task'),
        ('withdrawal', 'Withdrawal'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    TYPE_CHOICES = [
        # System/account
        ('system_notice',           'System Notice'),
        ('account_created',         'Account Created'),
        ('account_imported',        'Account Imported'),
        ('password_changed',        'Password Changed'),
        ('hod_assigned',            'HoD Assigned'),
        # Project ideas
        ('idea_submitted',          'Idea Submitted'),
        ('idea_approved',           'Idea Approved'),
        ('idea_rejected',           'Idea Rejected'),
        # Student proposals
        ('proposal_submitted',      'Proposal Submitted'),
        ('proposal_approved_sup',   'Proposal Approved by Supervisor'),
        ('proposal_approved_hod',   'Proposal Approved by HoD'),
        ('proposal_rejected',       'Proposal Rejected'),
        ('proposal_assigned',       'Proposal Assigned'),
        # Applications
        ('application_submitted',   'Application Submitted'),
        ('application_approved_doc','Application Approved by Doctor'),
        ('application_approved_hod','Application Approved by HoD'),
        ('application_rejected',    'Application Rejected'),
        ('application_registered',  'Application Registered'),
        # Invitations
        ('invitation_received',     'Invitation Received'),
        ('invitation_accepted',     'Invitation Accepted'),
        ('invitation_rejected',     'Invitation Rejected'),
        # Withdrawal
        ('withdrawal_requested',    'Withdrawal Requested'),
        ('withdrawal_approved',     'Withdrawal Approved'),
        ('withdrawal_rejected',     'Withdrawal Rejected'),
        # Project management
        ('task_created',            'Task Created'),
        ('task_assigned',           'Task Assigned'),
        ('task_updated',            'Task Updated'),
        ('task_completed',          'Task Completed'),
        ('task_comment_added',      'Task Comment Added'),
        ('task_attachment_added',   'Task Attachment Added'),
        # Workflow
        ('workflow_applied',        'Workflow Applied'),
        ('workflow_stage_submitted','Workflow Stage Submitted'),
        ('workflow_stage_approved', 'Workflow Stage Approved'),
        ('workflow_stage_rejected', 'Workflow Stage Rejected'),
        ('workflow_due_soon',       'Workflow Due Soon'),
    ]

    recipient   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    actor       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='sent_notifications',
        null=True,
        blank=True,
    )
    notif_type  = models.CharField(max_length=80, choices=TYPE_CHOICES)
    category    = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='system')
    priority    = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    title       = models.CharField(max_length=255)
    message     = models.TextField()
    action_url  = models.CharField(max_length=255, blank=True)
    action_label = models.CharField(max_length=80, blank=True)
    entity_type = models.CharField(max_length=80, blank=True)
    entity_id   = models.PositiveIntegerField(null=True, blank=True)
    metadata    = models.JSONField(default=dict, blank=True)
    is_read     = models.BooleanField(default=False)
    read_at     = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'archived_at', '-created_at']),
            models.Index(fields=['recipient', 'category', 'is_read']),
            models.Index(fields=['recipient', 'priority', 'is_read']),
        ]

    def __str__(self):
        return f"[{self.notif_type}] -> {self.recipient.username}: {self.title}"
