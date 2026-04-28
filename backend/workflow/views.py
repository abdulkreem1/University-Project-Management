from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import IntegrityError, transaction
from datetime import datetime, timedelta

from .models import WorkflowTemplate, WorkflowStage, ProjectWorkflow, WorkflowStageInstance
from .serializers import (
    WorkflowTemplateSerializer, WorkflowStageSerializer,
    ProjectWorkflowSerializer, WorkflowStageInstanceSerializer
)
from .permissions import IsHodOrDoctor, IsHod, IsStudent


def _get_project_board(project_board_id):
    from project_management.models import ProjectBoard

    return ProjectBoard.objects.select_related(
        'proposal__supervisor',
        'proposal__student',
        'application__idea__doctor',
        'application__student',
    ).get(id=project_board_id)


def _project_department_and_supervisor(project_board):
    if project_board.proposal:
        return project_board.proposal.department, project_board.proposal.supervisor
    if project_board.application and project_board.application.idea:
        return project_board.application.idea.department, project_board.application.idea.doctor
    return None, None


def _user_can_access_project(user, project_board):
    department, supervisor = _project_department_and_supervisor(project_board)
    if user.role == 'dean':
        return True
    if user.role == 'hod':
        return department == user.department
    if user.role == 'doctor':
        return supervisor == user
    if user.role == 'student':
        return project_board.members.filter(pk=user.pk).exists()
    return False


def _user_can_apply_workflow(user, project_board):
    department, supervisor = _project_department_and_supervisor(project_board)
    if user.role == 'hod':
        return department == user.department
    if user.role == 'doctor':
        return supervisor == user
    return False


# ── HoD/Doctor: Manage Workflow Templates ────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def list_workflow_templates(request):
    """List all workflow templates for the user's department."""
    templates = WorkflowTemplate.objects.filter(
        department=request.user.department
    ).prefetch_related('stages', 'stages__fields')[:100]
    return Response(WorkflowTemplateSerializer(templates, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def get_workflow_template(request, template_id):
    """Get a specific workflow template."""
    try:
        template = WorkflowTemplate.objects.prefetch_related(
            'stages', 'stages__fields'
        ).get(id=template_id, department=request.user.department)
        return Response(WorkflowTemplateSerializer(template).data)
    except WorkflowTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def create_workflow_template(request):
    """Create a new workflow template."""
    data = request.data
    with transaction.atomic():
        template = WorkflowTemplate.objects.create(
            name=data.get('name'),
            description=data.get('description', ''),
            department=request.user.department,
            created_by=request.user,
            status='active'
        )
        
        # Create stages with fields
        for stage_data in data.get('stages', []):
            stage = WorkflowStage.objects.create(
                template=template,
                name=stage_data.get('name'),
                description=stage_data.get('description', ''),
                order=stage_data.get('order', 0),
                trigger_type=stage_data.get('trigger_type'),
                trigger_days=stage_data.get('trigger_days'),
                trigger_date=stage_data.get('trigger_date'),
                notify_before_days=stage_data.get('notify_before_days', 3),
                is_required=stage_data.get('is_required', True),
            )
            
            # Create fields for this stage
            from .models import WorkflowStageField
            for field_data in stage_data.get('fields', []):
                WorkflowStageField.objects.create(
                    stage=stage,
                    label=field_data.get('label'),
                    field_type=field_data.get('field_type'),
                    required=field_data.get('required', False),
                    options=field_data.get('options', []),
                    order=field_data.get('order', 0),
                )
    
    return Response(WorkflowTemplateSerializer(
        WorkflowTemplate.objects.prefetch_related('stages', 'stages__fields').get(pk=template.pk)
    ).data, status=201)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def update_workflow_template(request, template_id):
    """Update a workflow template."""
    try:
        template = WorkflowTemplate.objects.get(
            id=template_id,
            department=request.user.department
        )
    except WorkflowTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=404)
    
    data = request.data
    with transaction.atomic():
        template.name = data.get('name', template.name)
        template.description = data.get('description', template.description)
        template.status = data.get('status', template.status)
        template.save()
        
        # Update stages if provided
        if 'stages' in data:
            template.stages.all().delete()
            from .models import WorkflowStageField
            for stage_data in data['stages']:
                stage = WorkflowStage.objects.create(
                    template=template,
                    name=stage_data.get('name'),
                    description=stage_data.get('description', ''),
                    order=stage_data.get('order', 0),
                    trigger_type=stage_data.get('trigger_type'),
                    trigger_days=stage_data.get('trigger_days'),
                    trigger_date=stage_data.get('trigger_date'),
                    notify_before_days=stage_data.get('notify_before_days', 3),
                    is_required=stage_data.get('is_required', True),
                )
                
                # Create fields for this stage
                for field_data in stage_data.get('fields', []):
                    WorkflowStageField.objects.create(
                        stage=stage,
                        label=field_data.get('label'),
                        field_type=field_data.get('field_type'),
                        required=field_data.get('required', False),
                        options=field_data.get('options', []),
                        order=field_data.get('order', 0),
                    )
    
    return Response(WorkflowTemplateSerializer(
        WorkflowTemplate.objects.prefetch_related('stages', 'stages__fields').get(pk=template.pk)
    ).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def delete_workflow_template(request, template_id):
    """Delete a workflow template."""
    try:
        template = WorkflowTemplate.objects.get(
            id=template_id,
            department=request.user.department
        )
        template.delete()
        return Response({'message': 'Template deleted successfully'})
    except WorkflowTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=404)


# ── Apply Workflow to Project ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def apply_workflow_to_project(request):
    """Apply a workflow template to a project."""
    project_board_id = request.data.get('project_board_id')
    template_id = request.data.get('template_id')
    
    try:
        template = WorkflowTemplate.objects.prefetch_related('stages').get(
            id=template_id,
            department=request.user.department
        )
    except WorkflowTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=404)
    
    from project_management.models import ProjectBoard

    try:
        project_board = _get_project_board(project_board_id)
        department, _ = _project_department_and_supervisor(project_board)
        if not department:
            return Response({'error': 'Could not determine project department'}, status=400)
        if not _user_can_apply_workflow(request.user, project_board):
            return Response({'error': 'You cannot apply workflows to this project'}, status=403)
    except ProjectBoard.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    with transaction.atomic():
        if ProjectWorkflow.objects.select_for_update().filter(project_board_id=project_board_id, is_active=True).exists():
            return Response({'error': 'Project already has an active workflow'}, status=400)

        try:
            project_workflow = ProjectWorkflow.objects.create(
                project_board_id=project_board_id,
                template=template,
                is_active=True
            )
        except IntegrityError:
            return Response({'error': 'Project already has an active workflow'}, status=400)
        
        # Create stage instances
        project_start_date = datetime.now().date()
        for stage in template.stages.all():
            due_date = None
            
            # Calculate due date based on trigger type
            if stage.trigger_type == 'project_start':
                due_date = project_start_date
            elif stage.trigger_type == 'after_days' and stage.trigger_days:
                due_date = project_start_date + timedelta(days=stage.trigger_days)
            elif stage.trigger_type == 'date' and stage.trigger_date:
                due_date = stage.trigger_date
            
            WorkflowStageInstance.objects.create(
                project_workflow=project_workflow,
                stage=stage,
                due_date=due_date,
                status='pending'
            )
    
    return Response(ProjectWorkflowSerializer(
        ProjectWorkflow.objects.prefetch_related('stage_instances').get(pk=project_workflow.pk)
    ).data, status=201)


