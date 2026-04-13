from django.contrib.auth import get_user_model
from .models import (
    ProjectIdea, StudentIdeaProposal, ProjectApplication,
    IdeaApplication, TeamInvitation, ProposalInvitation,
)
from notifications.utils import notify, notify_many

User = get_user_model()


# ── Shared helper ─────────────────────────────────────────────────────────────

def student_has_registered_project(student):
    if IdeaApplication.objects.filter(student=student, status='registered').exists():
        return True
    if ProjectApplication.objects.filter(student=student, status='accepted').exists():
        return True
    if TeamInvitation.objects.filter(
        invitee=student, status='accepted', application__status='registered',
    ).exists():
        return True
    if ProposalInvitation.objects.filter(
        invitee=student, status='accepted', proposal__status='assigned',
    ).exists():
        return True
    return False


def _student_is_active(student):
    """True if student has any active application/proposal (not yet decided)."""
    if student_has_registered_project(student):
        return True, 'You already have a registered project.'
    if IdeaApplication.objects.filter(
        student=student, status__in=['awaiting_members', 'pending_doctor', 'pending_hod'],
    ).exists():
        return True, 'You already have an active application on a doctor idea.'
    if StudentIdeaProposal.objects.filter(
        student=student, status__in=['awaiting_members', 'pending_supervisor', 'pending_hod', 'assigned'],
    ).exists():
        return True, 'You already have an active idea proposal.'
    if TeamInvitation.objects.filter(
        invitee=student, status='accepted',
        application__status__in=['awaiting_members', 'pending_doctor', 'pending_hod'],
    ).exists():
        return True, 'You are already a member of an active application.'
    if ProposalInvitation.objects.filter(
        invitee=student, status='accepted',
        proposal__status__in=['awaiting_members', 'pending_supervisor', 'pending_hod'],
    ).exists():
        return True, 'You are already a member of an active proposal.'
    return False, None


# ── UC-01 ─────────────────────────────────────────────────────────────────────

def create_project_idea(*, doctor, title, description, department, required_skills, max_team_size):
    idea = ProjectIdea.objects.create(
        doctor=doctor, title=title, description=description,
        department=department, required_skills=required_skills,
        max_team_size=max_team_size, status='pending_review',
    )
    # Notify HoD of the department
    from django.contrib.auth import get_user_model
    U = get_user_model()
    hods = U.objects.filter(role='hod', department=department)
    notify_many(hods, 'idea_submitted',
                'New Project Idea Submitted',
                f'Dr. {doctor.get_full_name() or doctor.username} submitted a new idea: "{title}".')
    return {'ok': True, 'idea': idea}


# ── UC-02 ─────────────────────────────────────────────────────────────────────

def student_can_propose(student):
    active, msg = _student_is_active(student)
    if active:
        return False, msg
    return True, None


def create_student_proposal(*, student, supervisor, title, description, department,
                             team_size, team_size_reason, member_ids):
    allowed, error = student_can_propose(student)
    if not allowed:
        return {'ok': False, 'error': error}

    # Validate team_size_reason requirement
    needs_reason = team_size < 2 or team_size > 3
    if needs_reason and not team_size_reason.strip():
        return {'ok': False, 'error': 'Please provide a reason for the non-standard team size.'}

    expected_members = max(0, team_size - 1) if 2 <= team_size <= 3 else 0
    if len(member_ids) != expected_members:
        return {'ok': False, 'error': f'Please provide {expected_members} additional member ID(s).'}

    # Validate members (only for standard sizes 2-3)
    members = []
    for uid in member_ids:
        try:
            m = User.objects.get(username=str(uid), role='student')
        except User.DoesNotExist:
            return {'ok': False, 'error': f'Student with ID "{uid}" not found.'}
        if m == student:
            return {'ok': False, 'error': 'You cannot add yourself as a team member.'}
        active, err = _student_is_active(m)
        if active:
            return {'ok': False, 'error': f'Student "{uid}": {err}'}
        members.append(m)

    # Determine initial status
    initial_status = 'pending_supervisor' if not members else 'awaiting_members'

    proposal = StudentIdeaProposal.objects.create(
        student=student, supervisor=supervisor, title=title,
        description=description, department=department,
        team_size=team_size, team_size_reason=team_size_reason,
        status=initial_status,
    )

    for m in members:
        ProposalInvitation.objects.create(proposal=proposal, invitee=m, status='pending')
        notify(m, 'invitation_received',
               'Team Invitation Received 📨',
               f'{student.get_full_name() or student.username} invited you to join their project proposal "{title}".')

    # If going straight to supervisor, notify them
    if initial_status == 'pending_supervisor':
        notify(supervisor, 'proposal_submitted',
               'New Student Proposal',
               f'{student.get_full_name() or student.username} submitted a proposal "{title}" with you as supervisor.')

    return {'ok': True, 'proposal': proposal}


