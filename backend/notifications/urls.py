from django.urls import path
from .views import (
    list_notifications, unread_count, notification_summary, mark_read,
    mark_all_read, archive_notification, archive_read_notifications,
)

urlpatterns = [
    path('api/notifications/',              list_notifications, name='notifications'),
    path('api/notifications/unread-count/', unread_count,       name='notif_unread_count'),
    path('api/notifications/summary/',      notification_summary, name='notif_summary'),
    path('api/notifications/mark-all-read/', mark_all_read,     name='notif_mark_all_read'),
    path('api/notifications/archive-read/', archive_read_notifications, name='notif_archive_read'),
    path('api/notifications/<int:notif_id>/read/', mark_read,   name='notif_mark_read'),
    path('api/notifications/<int:notif_id>/archive/', archive_notification, name='notif_archive'),
]
