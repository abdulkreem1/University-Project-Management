from django.db import models
from django.conf import settings
from accounts.models import DEPARTMENTS

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

FORM_CONTEXT = [
    ('propose',  'Student Proposes Own Idea'),
    ('browse',   'Student Applies on Doctor Idea'),
    ('weekly_report', 'Weekly Progress Report'),
    ('monthly_report', 'Monthly Progress Report'),
    ('milestone', 'Milestone Report'),
    ('final_report', 'Final Project Report'),
    ('custom', 'Custom Report'),
]


class DynamicForm(models.Model):
    """One form per HoD per context (propose / browse)."""
    hod         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dynamic_forms',
        limit_choices_to={'role': 'hod'},
    )
    department  = models.CharField(max_length=50, choices=DEPARTMENTS)
    context     = models.CharField(max_length=20, choices=FORM_CONTEXT)
    title       = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    is_recurring = models.BooleanField(default=False, help_text='Is this a recurring report?')
    frequency   = models.CharField(max_length=20, blank=True, null=True, choices=[
        ('once', 'One Time'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-Weekly'),
        ('monthly', 'Monthly'),
        ('milestone', 'At Milestones'),
    ])
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.department}] {self.context} form"


class FormField(models.Model):
    """A single field inside a DynamicForm."""
    form        = models.ForeignKey(DynamicForm, on_delete=models.CASCADE, related_name='fields')
    label       = models.CharField(max_length=255)
    field_type  = models.CharField(max_length=10, choices=FIELD_TYPES)
    required    = models.BooleanField(default=False)
    options     = models.JSONField(default=list, blank=True,
                                   help_text='List of option strings for select/radio/checkbox')
    order       = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.label} ({self.field_type})"


class FormResponse(models.Model):
    """A student's submission of a DynamicForm, linked to a proposal or application."""
    form            = models.ForeignKey(DynamicForm, on_delete=models.CASCADE, related_name='responses')
    student         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='form_responses',
        limit_choices_to={'role': 'student'},
    )
    # Link to either a proposal or an idea application (one must be set)
    proposal_id     = models.IntegerField(null=True, blank=True)
    application_id  = models.IntegerField(null=True, blank=True)
    project_board_id = models.IntegerField(null=True, blank=True, help_text='For progress reports')
    report_period_start = models.DateField(null=True, blank=True)
    report_period_end = models.DateField(null=True, blank=True)
    submitted_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Response by {self.student.username} on form {self.form_id}"


class FieldResponse(models.Model):
    """Value for a single field in a FormResponse."""
    response    = models.ForeignKey(FormResponse, on_delete=models.CASCADE, related_name='field_responses')
    field       = models.ForeignKey(FormField, on_delete=models.CASCADE, related_name='answers')
    value       = models.TextField(blank=True)

    def __str__(self):
        return f"{self.field.label}: {self.value[:50]}"