def respond_to_proposal_invitation(*, invitation, action):
    if invitation.status != 'pending':
        return {'ok': False, 'error': 'Invitation already responded to.'}

    if action == 'reject':
        invitation.status = 'rejected'
        invitation.save(update_fields=['status', 'updated_at'])
        # Cancel the whole proposal
        proposal = invitation.proposal
        proposal.status = 'rejected'
        proposal.rejection_reason = f'Team member {invitation.invitee.username} declined the invitation.'
        proposal.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        # Free other accepted members
        proposal.invitations.filter(status='accepted').update(status='rejected')
        return {'ok': True, 'invitation': invitation}

    invitation.status = 'accepted'
    invitation.save(update_fields=['status', 'updated_at'])

    # Check if ALL invitations accepted → advance to pending_supervisor
    proposal = invitation.proposal
    if proposal.status == 'awaiting_members':
        if proposal.invitations.filter(status='pending').count() == 0:
            proposal.status = 'pending_supervisor'
            proposal.save(update_fields=['status', 'updated_at'])
            notify(proposal.supervisor, 'proposal_submitted',
                   'New Student Proposal',
                   f'{proposal.student.get_full_name() or proposal.student.username} submitted a proposal "{proposal.title}" with you as supervisor.')
    notify(proposal.student, 'invitation_accepted',
           'Team Member Accepted',
           f'{invitation.invitee.get_full_name() or invitation.invitee.username} accepted your team invitation for "{proposal.title}".')

    return {'ok': True, 'invitation': invitation}


def supervisor_review_proposal(*, proposal, action, rejection_reason=''):
    if proposal.status != 'pending_supervisor':
        return {'ok': False, 'error': 'Proposal is not awaiting supervisor approval.'}
    if action == 'approve':
        proposal.status = 'pending_hod'
        proposal.save(update_fields=['status', 'updated_at'])
        notify(proposal.student, 'proposal_approved_sup',
               'Proposal Approved by Supervisor',
               f'Your proposal "{proposal.title}" was approved by the supervisor and is now pending HoD review.')
        # Notify HoD
        from django.contrib.auth import get_user_model
        U = get_user_model()
        hods = U.objects.filter(role='hod', department=proposal.department)
        notify_many(hods, 'proposal_submitted',
                    'Student Proposal Pending Review',
                    f'Proposal "{proposal.title}" by {proposal.student.get_full_name() or proposal.student.username} is awaiting your review.')
    else:
        proposal.status = 'rejected'
        proposal.rejection_reason = rejection_reason
        proposal.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        proposal.invitations.filter(status='accepted').update(status='rejected')
        notify(proposal.student, 'proposal_rejected',
               'Proposal Rejected',
               f'Your proposal "{proposal.title}" was rejected by the supervisor. Reason: {rejection_reason}')
    return {'ok': True, 'proposal': proposal}


