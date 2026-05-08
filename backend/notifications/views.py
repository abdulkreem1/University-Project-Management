from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer


MAX_NOTIFICATION_LIST_SIZE = 100


def _notification_queryset(user):
    return Notification.objects.filter(recipient=user).select_related('actor')


def _parse_limit(request):
    try:
        limit = int(request.query_params.get('limit', 50))
    except (TypeError, ValueError):
        limit = 50
    return min(max(limit, 1), MAX_NOTIFICATION_LIST_SIZE)


def _apply_filters(qs, request):
    status = request.query_params.get('status', 'active')
    category = request.query_params.get('category', '').strip()
    priority = request.query_params.get('priority', '').strip()

    if status == 'unread':
        qs = qs.filter(is_read=False, archived_at__isnull=True)
    elif status == 'read':
        qs = qs.filter(is_read=True, archived_at__isnull=True)
    elif status == 'archived':
        qs = qs.filter(archived_at__isnull=False)
    elif status != 'all':
        qs = qs.filter(archived_at__isnull=True)

    if category:
        qs = qs.filter(category=category)
    if priority:
        qs = qs.filter(priority=priority)
    return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    notifs = _apply_filters(_notification_queryset(request.user), request)[:_parse_limit(request)]
    return Response(NotificationSerializer(notifs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(
        recipient=request.user,
        is_read=False,
        archived_at__isnull=True,
    ).count()
    urgent_count = Notification.objects.filter(
        recipient=request.user,
        is_read=False,
        archived_at__isnull=True,
        priority='urgent',
    ).count()
    return Response({'count': count, 'urgent_count': urgent_count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_summary(request):
    qs = Notification.objects.filter(recipient=request.user, archived_at__isnull=True)
    by_category = qs.values('category').annotate(
        total=Count('id'),
        unread=Count('id', filter=Q(is_read=False)),
    ).order_by('category')
    return Response({
        'total': qs.count(),
        'unread': qs.filter(is_read=False).count(),
        'high_priority_unread': qs.filter(is_read=False, priority__in=['high', 'urgent']).count(),
        'archived': Notification.objects.filter(recipient=request.user, archived_at__isnull=False).count(),
        'by_category': list(by_category),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, notif_id):
    try:
        n = Notification.objects.get(pk=notif_id, recipient=request.user)
        update_fields = []
        if not n.is_read:
            n.is_read = True
            n.read_at = timezone.now()
            update_fields.extend(['is_read', 'read_at'])
        if update_fields:
            n.save(update_fields=update_fields)
    except Notification.DoesNotExist:
        pass
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    qs = Notification.objects.filter(
        recipient=request.user,
        is_read=False,
        archived_at__isnull=True,
    )
    category = request.data.get('category') or request.query_params.get('category')
    if category:
        qs = qs.filter(category=category)
    updated = qs.update(is_read=True, read_at=timezone.now())
    return Response({'ok': True, 'updated': updated})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archive_notification(request, notif_id):
    try:
        n = Notification.objects.get(pk=notif_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'ok': True})

    now = timezone.now()
    update_fields = []
    if not n.is_read:
        n.is_read = True
        n.read_at = now
        update_fields.extend(['is_read', 'read_at'])
    if not n.archived_at:
        n.archived_at = now
        update_fields.append('archived_at')
    if update_fields:
        n.save(update_fields=update_fields)
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archive_read_notifications(request):
    updated = Notification.objects.filter(
        recipient=request.user,
        is_read=True,
        archived_at__isnull=True,
    ).update(archived_at=timezone.now())
    return Response({'ok': True, 'updated': updated})
