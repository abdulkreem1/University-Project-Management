from .models import Notification


NOTIFICATION_DEFAULTS = {
    'idea_submitted': {'category': 'project', 'priority': 'normal'},
    'idea_approved': {'category': 'project', 'priority': 'normal'},
    'idea_rejected': {'category': 'project', 'priority': 'high'},
    'proposal_submitted': {'category': 'proposal', 'priority': 'normal'},
    'proposal_approved_sup': {'category': 'proposal', 'priority': 'normal'},
    'proposal_approved_hod': {'category': 'proposal', 'priority': 'normal'},
    'proposal_rejected': {'category': 'proposal', 'priority': 'high'},
    'proposal_assigned': {'category': 'proposal', 'priority': 'high'},
    'application_submitted': {'category': 'application', 'priority': 'normal'},
    'application_approved_doc': {'category': 'application', 'priority': 'normal'},
    'application_approved_hod': {'category': 'application', 'priority': 'normal'},
    'application_rejected': {'category': 'application', 'priority': 'high'},
    'application_registered': {'category': 'application', 'priority': 'high'},
    'invitation_received': {'category': 'invitation', 'priority': 'high'},
    'invitation_accepted': {'category': 'invitation', 'priority': 'normal'},
    'invitation_rejected': {'category': 'invitation', 'priority': 'normal'},
    'withdrawal_requested': {'category': 'withdrawal', 'priority': 'high'},
    'withdrawal_approved': {'category': 'withdrawal', 'priority': 'high'},
    'withdrawal_rejected': {'category': 'withdrawal', 'priority': 'high'},
    'task_created': {'category': 'task', 'priority': 'low'},
    'task_assigned': {'category': 'task', 'priority': 'high'},
    'task_updated': {'category': 'task', 'priority': 'normal'},
    'task_completed': {'category': 'task', 'priority': 'normal'},
    'task_comment_added': {'category': 'task', 'priority': 'normal'},
    'task_attachment_added': {'category': 'task', 'priority': 'normal'},
    'workflow_applied': {'category': 'workflow', 'priority': 'high'},
    'workflow_stage_submitted': {'category': 'workflow', 'priority': 'high'},
    'workflow_stage_approved': {'category': 'workflow', 'priority': 'normal'},
    'workflow_stage_rejected': {'category': 'workflow', 'priority': 'high'},
    'workflow_due_soon': {'category': 'workflow', 'priority': 'high'},
    'account_created': {'category': 'account', 'priority': 'normal'},
    'account_imported': {'category': 'account', 'priority': 'normal'},
    'password_changed': {'category': 'account', 'priority': 'normal'},
    'hod_assigned': {'category': 'account', 'priority': 'high'},
}


def _resolve_defaults(notif_type, category=None, priority=None):
    defaults = NOTIFICATION_DEFAULTS.get(notif_type, {})
    return {
        'category': category or defaults.get('category', 'system'),
        'priority': priority or defaults.get('priority', 'normal'),
    }


def notify(recipient, notif_type, title, message, *, actor=None, category=None,
           priority=None, action_url='', action_label='', entity_type='',
           entity_id=None, metadata=None):
    """Create a structured notification for a single recipient."""
    if recipient is None:
        return None

    defaults = _resolve_defaults(notif_type, category=category, priority=priority)
    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notif_type=notif_type,
        category=defaults['category'],
        priority=defaults['priority'],
        title=title,
        message=message,
        action_url=action_url or '',
        action_label=action_label or '',
        entity_type=entity_type or '',
        entity_id=entity_id,
        metadata=dict(metadata or {}),
    )


def notify_many(recipients, notif_type, title, message, *, actor=None, category=None,
                priority=None, action_url='', action_label='', entity_type='',
                entity_id=None, metadata=None):
    """Create the same structured notification for multiple unique recipients."""
    defaults = _resolve_defaults(notif_type, category=category, priority=priority)
    unique_recipients = []
    seen = set()
    for recipient in recipients:
        if recipient is None or recipient.pk in seen:
            continue
        seen.add(recipient.pk)
        unique_recipients.append(recipient)

    notifications = [
        Notification(
            recipient=recipient,
            actor=actor,
            notif_type=notif_type,
            category=defaults['category'],
            priority=defaults['priority'],
            title=title,
            message=message,
            action_url=action_url or '',
            action_label=action_label or '',
            entity_type=entity_type or '',
            entity_id=entity_id,
            metadata=dict(metadata or {}),
        )
        for recipient in unique_recipients
    ]
    return Notification.objects.bulk_create(notifications)
