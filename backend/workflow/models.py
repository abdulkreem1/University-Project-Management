from django.db import models
from django.conf import settings
from accounts.models import DEPARTMENTS

# Workflow trigger types
TRIGGER_TYPES = [
    ('project_start', 'Project Start'),
    ('after_days', 'After X Days'),
    ('milestone', 'At Milestone'),
    ('manual', 'Manual Trigger'),
    ('date', 'Specific Date'),
]

# Workflow status
WORKFLOW_STATUS = [
    ('active', 'Active'),
    ('inactive', 'Inactive'),
    ('archived', 'Archived'),
]


class WorkflowTemplate(models.Model):
    """
    Template for a workflow that can be applied to projects.
    Created by HoD or Doctor for their department.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    department = models.CharField(max_length=50, choices=DEPARTMENTS)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workflow_templates',
        limit_choices_to={'role__in': ['hod', 'doctor']},
    )
    status = models.CharField(max_length=20, choices=WORKFLOW_STATUS, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.department})"


class WorkflowStage(models.Model):
    """
    A stage in a workflow template (e.g., "Weekly Report", "Milestone 1").
    Each stage has its own form fields defined directly.
    """
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='stages')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    
    # Trigger configuration
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_TYPES)
    trigger_days = models.PositiveIntegerField(null=True, blank=True, help_text='Days after project start')
    trigger_date = models.DateField(null=True, blank=True, help_text='Specific date')
    
    # Notification settings
    notify_before_days = models.PositiveIntegerField(default=3, help_text='Notify students X days before due')
    is_required = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.template.name} - {self.name}"


FIELD_TYPES = [
    ('text',     'Short Text'),
    ('textarea', 'Long Text'),
    ('number',   'Number'),
    ('select',   'Dropdown'),
    ('radio',    'Radio Buttons'),
    ('checkbox', 'Checkboxes'),
    ('date',     'Date'),
    ('file',     'File Upload'),
]


class WorkflowStageField(models.Model):
    """
    A field in a workflow stage form.
    """
    stage = models.ForeignKey(WorkflowStage, on_delete=models.CASCADE, related_name='fields')
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=10, choices=FIELD_TYPES)
    required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True, help_text='List of options for select/radio/checkbox')
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.stage.name} - {self.label}"


class ProjectWorkflow(models.Model):
    """
    An instance of a workflow applied to a specific project.
    """
    project_board_id = models.IntegerField(help_text='ID of the project board')
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='project_workflows')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Workflow for Project {self.project_board_id}"


class WorkflowStageInstance(models.Model):
    """
    An instance of a workflow stage for a specific project.
    Tracks the status and due date for each stage.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('overdue', 'Overdue'),
    ]
    
    project_workflow = models.ForeignKey(ProjectWorkflow, on_delete=models.CASCADE, related_name='stage_instances')
    stage = models.ForeignKey(WorkflowStage, on_delete=models.CASCADE, related_name='instances')
    
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_workflow_stages'
    )
    feedback = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['stage__order']
        unique_together = ('project_workflow', 'stage')

    def __str__(self):
        return f"{self.stage.name} - Project {self.project_workflow.project_board_id}"


class WorkflowFieldResponse(models.Model):
    """
    Student's response to a workflow stage field.
    """
    stage_instance = models.ForeignKey(WorkflowStageInstance, on_delete=models.CASCADE, related_name='field_responses')
    field = models.ForeignKey(WorkflowStageField, on_delete=models.CASCADE, related_name='responses')
    value = models.TextField(blank=True)
    
    class Meta:
        unique_together = ('stage_instance', 'field')
    
    def __str__(self):
        return f"{self.field.label}: {self.value[:50]}"