def hod_review_proposal(*, proposal, action, rejection_reason=''):
    if proposal.status != 'pending_hod':
        return {'ok': False, 'error': 'Proposal is not awaiting HoD review.'}
    if action == 'reject':
        proposal.status = 'rejected'
        proposal.rejection_reason = rejection_reason
        proposal.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        proposal.invitations.filter(status='accepted').update(status='rejected')
        notify(proposal.student, 'proposal_rejected',
               'Proposal Rejected by HoD',
               f'Your proposal "{proposal.title}" was rejected by the HoD. Reason: {rejection_reason}')
        return {'ok': True, 'proposal': proposal}
    proposal.status = 'assigned'
    proposal.save(update_fields=['status', 'updated_at'])
    ProjectApplication.objects.create(proposal=proposal, student=proposal.student, status='accepted')
    notify(proposal.student, 'proposal_assigned',
           'Project Assigned 🎉',
           f'Your proposal "{proposal.title}" has been approved and assigned to you!')
    # Notify accepted members
    accepted_invitees = [inv.invitee for inv in proposal.invitations.filter(status='accepted')]
    notify_many(accepted_invitees, 'proposal_assigned',
                'Project Assigned 🎉',
                f'The proposal "{proposal.title}" you joined has been approved and registered!')
    return {'ok': True, 'proposal': proposal}


def hod_review_doctor_idea(*, idea, action, rejection_reason=''):
    if idea.status != 'pending_review':
        return {'ok': False, 'error': 'Idea is not pending review.'}
    if action == 'approve':
        idea.status = 'approved'
        idea.rejection_reason = ''
        idea.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        notify(idea.doctor, 'idea_approved',
               'Project Idea Approved ✅',
               f'Your idea "{idea.title}" has been approved by the HoD and is now visible to students.')
    else:
        idea.status = 'rejected'
        idea.rejection_reason = rejection_reason
        idea.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        notify(idea.doctor, 'idea_rejected',
               'Project Idea Rejected',
               f'Your idea "{idea.title}" was rejected by the HoD. Reason: {rejection_reason}')
    return {'ok': True, 'idea': idea}


# ── UC-03: Student applies on a doctor idea ───────────────────────────────────

def student_can_apply(student):
    active, msg = _student_is_active(student)
    if active:
        return False, msg
    return True, None


def apply_on_idea(*, student, idea, team_size, member_ids):
    if idea.status != 'approved':
        return {'ok': False, 'error': 'This idea is not available for applications.'}

    # Block if idea already has a registered application
    if IdeaApplication.objects.filter(idea=idea, status='registered').exists():
        return {'ok': False, 'error': 'This idea has already been taken by another team.'}

    if team_size not in (1, 2, 3):
        return {'ok': False, 'error': 'Team size must be 1, 2, or 3.'}

    if team_size > idea.max_team_size:
        return {'ok': False, 'error': f'This idea allows a maximum of {idea.max_team_size} students.'}

    if len(member_ids) != team_size - 1:
        return {'ok': False, 'error': f'Please provide {team_size - 1} additional member ID(s).'}

    allowed, error = student_can_apply(student)
    if not allowed:
        return {'ok': False, 'error': error}

    # Validate members
    members = []
    for uid in member_ids:
        try:
            m = User.objects.get(username=str(uid), role='student')
        except User.DoesNotExist:
            return {'ok': False, 'error': f'Student with ID "{uid}" not found.'}
        if m == student:
            return {'ok': False, 'error': 'You cannot add yourself as a team member.'}
        ok, err = student_can_apply(m)
        if not ok:
            return {'ok': False, 'error': f'Student "{uid}": {err}'}
        members.append(m)

    # Check active slot availability (only one active application per idea at a time)
    active_count = IdeaApplication.objects.filter(
        idea=idea, status__in=['awaiting_members', 'pending_doctor', 'pending_hod'],
    ).count()
    if active_count >= idea.max_team_size:
        return {'ok': False, 'error': 'This idea has reached its maximum team size.'}

    initial_status = 'pending_doctor' if team_size == 1 else 'awaiting_members'
    app = IdeaApplication.objects.create(
        student=student, idea=idea, team_size=team_size, status=initial_status,
    )
    for m in members:
        TeamInvitation.objects.create(application=app, invitee=m, status='pending')
        notify(m, 'invitation_received',
               'Team Invitation Received 📨',
               f'{student.get_full_name() or student.username} invited you to join their application for "{idea.title}".')

    return {'ok': True, 'application': app}

