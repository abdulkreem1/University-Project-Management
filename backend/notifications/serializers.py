from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField(read_only=True)
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    priority_label = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model  = Notification
        fields = [
            'id', 'notif_type', 'category', 'category_label', 'priority',
            'priority_label', 'title', 'message', 'actor', 'actor_name',
            'action_url', 'action_label', 'entity_type', 'entity_id',
            'metadata', 'is_read', 'read_at', 'archived_at', 'created_at',
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        return obj.actor.get_full_name() or obj.actor.username
