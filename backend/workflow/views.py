from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from datetime import datetime, timedelta

from .models import WorkflowTemplate, WorkflowStage, ProjectWorkflow, WorkflowStageInstance
from .serializers import (
    WorkflowTemplateSerializer, WorkflowStageSerializer,
    ProjectWorkflowSerializer, WorkflowStageInstanceSerializer
)
from .permissions import IsHodOrDoctor, IsHod, IsStudent


# ── HoD/Doctor: Manage Workflow Templates ────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHodOrDoctor])
def list_workflow_templates(request):
    """List all workflow templates for the user's department."""
    templates = WorkflowTemplate.objects.filter(
        department=request.user.department
    ).prefetch_related('stages', 'stages__fields')
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
    
    # Check if workflow already exists for this project
    if ProjectWorkflow.objects.filter(project_board_id=project_board_id, is_active=True).exists():
        return Response({'error': 'Project already has an active workflow'}, status=400)
    
    # Verify user has permission to apply workflow to this project
    # Import here to avoid circular imports
    from project_management.models import ProjectBoard
    
    try:
        project_board = ProjectBoard.objects.select_related(
            'proposal__supervisor',
            'application__idea__doctor'
        ).get(id=project_board_id)
        
        # Get department and supervisor from proposal or application
        department = None
        supervisor = None
        
        if project_board.proposal:
            department = project_board.proposal.department
            supervisor = project_board.proposal.supervisor
        elif project_board.application:
            # For applications, get department from the idea itself, not from doctor
            if project_board.application.idea:
                department = project_board.application.idea.department
                supervisor = project_board.application.idea.doctor
        
        # Check if department was found
        if not department:
            return Response({'error': 'Could not determine project department'}, status=400)
        
        # HoD can apply to any project in their department
        if request.user.role == 'hod':
            if department != request.user.department:
                return Response({'error': 'You can only apply workflows to projects in your department'}, status=403)
        
        # Doctor can only apply to projects they supervise
        elif request.user.role == 'doctor':
            if supervisor != request.user:
                return Response({'error': 'You can only apply workflows to projects you supervise'}, status=403)
        
    except ProjectBoard.DoesNotExist:
        return Response({'error': 'Project not found'}, status=404)
    
    with transaction.atomic():
        # Create project workflow
        project_workflow = ProjectWorkflow.objects.create(
            project_board_id=project_board_id,
            template=template,
            is_active=True
        )
        
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
        ).get(id=stage_instance_id)
    except WorkflowStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=404)
    
    field_responses = request.data.get('field_responses', {})
    
    with transaction.atomic():
        from .models import WorkflowFieldResponse
        
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
    from projects.models import StudentIdeaProposal, IdeaApplication
    
    print(f"[DEBUG] User: {request.user.username}, Role: {request.user.role}, Department: {request.user.department}")
    
    # Get all project boards
    projects = ProjectBoard.objects.select_related(
        'proposal__supervisor',
        'proposal__student',
        'application__idea__doctor',
        'application__student'
    ).prefetch_related(
        'proposal__invitations',
        'application__invitations'
    )
    
    print(f"[DEBUG] Total projects found: {projects.count()}")
    
    # Filter based on user role
    filtered_projects = []
    for project in projects:
        print(f"\n[DEBUG] Processing project {project.id}: {project.title}")
        print(f"[DEBUG] Has proposal: {project.proposal is not None}")
        print(f"[DEBUG] Has application: {project.application is not None}")
        
        # Get department and supervisor from proposal or application
        department = None
        supervisor = None
        
        if project.proposal:
            department = project.proposal.department
            supervisor = project.proposal.supervisor
            print(f"[DEBUG] Proposal - Department: {department}, Supervisor: {supervisor}")
        elif project.application:
            print(f"[DEBUG] Application exists")
            print(f"[DEBUG] Application.idea: {project.application.idea}")
            if project.application.idea:
                # Get department from the idea itself, not from doctor
                department = project.application.idea.department
                supervisor = project.application.idea.doctor
                print(f"[DEBUG] Application - Department: {department}, Supervisor: {supervisor}")
        
        # Skip if no department found
        if not department:
            print(f"[DEBUG] Skipping project {project.id} - no department found")
            continue
        
        # Check permissions
        if request.user.role == 'hod':
            # HoD can see all projects in their department
            if department != request.user.department:
                print(f"[DEBUG] Skipping project {project.id} - department mismatch (project: {department}, user: {request.user.department})")
                continue
            print(f"[DEBUG] HoD can see project {project.id}")
        elif request.user.role == 'doctor':
            # Doctor can only see projects they supervise
            if supervisor != request.user:
                print(f"[DEBUG] Skipping project {project.id} - not supervisor (project supervisor: {supervisor}, user: {request.user})")
                continue
            print(f"[DEBUG] Doctor can see project {project.id}")
        else:
            print(f"[DEBUG] Skipping project {project.id} - invalid role")
            continue
        
        # Get team members
        team_members = []
        for member in project.members:
            team_members.append({
                'id': member.id,
                'name': member.username  # User model uses username, not name
            })
        
        # Check if project already has workflow
        has_workflow = ProjectWorkflow.objects.filter(
            project_board_id=project.id,
            is_active=True
        ).exists()
        
        # Check if user created the workflow (for review purposes)
        workflow_created_by_user = False
        if has_workflow:
            workflow = ProjectWorkflow.objects.filter(
                project_board_id=project.id,
                is_active=True
            ).select_related('template__created_by').first()
            if workflow and workflow.template.created_by == request.user:
                workflow_created_by_user = True
        
        filtered_projects.append({
            'id': project.id,
            'title': project.title,
            'department': department,
            'supervisor_name': supervisor.username if supervisor else None,  # Use username
            'team_members': team_members,
            'has_workflow': has_workflow,
            'can_review': workflow_created_by_user  # New field
        })
        print(f"[DEBUG] Added project {project.id} to filtered list")
    
    print(f"\n[DEBUG] Total filtered projects: {len(filtered_projects)}")
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
    ).select_related('template').values_list('project_board_id', flat=True)
    
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