def respond_to_invitation(*, invitation, action):
    """Member accepts or rejects an invitation."""
    if invitation.status != 'pending':
        return {'ok': False, 'error': 'Invitation already responded to.'}

    if action == 'reject':
        invitation.status = 'rejected'
        invitation.save(update_fields=['status', 'updated_at'])
        # Cancel the whole application if any member rejects
        app = invitation.application
        app.status = 'rejected'
        app.rejection_reason = f'Team member {invitation.invitee.username} declined the invitation.'
        app.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        return {'ok': True, 'invitation': invitation}

    invitation.status = 'accepted'
    invitation.save(update_fields=['status', 'updated_at'])

    # Check if ALL invitations are now accepted → advance to pending_doctor
    app = invitation.application
    if app.status == 'awaiting_members':
        pending_count = app.invitations.filter(status='pending').count()
        if pending_count == 0:
            app.status = 'pending_doctor'
            app.save(update_fields=['status', 'updated_at'])
            # Notify doctor
            notify(app.idea.doctor, 'application_submitted',
                   'New Application Pending Review',
                   f'{app.student.get_full_name() or app.student.username} and their team applied for your idea "{app.idea.title}".')
    # Notify leader
    notify(app.student, 'invitation_accepted',
           'Team Member Accepted',
           f'{invitation.invitee.get_full_name() or invitation.invitee.username} accepted your team invitation for "{app.idea.title}".')

    return {'ok': True, 'invitation': invitation}


def doctor_review_application(*, application, action, rejection_reason=''):
    if application.status != 'pending_doctor':
        return {'ok': False, 'error': 'Application is not awaiting doctor approval.'}
    if action == 'approve':
        application.status = 'pending_hod'
        application.save(update_fields=['status', 'updated_at'])
        notify(application.student, 'application_approved_doc',
               'Application Approved by Doctor ✅',
               f'Your application for "{application.idea.title}" was approved by the doctor and is now pending HoD review.')
        members = [inv.invitee for inv in application.invitations.filter(status='accepted')]
        notify_many(members, 'application_approved_doc',
                    'Application Approved by Doctor ✅',
                    f'The application for "{application.idea.title}" was approved by the doctor and is pending HoD review.')
        # Notify HoD
        from django.contrib.auth import get_user_model
        U = get_user_model()
        hods = U.objects.filter(role='hod', department=application.idea.department)
        notify_many(hods, 'application_submitted',
                    'Application Pending Your Review',
                    f'An application for "{application.idea.title}" is awaiting your approval.')
    else:
        application.status = 'rejected'
        application.rejection_reason = rejection_reason
        application.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        application.invitations.filter(status='accepted').update(status='rejected')
        notify(application.student, 'application_rejected',
               'Application Rejected',
               f'Your application for "{application.idea.title}" was rejected. Reason: {rejection_reason}')
        members = [inv.invitee for inv in application.invitations.all()]
        notify_many(members, 'application_rejected',
                    'Application Rejected',
                    f'The application for "{application.idea.title}" was rejected. Reason: {rejection_reason}')
    return {'ok': True, 'application': application}


def hod_review_application(*, application, action, rejection_reason=''):
    if application.status != 'pending_hod':
        return {'ok': False, 'error': 'Application is not awaiting HoD approval.'}
    if action == 'approve':
        application.status = 'registered'
        application.save(update_fields=['status', 'updated_at'])
        notify(application.student, 'application_registered',
               'Project Registered 🎉',
               f'Your application for "{application.idea.title}" has been approved and registered!')
        members = [inv.invitee for inv in application.invitations.filter(status='accepted')]
        notify_many(members, 'application_registered',
                    'Project Registered 🎉',
                    f'The application for "{application.idea.title}" has been approved and registered!')
    else:
        application.status = 'rejected'
        application.rejection_reason = rejection_reason
        application.save(update_fields=['status', 'rejection_reason', 'updated_at'])
        application.invitations.filter(status='accepted').update(status='rejected')
        notify(application.student, 'application_rejected',
               'Application Rejected by HoD',
               f'Your application for "{application.idea.title}" was rejected. Reason: {rejection_reason}')
        members = [inv.invitee for inv in application.invitations.all()]
        notify_many(members, 'application_rejected',
                    'Application Rejected by HoD',
                    f'The application for "{application.idea.title}" was rejected. Reason: {rejection_reason}')
    return {'ok': True, 'application': application}