# ── Student: View and Submit Workflow Stages ──────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_project_workflow(request, project_board_id):
    """Get the workflow for a specific project."""
    from project_management.models import ProjectBoard

    try:
        project_board = _get_project_board(project_board_id)
    except ProjectBoard.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)

    if not _user_can_access_project(request.user, project_board):
        return Response({'error': 'Not allowed to view this workflow'}, status=403)

    try:
        workflow = ProjectWorkflow.objects.prefetch_related(
            'stage_instances__stage__fields',
            'stage_instances__field_responses'
        ).get(project_board_id=project_board_id, is_active=True)
        return Response(ProjectWorkflowSerializer(workflow).data)
    except ProjectWorkflow.DoesNotExist:
        return Response({'error': 'No active workflow found for this project'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def get_pending_stages(request):
    """Get all pending workflow stages for the student's projects."""
    # This would need to be integrated with your project management system
    # For now, returning a placeholder
    return Response({'message': 'To be implemented with project integration'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def submit_workflow_stage(request, stage_instance_id):
    """Submit field responses for a workflow stage."""
    try:
        stage_instance = WorkflowStageInstance.objects.select_related(
            'stage', 'project_workflow'
        ).prefetch_related(
            'stage__fields'
        ).get(id=stage_instance_id)
    except WorkflowStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=404)

    from project_management.models import ProjectBoard

    try:
        project_board = _get_project_board(stage_instance.project_workflow.project_board_id)
    except ProjectBoard.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)

    if request.user.role != 'student' or not project_board.members.filter(pk=request.user.pk).exists():
        return Response({'error': 'Not allowed to submit this workflow stage'}, status=403)
    
    field_responses = request.data.get('field_responses', {})
    if not isinstance(field_responses, dict):
        return Response({'error': 'field_responses must be an object'}, status=400)

    fields_by_id = {str(field.id): field for field in stage_instance.stage.fields.all()}
    for field_id in field_responses.keys():
        if str(field_id) not in fields_by_id:
            return Response({'error': f'Invalid field for this stage: {field_id}'}, status=400)
    for field in fields_by_id.values():
        if field.required and not field_responses.get(str(field.id)):
            return Response({'error': f'Field is required: {field.label}'}, status=400)
    
    with transaction.atomic():
        from .models import WorkflowFieldResponse
        stage_instance = WorkflowStageInstance.objects.select_for_update().get(pk=stage_instance.pk)
        
        # Delete existing responses for this stage instance
        stage_instance.field_responses.all().delete()
        
        # Create new responses
        for field_id, value in field_responses.items():
            WorkflowFieldResponse.objects.create(
                stage_instance=stage_instance,
                field_id=field_id,
                value=value
            )
        
        stage_instance.status = 'submitted'
        stage_instance.submitted_at = datetime.now()
        stage_instance.save()
    
    return Response(WorkflowStageInstanceSerializer(stage_instance).data)


# ── HoD/Doctor: Review Workflow Stage Submissions ─────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def review_workflow_stage(request, stage_instance_id):
    """Review and approve/reject a workflow stage submission."""
    try:
        stage_instance = WorkflowStageInstance.objects.select_related(
            'project_workflow__template__created_by',
            'stage'
        ).get(id=stage_instance_id)
    except WorkflowStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=404)
    
    # Check if user has permission to review
    template_creator = stage_instance.project_workflow.template.created_by
    
    # Only the person who created the workflow template can review submissions
    if request.user != template_creator:
        return Response({
            'error': f'Only {template_creator.username} (workflow creator) can review this submission'
        }, status=403)
    
    action = request.data.get('action')  # 'approve' or 'reject'
    feedback = request.data.get('feedback', '')
    
    if action not in ['approve', 'reject']:
        return Response({'error': 'Invalid action'}, status=400)
    
    with transaction.atomic():
        stage_instance = WorkflowStageInstance.objects.select_for_update().get(pk=stage_instance.pk)
        stage_instance.status = 'approved' if action == 'approve' else 'rejected'
        stage_instance.feedback = feedback
        stage_instance.reviewed_by = request.user
        stage_instance.reviewed_at = datetime.now()
        stage_instance.save()
    
    return Response(WorkflowStageInstanceSerializer(stage_instance).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def get_available_projects(request):
    """Get projects that the user can apply workflows to."""
    from project_management.models import ProjectBoard

    projects = ProjectBoard.objects.select_related(
        'proposal__supervisor',
        'proposal__student',
        'application__idea__doctor',
        'application__student'
    ).prefetch_related(
        'proposal__invitations',
        'application__invitations'
    )

    project_list = list(projects[:500])
    active_workflows = {
        workflow.project_board_id: workflow
        for workflow in ProjectWorkflow.objects.filter(
            project_board_id__in=[project.id for project in project_list],
            is_active=True,
        ).select_related('template__created_by')
    }

    # Filter based on user role
    filtered_projects = []
    for project in project_list:
        department, supervisor = _project_department_and_supervisor(project)
        
        # Skip if no department found
        if not department:
            continue
        
        # Check permissions
        if request.user.role == 'hod':
            # HoD can see all projects in their department
            if department != request.user.department:
                continue
        elif request.user.role == 'doctor':
            # Doctor can only see projects they supervise
            if supervisor != request.user:
                continue
        else:
            continue
        
        # Get team members
        team_members = []
        for member in project.members:
            team_members.append({
                'id': member.id,
                'name': member.username  # User model uses username, not name
            })
        
        # Check if project already has workflow
        workflow = active_workflows.get(project.id)
        has_workflow = workflow is not None
        
        # Check if user created the workflow (for review purposes)
        workflow_created_by_user = bool(workflow and workflow.template.created_by == request.user)
        
        filtered_projects.append({
            'id': project.id,
            'title': project.title,
            'department': department,
            'supervisor_name': supervisor.username if supervisor else None,  # Use username
            'team_members': team_members,
            'has_workflow': has_workflow,
            'can_review': workflow_created_by_user  # New field
        })
    return Response(filtered_projects)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def get_reviewable_projects(request):
    """Get projects with workflows created by the current user (for review)."""
    from project_management.models import ProjectBoard
    
    # Get workflows created by current user
    workflows = ProjectWorkflow.objects.filter(
        template__created_by=request.user,
        is_active=True
    ).select_related('template').values_list('project_board_id', flat=True)[:500]
    
    # Get project boards
    projects = ProjectBoard.objects.filter(
        id__in=workflows
    ).select_related(
        'proposal__supervisor',
        'application__idea__doctor'
    )
    
    # Serialize
    data = []
    for project in projects:
        # Get team members
        team_members = []
        for member in project.members:
            team_members.append({
                'id': member.id,
                'name': member.username
            })
        
        # Get supervisor
        supervisor_name = None
        if project.proposal:
            supervisor_name = project.proposal.supervisor.username if project.proposal.supervisor else None
        elif project.application:
            supervisor_name = project.application.idea.doctor.username if project.application.idea.doctor else None
        
        data.append({
            'id': project.id,
            'title': project.title,
            'supervisor_name': supervisor_name,
            'team_members': team_members,
            'has_workflow': True
        })
    
    return Response(data)
