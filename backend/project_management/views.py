from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import os
import mimetypes

from django.http import FileResponse
from django.db.models import Count, Q
from .models import ProjectBoard, Task, TaskComment, TaskAttachment, ActivityLog
from .serializers import (
    ProjectBoardSerializer, TaskSerializer,
    TaskCommentSerializer, TaskAttachmentSerializer, ActivityLogSerializer,
)
from notifications.utils import notify, notify_many


# ── Helpers ───────────────────────────────────────────────────────────────────

MAX_BOARD_LIST_SIZE = 100
MAX_COMMENT_LIST_SIZE = 100
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.txt'}

def _get_student_board(student):
    from projects.models import StudentIdeaProposal, IdeaApplication, ProposalInvitation, TeamInvitation

    proposal = StudentIdeaProposal.objects.filter(student=student, status='assigned').exclude(
        withdrawal_requests__student=student,
        withdrawal_requests__status='approved',
    ).first()
    if not proposal:
        inv = ProposalInvitation.objects.filter(
            invitee=student, status='accepted', proposal__status='assigned'
        ).exclude(
            proposal__withdrawal_requests__student=student,
            proposal__withdrawal_requests__status='approved',
        ).select_related('proposal').first()
        if inv:
            proposal = inv.proposal

    if proposal:
        board, _ = ProjectBoard.objects.get_or_create(
            proposal=proposal, defaults={'title': proposal.title}
        )
        return board

    application = IdeaApplication.objects.filter(student=student, status='registered').exclude(
        withdrawal_requests__student=student,
        withdrawal_requests__status='approved',
    ).first()
    if not application:
        inv = TeamInvitation.objects.filter(
            invitee=student, status='accepted', application__status='registered'
        ).exclude(
            application__withdrawal_requests__student=student,
            application__withdrawal_requests__status='approved',
        ).select_related('application').first()
        if inv:
            application = inv.application

    if application:
        board, _ = ProjectBoard.objects.get_or_create(
            application=application, defaults={'title': application.idea.title}
        )
        return board

    return None


def _proposal_supervised_by(proposal, doctor):
    if not proposal:
        return False
    if proposal.supervisor_assignments.filter(supervisor=doctor, status='accepted').exists():
        return True
    return bool(proposal.supervisor_id == doctor.id and not proposal.supervisor_assignments.exists())


def _board_detail_queryset():
    return ProjectBoard.objects.select_related(
        'proposal__supervisor',
        'proposal__student',
        'application__idea__doctor',
        'application__student',
    ).prefetch_related(
        'proposal__supervisor_assignments__supervisor',
        'tasks__assignee',
        'tasks__created_by',
        'tasks__comments__author',
        'tasks__attachments__uploaded_by',
    )


def _get_board_for_member(user, board_id):
    try:
        board = ProjectBoard.objects.select_related(
            'proposal__supervisor',
            'proposal__student',
            'application__idea__doctor',
            'application__student',
        ).prefetch_related(
            'proposal__supervisor_assignments',
        ).get(pk=board_id)
    except ProjectBoard.DoesNotExist:
        return None

    if user.role == 'student' and board.members.filter(pk=user.pk).exists():
        return board

    if user.role == 'doctor':
        if board.proposal and _proposal_supervised_by(board.proposal, user):
            return board
        if board.application and board.application.idea.doctor_id == user.id:
            return board

    return None


def _log(board, actor, verb, detail='', task=None):
    ActivityLog.objects.create(board=board, actor=actor, verb=verb, detail=detail, task=task)


def _task_notification_metadata(board, task, extra=None):
    metadata = {'board_id': board.id, 'board_title': board.title, 'task_id': task.id}
    if extra:
        metadata.update(extra)
    return metadata


def _notify_task_followers(task, actor, notif_type, title, message, *, priority=None, extra=None):
    recipients = []
    for user in [task.assignee, task.created_by]:
        if user and user.pk != getattr(actor, 'pk', None) and user.pk not in [u.pk for u in recipients]:
            recipients.append(user)
    if recipients:
        notify_many(
            recipients,
            notif_type,
            title,
            message,
            actor=actor,
            priority=priority,
            action_label='Open task',
            entity_type='task',
            entity_id=task.id,
            metadata=_task_notification_metadata(task.board, task, extra=extra),
        )


