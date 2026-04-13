from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from .permissions import IsDoctor, IsStudent, IsHod
from .selectors import (
    get_ideas_for_doctor, get_student_proposal, get_approved_ideas,
    get_pending_supervisor_proposals, get_pending_hod_proposals,
    get_pending_doctor_ideas_for_hod,
    get_student_idea_application, get_pending_doctor_applications, get_pending_hod_applications,
)
from .serializers import (
    ProjectIdeaSerializer, StudentIdeaProposalSerializer,
    ProposalReviewSerializer, IdeaApplicationSerializer,
    TeamInvitationSerializer, ProposalInvitationSerializer,
)
from .services import (
    create_project_idea, create_student_proposal,
    supervisor_review_proposal, hod_review_proposal,
    hod_review_doctor_idea,
    apply_on_idea, doctor_review_application, hod_review_application,
    respond_to_invitation, respond_to_proposal_invitation,
)
from .models import StudentIdeaProposal, ProjectIdea, IdeaApplication, TeamInvitation, ProposalInvitation


# ── UC-01: Doctor ideas ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def submit_idea(request):
    serializer = ProjectIdeaSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    result = create_project_idea(doctor=request.user, **serializer.validated_data)
    return Response(
        {'message': 'Idea submitted successfully.', 'idea': ProjectIdeaSerializer(result['idea']).data},
        status=201,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def my_ideas(request):
    ideas = get_ideas_for_doctor(request.user)
    return Response(ProjectIdeaSerializer(ideas, many=True).data)


# ── UC-02: Student proposals ──────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def propose_idea(request):
    serializer = StudentIdeaProposalSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    team_size        = int(request.data.get('team_size', 1))
    team_size_reason = request.data.get('team_size_reason', '').strip()
    member_ids       = request.data.get('member_ids', [])

    result = create_student_proposal(
        student=request.user,
        supervisor=serializer.validated_data['supervisor'],
        title=serializer.validated_data['title'],
        description=serializer.validated_data['description'],
        department=serializer.validated_data['department'],
        team_size=team_size,
        team_size_reason=team_size_reason,
        member_ids=member_ids,
    )
    if not result['ok']:
        return Response({'error': result['error']}, status=400)

    return Response(
        {'message': 'Proposal submitted successfully.',
         'proposal': StudentIdeaProposalSerializer(result['proposal']).data},
        status=201,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def my_proposal(request):
    proposal = get_student_proposal(request.user)
    if not proposal:
        return Response(None)
    return Response(StudentIdeaProposalSerializer(proposal).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def list_doctors_for_student(request):
    """Return all doctors for the supervisor dropdown."""
    doctors = User.objects.filter(role='doctor').values('id', 'username', 'first_name', 'last_name', 'department')
    result = [
        {
            'id': d['id'],
            'name': f"{d['first_name']} {d['last_name']}".strip() or d['username'],
            'department': d['department'],
        }
        for d in doctors
    ]
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def list_students_for_team(request):
    """Return all students (except self) for team member search."""
    q = request.query_params.get('q', '').strip()
    qs = User.objects.filter(role='student').exclude(pk=request.user.pk)
    if q:
        qs = qs.filter(username__icontains=q) | User.objects.filter(
            role='student', first_name__icontains=q
        ).exclude(pk=request.user.pk)
    qs = qs.values('username', 'first_name', 'last_name')[:20]
    result = [
        {
            'username': s['username'],
            'name': f"{s['first_name']} {s['last_name']}".strip() or s['username'],
            'display': f"{s['first_name']} {s['last_name']}".strip() + f" ({s['username']})" if (s['first_name'] or s['last_name']) else s['username'],
        }
        for s in qs
    ]
    return Response(result)


# ── Supervisor review ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def supervisor_pending_proposals(request):
    proposals = get_pending_supervisor_proposals(request.user)
    return Response(StudentIdeaProposalSerializer(proposals, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def supervisor_review(request, proposal_id):
    try:
        proposal = StudentIdeaProposal.objects.get(pk=proposal_id, supervisor=request.user)
    except StudentIdeaProposal.DoesNotExist:
        return Response({'error': 'Proposal not found.'}, status=404)

    serializer = ProposalReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    result = supervisor_review_proposal(
        proposal=proposal,
        action=serializer.validated_data['action'],
        rejection_reason=serializer.validated_data.get('rejection_reason', ''),
    )
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(StudentIdeaProposalSerializer(result['proposal']).data)


# ── HoD review ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHod])
def hod_pending_proposals(request):
    proposals = get_pending_hod_proposals(request.user.department)
    return Response(StudentIdeaProposalSerializer(proposals, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHod])
def hod_review(request, proposal_id):
    try:
        proposal = StudentIdeaProposal.objects.get(pk=proposal_id, department=request.user.department)
    except StudentIdeaProposal.DoesNotExist:
        return Response({'error': 'Proposal not found.'}, status=404)

    serializer = ProposalReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    result = hod_review_proposal(
        proposal=proposal,
        action=serializer.validated_data['action'],
        rejection_reason=serializer.validated_data.get('rejection_reason', ''),
    )
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(StudentIdeaProposalSerializer(result['proposal']).data)


# ── HoD review of doctor ideas ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHod])
def hod_pending_doctor_ideas(request):
    ideas = get_pending_doctor_ideas_for_hod(request.user.department)
    return Response(ProjectIdeaSerializer(ideas, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHod])
def hod_review_idea(request, idea_id):
    try:
        idea = ProjectIdea.objects.get(pk=idea_id, department=request.user.department)
    except ProjectIdea.DoesNotExist:
        return Response({'error': 'Idea not found.'}, status=404)

    serializer = ProposalReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    result = hod_review_doctor_idea(
        idea=idea,
        action=serializer.validated_data['action'],
        rejection_reason=serializer.validated_data.get('rejection_reason', ''),
    )
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(ProjectIdeaSerializer(result['idea']).data)


# ── UC-03: Browse & apply on doctor ideas ────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def browse_ideas(request):
    """Return all approved ideas for students to browse."""
    ideas = get_approved_ideas()
    return Response(ProjectIdeaSerializer(ideas, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def apply_idea(request, idea_id):
    try:
        idea = ProjectIdea.objects.get(pk=idea_id)
    except ProjectIdea.DoesNotExist:
        return Response({'error': 'Idea not found.'}, status=404)

    team_size  = int(request.data.get('team_size', 1))
    member_ids = request.data.get('member_ids', [])

    result = apply_on_idea(student=request.user, idea=idea, team_size=team_size, member_ids=member_ids)
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(IdeaApplicationSerializer(result['application']).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def my_idea_application(request):
    app = get_student_idea_application(request.user)
    if not app:
        return Response(None)
    return Response(IdeaApplicationSerializer(app).data)


# ── Doctor reviews applications on their ideas ────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def doctor_pending_applications(request):
    apps = get_pending_doctor_applications(request.user)
    return Response(IdeaApplicationSerializer(apps, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def doctor_review_app(request, app_id):
    try:
        app = IdeaApplication.objects.get(pk=app_id, idea__doctor=request.user)
    except IdeaApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=404)

    serializer = ProposalReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    result = doctor_review_application(
        application=app,
        action=serializer.validated_data['action'],
        rejection_reason=serializer.validated_data.get('rejection_reason', ''),
    )
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(IdeaApplicationSerializer(result['application']).data)


# ── HoD reviews applications ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHod])
def hod_pending_applications(request):
    apps = get_pending_hod_applications(request.user.department)
    return Response(IdeaApplicationSerializer(apps, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHod])
def hod_review_app(request, app_id):
    try:
        app = IdeaApplication.objects.get(pk=app_id, idea__department=request.user.department)
    except IdeaApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=404)

    serializer = ProposalReviewSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    result = hod_review_application(
        application=app,
        action=serializer.validated_data['action'],
        rejection_reason=serializer.validated_data.get('rejection_reason', ''),
    )
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(IdeaApplicationSerializer(result['application']).data)


# ── Team invitations ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def my_invitations(request):
    invitations = TeamInvitation.objects.filter(
        invitee=request.user, status='pending',
    ).select_related('application__idea__doctor', 'application__student')
    return Response(TeamInvitationSerializer(invitations, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def respond_invitation(request, inv_id):
    try:
        inv = TeamInvitation.objects.get(pk=inv_id, invitee=request.user)
    except TeamInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found.'}, status=404)

    action = request.data.get('action')
    if action not in ('accept', 'reject'):
        return Response({'error': 'action must be accept or reject.'}, status=400)

    result = respond_to_invitation(invitation=inv, action=action)
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(TeamInvitationSerializer(result['invitation']).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def my_proposal_invitations(request):
    """Pending invitations to join a student's own proposal team."""
    invitations = ProposalInvitation.objects.filter(
        invitee=request.user, status='pending',
    ).select_related('proposal__student')
    return Response(ProposalInvitationSerializer(invitations, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def respond_proposal_invitation(request, inv_id):
    try:
        inv = ProposalInvitation.objects.get(pk=inv_id, invitee=request.user)
    except ProposalInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found.'}, status=404)

    action = request.data.get('action')
    if action not in ('accept', 'reject'):
        return Response({'error': 'action must be accept or reject.'}, status=400)

    result = respond_to_proposal_invitation(invitation=inv, action=action)
    if not result['ok']:
        return Response({'error': result['error']}, status=400)
    return Response(ProposalInvitationSerializer(result['invitation']).data)
