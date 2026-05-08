from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Notification
from .utils import notify, notify_many


User = get_user_model()


class NotificationSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='notif_user', password='Pass12345', role='student')
        self.actor = User.objects.create_user(username='notif_actor', password='Pass12345', role='doctor')

    def test_notify_sets_professional_metadata_defaults(self):
        notification = notify(
            self.user,
            'task_assigned',
            'Task Assigned',
            'You have a new task.',
            actor=self.actor,
            entity_type='task',
            entity_id=42,
            metadata={'board_id': 7},
        )

        self.assertEqual(notification.category, 'task')
        self.assertEqual(notification.priority, 'high')
        self.assertEqual(notification.actor, self.actor)
        self.assertEqual(notification.metadata['board_id'], 7)

    def test_notify_many_deduplicates_recipients(self):
        notify_many(
            [self.user, self.user],
            'workflow_applied',
            'Workflow Applied',
            'A workflow was applied.',
            actor=self.actor,
        )

        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)

    def test_notification_list_filters_and_serializes_metadata(self):
        notify(self.user, 'task_assigned', 'Task Assigned', 'Task message', actor=self.actor)
        notify(self.user, 'workflow_applied', 'Workflow Applied', 'Workflow message', actor=self.actor)
        notify(self.actor, 'task_assigned', 'Other User', 'Should not appear')

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/', {'category': 'task'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['category'], 'task')
        self.assertEqual(response.data[0]['actor_name'], self.actor.username)
        self.assertIn('priority_label', response.data[0])

    def test_mark_read_and_archive_update_counts(self):
        notification = notify(self.user, 'task_assigned', 'Task Assigned', 'Task message')
        notify(self.user, 'workflow_applied', 'Workflow Applied', 'Workflow message')

        self.client.force_authenticate(user=self.user)
        read_response = self.client.post(f'/api/notifications/{notification.id}/read/')
        count_response = self.client.get('/api/notifications/unread-count/')
        archive_response = self.client.post(f'/api/notifications/{notification.id}/archive/')
        summary_response = self.client.get('/api/notifications/summary/')

        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(count_response.data['count'], 1)
        self.assertEqual(archive_response.status_code, 200)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)
        self.assertIsNotNone(notification.archived_at)
        self.assertEqual(summary_response.data['archived'], 1)