# ── Board ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_board(request):
    if request.user.role != 'student':
        return Response({'error': 'Students only.'}, status=403)
    board = _get_student_board(request.user)
    if not board:
        return Response({'has_project': False})
    board = _board_detail_queryset().get(pk=board.pk)
    return Response({'has_project': True, 'board': ProjectBoardSerializer(board).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_boards(request):
    if request.user.role != 'doctor':
        return Response({'error': 'Doctors only.'}, status=403)

    from projects.models import StudentIdeaProposal, IdeaApplication
    boards = []

    proposals = StudentIdeaProposal.objects.filter(status='assigned').filter(
        Q(supervisor_assignments__supervisor=request.user, supervisor_assignments__status='accepted') |
        Q(supervisor=request.user, supervisor_assignments__isnull=True)
    ).distinct()

    for proposal in proposals[:MAX_BOARD_LIST_SIZE]:
        board, _ = ProjectBoard.objects.get_or_create(
            proposal=proposal, defaults={'title': proposal.title}
        )
        boards.append(board)

    for application in IdeaApplication.objects.filter(
        idea__doctor=request.user, status='registered'
    ).select_related('idea')[:MAX_BOARD_LIST_SIZE]:
        if len(boards) >= MAX_BOARD_LIST_SIZE:
            break
        board, _ = ProjectBoard.objects.get_or_create(
            application=application, defaults={'title': application.idea.title}
        )
        boards.append(board)

    boards = _board_detail_queryset().filter(pk__in=[board.pk for board in boards])
    return Response(ProjectBoardSerializer(boards, many=True).data)


# ── Tasks ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_task(request, board_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    serializer = TaskSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    task = serializer.save(board=board, created_by=request.user)
    _log(board, request.user, 'created', task.title, task=task)
    if task.assignee and task.assignee_id != request.user.id:
        notify(
            task.assignee,
            'task_assigned',
            'New Task Assigned',
            f'{request.user.get_full_name() or request.user.username} assigned you "{task.title}" on {board.title}.',
            actor=request.user,
            action_label='Open task',
            entity_type='task',
            entity_id=task.id,
            metadata=_task_notification_metadata(board, task),
        )
    else:
        notify_many(
            board.members.exclude(pk=request.user.pk),
            'task_created',
            'New Project Task',
            f'{request.user.get_full_name() or request.user.username} created "{task.title}" on {board.title}.',
            actor=request.user,
            action_label='Open board',
            entity_type='task',
            entity_id=task.id,
            metadata=_task_notification_metadata(board, task),
        )
    return Response(TaskSerializer(task).data, status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task(request, board_id, task_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    try:
        task = board.tasks.get(pk=task_id)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=404)

    old_status   = task.status
    old_priority = task.priority
    old_assignee = task.assignee_id

    serializer = TaskSerializer(task, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    serializer.save()
    task.refresh_from_db()

    # Activity logging
    if 'status' in request.data and task.status != old_status:
        _log(board, request.user, 'status_changed',
             f'{old_status} → {task.status}', task=task)
    if 'priority' in request.data and task.priority != old_priority:
        _log(board, request.user, 'priority_changed',
             f'{old_priority} → {task.priority}', task=task)
    if 'assignee' in request.data and task.assignee_id != old_assignee:
        verb   = 'assigned' if task.assignee_id else 'unassigned'
        detail = task.assignee.get_full_name() or task.assignee.username if task.assignee else ''
        _log(board, request.user, verb, detail, task=task)
        if task.assignee and task.assignee_id != request.user.id:
            notify(
                task.assignee,
                'task_assigned',
                'Task Assigned to You',
                f'{request.user.get_full_name() or request.user.username} assigned you "{task.title}" on {board.title}.',
                actor=request.user,
                action_label='Open task',
                entity_type='task',
                entity_id=task.id,
                metadata=_task_notification_metadata(board, task),
            )
    if 'due_date' in request.data:
        _log(board, request.user, 'due_date_set', str(task.due_date or ''), task=task)
    if 'status' in request.data and task.status != old_status:
        if task.status == 'done':
            _notify_task_followers(
                task,
                request.user,
                'task_completed',
                'Task Completed',
                f'"{task.title}" was marked done on {board.title}.',
                extra={'old_status': old_status, 'new_status': task.status},
            )
        else:
            _notify_task_followers(
                task,
                request.user,
                'task_updated',
                'Task Status Updated',
                f'"{task.title}" moved from {old_status} to {task.status}.',
                extra={'old_status': old_status, 'new_status': task.status},
            )

    return Response(TaskSerializer(task).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_task(request, board_id, task_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    try:
        task = board.tasks.get(pk=task_id)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=404)

    _log(board, request.user, 'deleted', task.title)
    task.delete()
    return Response(status=204)


# ── Comments ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def task_comments(request, board_id, task_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    try:
        task = board.tasks.get(pk=task_id)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=404)

    if request.method == 'GET':
        comments = task.comments.select_related('author')[:MAX_COMMENT_LIST_SIZE]
        return Response(TaskCommentSerializer(comments, many=True).data)

    serializer = TaskCommentSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    comment = serializer.save(task=task, author=request.user)
    _log(board, request.user, 'commented', comment.body[:100], task=task)
    _notify_task_followers(
        task,
        request.user,
        'task_comment_added',
        'New Task Comment',
        f'{request.user.get_full_name() or request.user.username} commented on "{task.title}".',
        extra={'comment_id': comment.id},
    )
    return Response(TaskCommentSerializer(comment).data, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment(request, board_id, task_id, comment_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    try:
        comment = TaskComment.objects.get(pk=comment_id, task__board=board, task_id=task_id)
    except TaskComment.DoesNotExist:
        return Response({'error': 'Comment not found.'}, status=404)

    # Only author or supervisor can delete
    if comment.author_id != request.user.id and request.user.role != 'doctor':
        return Response({'error': 'Not allowed.'}, status=403)

    comment.delete()
    return Response(status=204)


# ── Attachments ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_attachment(request, board_id, task_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    try:
        task = board.tasks.get(pk=task_id)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=404)

    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file provided.'}, status=400)

    if file.size > MAX_ATTACHMENT_SIZE:
        return Response({'error': 'File too large. Max 10 MB.'}, status=400)
    extension = os.path.splitext(file.name or '')[1].lower()
    if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        return Response({'error': 'Unsupported file type.'}, status=400)

    attachment = TaskAttachment.objects.create(
        task=task,
        uploaded_by=request.user,
        file=file,
        filename=file.name,
        file_size=file.size,
    )
    _log(board, request.user, 'attachment_added', file.name, task=task)
    _notify_task_followers(
        task,
        request.user,
        'task_attachment_added',
        'Task Attachment Added',
        f'{request.user.get_full_name() or request.user.username} attached {file.name} to "{task.title}".',
        extra={'attachment_id': attachment.id, 'filename': file.name},
    )
    return Response(
        TaskAttachmentSerializer(attachment, context={'request': request}).data,
        status=201,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def open_attachment(request, board_id, task_id, attachment_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    try:
        attachment = TaskAttachment.objects.get(
            pk=attachment_id, task__board=board, task_id=task_id
        )
    except TaskAttachment.DoesNotExist:
        return Response({'error': 'Attachment not found.'}, status=404)

    if not attachment.file:
        return Response({'error': 'Attachment file is missing.'}, status=404)

    content_type = mimetypes.guess_type(attachment.filename)[0] or 'application/octet-stream'
    return FileResponse(
        attachment.file.open('rb'),
        as_attachment=False,
        filename=attachment.filename,
        content_type=content_type,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_attachment(request, board_id, task_id, attachment_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    try:
        attachment = TaskAttachment.objects.get(
            pk=attachment_id, task__board=board, task_id=task_id
        )
    except TaskAttachment.DoesNotExist:
        return Response({'error': 'Attachment not found.'}, status=404)

    if attachment.uploaded_by_id != request.user.id and request.user.role != 'doctor':
        return Response({'error': 'Not allowed.'}, status=403)

    _log(board, request.user, 'attachment_removed', attachment.filename, task=attachment.task)
    attachment.file.delete(save=False)
    attachment.delete()
    return Response(status=204)


# ── Activity Log ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def board_activity(request, board_id):
    board = _get_board_for_member(request.user, board_id)
    if not board:
        return Response({'error': 'Not found or not a member.'}, status=404)

    logs = board.activities.select_related('actor', 'task')[:50]
    return Response(ActivityLogSerializer(logs, many=True).data)


# ── HoD & Dean ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hod_boards(request):
    """HoD view: all boards in their department (read-only)."""
    if request.user.role not in ['hod', 'dean']:
        return Response({'error': 'HoD or Dean only.'}, status=403)

    from projects.models import StudentIdeaProposal, IdeaApplication

    boards = []
    department = request.user.department

    # HoD: only their department
    if request.user.role == 'hod':
        proposals = StudentIdeaProposal.objects.filter(
            department=department, status='assigned'
        ).select_related('supervisor').prefetch_related('supervisor_assignments__supervisor')
        applications = IdeaApplication.objects.filter(
            idea__department=department, status='registered'
        ).select_related('idea__doctor')
    # Dean: all departments
    else:
        proposals = StudentIdeaProposal.objects.filter(status='assigned').select_related('supervisor').prefetch_related('supervisor_assignments__supervisor')
        applications = IdeaApplication.objects.filter(status='registered').select_related('idea__doctor')

    for proposal in proposals[:MAX_BOARD_LIST_SIZE]:
        board, _ = ProjectBoard.objects.get_or_create(
            proposal=proposal, defaults={'title': proposal.title}
        )
        boards.append(board)

    for application in applications[:MAX_BOARD_LIST_SIZE]:
        if len(boards) >= MAX_BOARD_LIST_SIZE:
            break
        board, _ = ProjectBoard.objects.get_or_create(
            application=application, defaults={'title': application.idea.title}
        )
        boards.append(board)

    boards = _board_detail_queryset().filter(pk__in=[board.pk for board in boards])
    return Response(ProjectBoardSerializer(boards, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hod_stats(request):
    """HoD/Dean dashboard statistics."""
    if request.user.role not in ['hod', 'dean']:
        return Response({'error': 'HoD or Dean only.'}, status=403)

    from projects.models import StudentIdeaProposal, IdeaApplication

    department = request.user.department

    if request.user.role == 'hod':
        proposals_count = StudentIdeaProposal.objects.filter(
            department=department, status='assigned'
        ).count()
        applications_count = IdeaApplication.objects.filter(
            idea__department=department, status='registered'
        ).count()
    else:
        proposals_count = StudentIdeaProposal.objects.filter(status='assigned').count()
        applications_count = IdeaApplication.objects.filter(status='registered').count()

    total_projects = proposals_count + applications_count

    if request.user.role == 'hod':
        boards_qs = ProjectBoard.objects.filter(
            Q(proposal__department=department, proposal__status='assigned') |
            Q(application__idea__department=department, application__status='registered')
        )
    else:
        boards_qs = ProjectBoard.objects.filter(
            Q(proposal__status='assigned') | Q(application__status='registered')
        )

    total_progress = 0
    board_count = 0

    for board in boards_qs.annotate(
        total_tasks=Count('tasks'),
        done_tasks=Count('tasks', filter=Q(tasks__status='done')),
    ):
        if board.total_tasks:
            total_progress += (board.done_tasks / board.total_tasks) * 100
            board_count += 1

    avg_progress = round(total_progress / board_count) if board_count > 0 else 0

    return Response({
        'total_projects': total_projects,
        'proposals_count': proposals_count,
        'applications_count': applications_count,
        'avg_progress': avg_progress,
        'department': department if request.user.role == 'hod' else 'All Departments',
    })
