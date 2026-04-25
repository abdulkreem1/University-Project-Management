from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ProjectBoard, Task, TaskComment, TaskAttachment, ActivityLog
from .serializers import (
    ProjectBoardSerializer, TaskSerializer,
    TaskCommentSerializer, TaskAttachmentSerializer, ActivityLogSerializer,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_student_board(student):
    from projects.models import StudentIdeaProposal, IdeaApplication, ProposalInvitation, TeamInvitation

    proposal = StudentIdeaProposal.objects.filter(student=student, status='assigned').first()
    if not proposal:
        inv = ProposalInvitation.objects.filter(
            invitee=student, status='accepted', proposal__status='assigned'
        ).select_related('proposal').first()
        if inv:
            proposal = inv.proposal

    if proposal:
        board, _ = ProjectBoard.objects.get_or_create(
            proposal=proposal, defaults={'title': proposal.title}
        )
        return board

    application = IdeaApplication.objects.filter(student=student, status='registered').first()
    if not application:
        inv = TeamInvitation.objects.filter(
            invitee=student, status='accepted', application__status='registered'
        ).select_related('application').first()
        if inv:
            application = inv.application

    if application:
        board, _ = ProjectBoard.objects.get_or_create(
            application=application, defaults={'title': application.idea.title}
        )
        return board

    return None


def _get_board_for_member(user, board_id):
    try:
        board = ProjectBoard.objects.get(pk=board_id)
    except ProjectBoard.DoesNotExist:
        return None

    if user.role == 'student' and user in board.members:
        return board

    if user.role == 'doctor':
        if board.proposal and board.proposal.supervisor_id == user.id:
            return board
        if board.application and board.application.idea.doctor_id == user.id:
            return board

    return None


def _log(board, actor, verb, detail='', task=None):
    ActivityLog.objects.create(board=board, actor=actor, verb=verb, detail=detail, task=task)


# ── Board ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_board(request):
    if request.user.role != 'student':
        return Response({'error': 'Students only.'}, status=403)
    board = _get_student_board(request.user)
    if not board:
        return Response({'has_project': False})
    return Response({'has_project': True, 'board': ProjectBoardSerializer(board).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_boards(request):
    if request.user.role != 'doctor':
        return Response({'error': 'Doctors only.'}, status=403)

    from projects.models import StudentIdeaProposal, IdeaApplication
    boards = []

    for proposal in StudentIdeaProposal.objects.filter(supervisor=request.user, status='assigned'):
        board, _ = ProjectBoard.objects.get_or_create(
            proposal=proposal, defaults={'title': proposal.title}
        )
        boards.append(board)

    for application in IdeaApplication.objects.filter(
        idea__doctor=request.user, status='registered'
    ).select_related('idea'):
        board, _ = ProjectBoard.objects.get_or_create(
            application=application, defaults={'title': application.idea.title}
        )
        boards.append(board)

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
    if 'due_date' in request.data:
        _log(board, request.user, 'due_date_set', str(task.due_date or ''), task=task)

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
        return Response(TaskCommentSerializer(task.comments.all(), many=True).data)

    serializer = TaskCommentSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    comment = serializer.save(task=task, author=request.user)
    _log(board, request.user, 'commented', comment.body[:100], task=task)
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

    # 10 MB limit
    if file.size > 10 * 1024 * 1024:
        return Response({'error': 'File too large. Max 10 MB.'}, status=400)

    attachment = TaskAttachment.objects.create(
        task=task,
        uploaded_by=request.user,
        file=file,
        filename=file.name,
        file_size=file.size,
    )
    _log(board, request.user, 'attachment_added', file.name, task=task)
    return Response(
        TaskAttachmentSerializer(attachment, context={'request': request}).data,
        status=201,
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

    _log(board, request.user, 'attachment_removed', attachment.filename, task=task_id)
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
        ).select_related('supervisor')
        applications = IdeaApplication.objects.filter(
            idea__department=department, status='registered'
        ).select_related('idea__doctor')
    # Dean: all departments
    else:
        proposals = StudentIdeaProposal.objects.filter(status='assigned').select_related('supervisor')
        applications = IdeaApplication.objects.filter(status='registered').select_related('idea__doctor')

    for proposal in proposals:
        board, _ = ProjectBoard.objects.get_or_create(
            proposal=proposal, defaults={'title': proposal.title}
        )
        boards.append(board)

    for application in applications:
        board, _ = ProjectBoard.objects.get_or_create(
            application=application, defaults={'title': application.idea.title}
        )
        boards.append(board)

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

    # Calculate average progress
    if request.user.role == 'hod':
        proposals = StudentIdeaProposal.objects.filter(department=department, status='assigned')
        applications = IdeaApplication.objects.filter(idea__department=department, status='registered')
    else:
        proposals = StudentIdeaProposal.objects.filter(status='assigned')
        applications = IdeaApplication.objects.filter(status='registered')

    total_progress = 0
    board_count = 0

    for proposal in proposals:
        try:
            board = ProjectBoard.objects.get(proposal=proposal)
            tasks = board.tasks.all()
            if tasks.count() > 0:
                done = tasks.filter(status='done').count()
                total_progress += (done / tasks.count()) * 100
                board_count += 1
        except ProjectBoard.DoesNotExist:
            pass

    for application in applications:
        try:
            board = ProjectBoard.objects.get(application=application)
            tasks = board.tasks.all()
            if tasks.count() > 0:
                done = tasks.filter(status='done').count()
                total_progress += (done / tasks.count()) * 100
                board_count += 1
        except ProjectBoard.DoesNotExist:
            pass

    avg_progress = round(total_progress / board_count) if board_count > 0 else 0

    return Response({
        'total_projects': total_projects,
        'proposals_count': proposals_count,
        'applications_count': applications_count,
        'avg_progress': avg_progress,
        'department': department if request.user.role == 'hod' else 'All Departments',
    })
