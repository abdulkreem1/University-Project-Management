from django.contrib.auth import get_user_model
from django.db import transaction
from django.db import IntegrityError
from django.utils import timezone
from .models import (
    ProjectIdea, StudentIdeaProposal, ProjectApplication,
    IdeaApplication, TeamInvitation, ProposalInvitation,
    ProjectWithdrawalRequest, ProposalSupervisor,
)
from notifications.utils import notify, notify_many

User = get_user_model()
MAX_PROPOSAL_SUPERVISORS = 3


# ── Shared helper ─────────────────────────────────────────────────────────────

def student_has_registered_project(student):
    if IdeaApplication.objects.filter(student=student, status='registered').exclude(
        withdrawal_requests__student=student,
        withdrawal_requests__status='approved',
    ).exists():
        return True
    if ProjectApplication.objects.filter(student=student, status='accepted').exclude(
        proposal__withdrawal_requests__student=student,
        proposal__withdrawal_requests__status='approved',
    ).exists():
        return True
    if TeamInvitation.objects.filter(
        invitee=student, status='accepted', application__status='registered',
    ).exclude(
        application__withdrawal_requests__student=student,
        application__withdrawal_requests__status='approved',
    ).exists():
        return True
    if ProposalInvitation.objects.filter(
        invitee=student, status='accepted', proposal__status='assigned',
    ).exclude(
        proposal__withdrawal_requests__student=student,
        proposal__withdrawal_requests__status='approved',
    ).exists():
        return True
    return False


def _student_is_active(student):
    """True if student has any active application/proposal (not yet decided)."""
    if student_has_registered_project(student):
        return True, 'You already have a registered project.'
    if IdeaApplication.objects.filter(
        student=student, status__in=['awaiting_members', 'pending_doctor', 'pending_hod'],
    ).exclude(
        withdrawal_requests__student=student,
        withdrawal_requests__status='approved',
    ).exists():
        return True, 'You already have an active application on a doctor idea.'
    if StudentIdeaProposal.objects.filter(
        student=student, status__in=['awaiting_members', 'pending_supervisor', 'pending_hod', 'assigned'],
    ).exclude(
        withdrawal_requests__student=student,
        withdrawal_requests__status='approved',
    ).exists():
        return True, 'You already have an active idea proposal.'
    if TeamInvitation.objects.filter(
        invitee=student, status='accepted',
        application__status__in=['awaiting_members', 'pending_doctor', 'pending_hod'],
    ).exclude(
        application__withdrawal_requests__student=student,
        application__withdrawal_requests__status='approved',
    ).exists():
        return True, 'You are already a member of an active application.'
    if ProposalInvitation.objects.filter(
        invitee=student, status='accepted',
        proposal__status__in=['awaiting_members', 'pending_supervisor', 'pending_hod'],
    ).exclude(
        proposal__withdrawal_requests__student=student,
        proposal__withdrawal_requests__status='approved',
    ).exists():
        return True, 'You are already a member of an active proposal.'
    return False, None


def _current_proposal_for_withdrawal(student):
    proposal = StudentIdeaProposal.objects.filter(
        student=student,
        status='assigned',
    ).exclude(
        withdrawal_requests__student=student,
        withdrawal_requests__status='approved',
    ).select_related('student', 'supervisor').first()
    if proposal:
        return proposal

    invitation = ProposalInvitation.objects.filter(
        invitee=student,
        status='accepted',
        proposal__status='assigned',
    ).exclude(
        proposal__withdrawal_requests__student=student,
        proposal__withdrawal_requests__status='approved',
    ).select_related('proposal__student', 'proposal__supervisor').first()
    return invitation.proposal if invitation else None


def _current_application_for_withdrawal(student):
    application = IdeaApplication.objects.filter(
        student=student,
        status='registered',
    ).exclude(
        withdrawal_requests__student=student,
        withdrawal_requests__status='approved',
    ).select_related('student', 'idea', 'idea__doctor').first()
    if application:
        return application

    invitation = TeamInvitation.objects.filter(
        invitee=student,
        status='accepted',
        application__status='registered',
    ).exclude(
        application__withdrawal_requests__student=student,
        application__withdrawal_requests__status='approved',
    ).select_related('application__student', 'application__idea', 'application__idea__doctor').first()
    return invitation.application if invitation else None


def create_project_withdrawal_request(*, student, reason):
    reason = (reason or '').strip()
    if not reason:
        return {'ok': False, 'error': 'Withdrawal reason is required.'}

    with transaction.atomic():
        student = User.objects.select_for_update().get(pk=student.pk)
        proposal = _current_proposal_for_withdrawal(student)
        application = None if proposal else _current_application_for_withdrawal(student)

        if not proposal and not application:
            return {'ok': False, 'error': 'You do not have an active registered project to withdraw from.'}

        existing = ProjectWithdrawalRequest.objects.filter(student=student, status='pending')
        if proposal:
            existing = existing.filter(proposal=proposal)
        else:
            existing = existing.filter(application=application)
        if existing.exists():
            return {'ok': False, 'error': 'You already have a pending withdrawal request for this project.'}

        request_obj = ProjectWithdrawalRequest.objects.create(
            student=student,
            proposal=proposal,
            application=application,
            reason=reason,
        )

    department = proposal.department if proposal else application.idea.department
    project_title = proposal.title if proposal else application.idea.title
    hods = User.objects.filter(role='hod', department=department)
    notify_many(
        hods,
        'withdrawal_requested',
        'Project Withdrawal Request',
        f'{student.get_full_name() or student.username} requested to withdraw from "{project_title}".',
    )
    return {'ok': True, 'withdrawal': request_obj}


def hod_review_withdrawal_request(*, withdrawal, hod, action, rejection_reason=''):
    if action not in ('approve', 'reject'):
        return {'ok': False, 'error': 'action must be approve or reject.'}

    rejection_reason = (rejection_reason or '').strip()
    if action == 'reject' and not rejection_reason:
        return {'ok': False, 'error': 'Rejection reason is required.'}

    with transaction.atomic():
        withdrawal = ProjectWithdrawalRequest.objects.select_for_update().select_related(
            'student', 'proposal', 'application__idea'
        ).get(pk=withdrawal.pk)

        department = withdrawal.proposal.department if withdrawal.proposal_id else withdrawal.application.idea.department
        if hod.department != department:
            return {'ok': False, 'error': 'Withdrawal request not found for your department.'}
        if withdrawal.status != 'pending':
            return {'ok': False, 'error': 'Withdrawal request has already been reviewed.'}

        withdrawal.status = 'approved' if action == 'approve' else 'rejected'
        withdrawal.rejection_reason = '' if action == 'approve' else rejection_reason
        withdrawal.reviewed_by = hod
        withdrawal.reviewed_at = timezone.now()
        withdrawal.save(update_fields=[
            'status', 'rejection_reason', 'reviewed_by', 'reviewed_at',
        ])

    project_title = withdrawal.proposal.title if withdrawal.proposal_id else withdrawal.application.idea.title
    if withdrawal.status == 'approved':
        notify(
            withdrawal.student,
            'withdrawal_approved',
            'Project Withdrawal Approved',
            f'Your request to withdraw from "{project_title}" was approved. You can now join or register another project.',
        )
    else:
        notify(
            withdrawal.student,
            'withdrawal_rejected',
            'Project Withdrawal Rejected',
            f'Your request to withdraw from "{project_title}" was rejected. Reason: {rejection_reason}',
        )
    return {'ok': True, 'withdrawal': withdrawal}


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


def _normalize_supervisor_ids(*, supervisor=None, supervisor_ids=None):
    ids = [str(item).strip() for item in (supervisor_ids or []) if str(item).strip()]
    if not ids and supervisor:
        ids = [str(supervisor.pk)]
    return ids


def _proposal_supervisor_assignments(proposal):
    return ProposalSupervisor.objects.filter(proposal=proposal).select_related('supervisor')


def proposal_supervisor_statuses(proposal):
    assignments = list(_proposal_supervisor_assignments(proposal))
    if assignments:
        return assignments
    if proposal.supervisor_id:
        return [ProposalSupervisor(proposal=proposal, supervisor=proposal.supervisor, status='pending')]
    return []


def proposal_has_supervisor(proposal, supervisor, statuses=('accepted',)):
    if ProposalSupervisor.objects.filter(
        proposal=proposal,
        supervisor=supervisor,
        status__in=statuses,
    ).exists():
        return True
    return bool(proposal.supervisor_id == supervisor.id and not ProposalSupervisor.objects.filter(proposal=proposal).exists())


def _notify_pending_supervisors(proposal):
    pending_assignments = list(_proposal_supervisor_assignments(proposal).filter(status='pending'))
    if pending_assignments:
        notify_many(
            [assignment.supervisor for assignment in pending_assignments],
            'proposal_submitted',
            'New Student Proposal',
            f'{proposal.student.get_full_name() or proposal.student.username} requested your supervision for "{proposal.title}".',
            actor=proposal.student,
            entity_type='student_proposal',
            entity_id=proposal.id,
            metadata={'proposal_id': proposal.id, 'supervisor_count': proposal.supervisor_count},
        )
    elif proposal.supervisor:
        notify(
            proposal.supervisor,
            'proposal_submitted',
            'New Student Proposal',
            f'{proposal.student.get_full_name() or proposal.student.username} requested your supervision for "{proposal.title}".',
            actor=proposal.student,
            entity_type='student_proposal',
            entity_id=proposal.id,
            metadata={'proposal_id': proposal.id, 'supervisor_count': proposal.supervisor_count},
        )


def _accepted_supervisors(proposal):
    assignments = list(_proposal_supervisor_assignments(proposal).filter(status='accepted'))
    if assignments:
        return [assignment.supervisor for assignment in assignments]
    if proposal.supervisor_id and proposal.status in ('pending_hod', 'assigned'):
        return [proposal.supervisor]
    return []


def _advance_after_supervisor_responses(proposal, final_rejection_reason=''):
    assignments = _proposal_supervisor_assignments(proposal)
    if assignments.filter(status='pending').exists():
        return 'waiting'

    accepted_assignments = list(assignments.filter(status='accepted').select_related('supervisor'))
    if accepted_assignments:
        proposal.status = 'pending_hod'
        proposal.supervisor = accepted_assignments[0].supervisor
        proposal.rejection_reason = ''
        proposal.save(update_fields=['status', 'supervisor', 'rejection_reason', 'updated_at'])

        accepted_supervisors = [assignment.supervisor for assignment in accepted_assignments]
        names = ', '.join([user.get_full_name() or user.username for user in accepted_supervisors])
        notify(
            proposal.student,
            'proposal_approved_sup',
            'Proposal Approved by Supervisor(s)',
            f'Your proposal "{proposal.title}" was accepted for supervision by {names} and is now pending HoD review.',
            entity_type='student_proposal',
            entity_id=proposal.id,
            metadata={'proposal_id': proposal.id, 'supervisors': [user.id for user in accepted_supervisors]},
        )
        hods = User.objects.filter(role='hod', department=proposal.department)
        notify_many(
            hods,
            'proposal_submitted',
            'Student Proposal Pending Review',
            f'Proposal "{proposal.title}" by {proposal.student.get_full_name() or proposal.student.username} is awaiting your review.',
            entity_type='student_proposal',
            entity_id=proposal.id,
            metadata={'proposal_id': proposal.id, 'supervisors': [user.id for user in accepted_supervisors]},
        )
        return 'advanced'

    proposal.status = 'rejected'
    proposal.rejection_reason = final_rejection_reason or 'All requested supervisors declined the supervision assignment.'
    proposal.save(update_fields=['status', 'rejection_reason', 'updated_at'])
    proposal.invitations.filter(status='accepted').update(status='rejected')
    notify(
        proposal.student,
        'proposal_rejected',
        'Proposal Supervision Declined',
        f'Your proposal "{proposal.title}" cannot proceed because all requested supervisors declined. Reason: {proposal.rejection_reason}',
        entity_type='student_proposal',
        entity_id=proposal.id,
        metadata={'proposal_id': proposal.id},
    )
    return 'rejected'


def create_student_proposal(*, student, supervisor, title, description, department,
                             team_size, team_size_reason, member_ids,
                             supervisor_count=1, supervisor_ids=None):
    if supervisor and supervisor.role != 'doctor':
        return {'ok': False, 'error': 'Supervisor must be a doctor.'}
    supervisor_ids = _normalize_supervisor_ids(supervisor=supervisor, supervisor_ids=supervisor_ids)
    if supervisor_count not in (1, 2, 3):
        return {'ok': False, 'error': 'Supervisor count must be 1, 2, or 3.'}
    if len(supervisor_ids) != supervisor_count:
        return {'ok': False, 'error': f'Please select {supervisor_count} supervisor(s).'}
    if len(supervisor_ids) != len(set(supervisor_ids)):
        return {'ok': False, 'error': 'Duplicate supervisors are not allowed.'}

    # Standard teams are 2-3 students; solo and 4-person teams require justification.
    if team_size not in (1, 2, 3, 4):
        return {'ok': False, 'error': 'Team size must be 1, 2, 3, or 4 students.'}
    if team_size in (1, 4) and not team_size_reason.strip():
        return {'ok': False, 'error': 'A justification is required for solo or 4-person proposals.'}

    expected_members = team_size - 1  # 1 or 2 additional members
    if len(member_ids) != expected_members:
        return {'ok': False, 'error': f'Please provide {expected_members} additional member ID(s).'}

    member_usernames = [str(uid) for uid in member_ids]
    if len(member_usernames) != len(set(member_usernames)):
        return {'ok': False, 'error': 'Duplicate team members are not allowed.'}

    with transaction.atomic():
        student = User.objects.select_for_update().get(pk=student.pk)
        allowed, error = student_can_propose(student)
        if not allowed:
            return {'ok': False, 'error': error}

        members_by_username = {
            user.username: user
            for user in User.objects.select_for_update().filter(username__in=member_usernames, role='student')
        }
        supervisors_by_id = {
            str(user.id): user
            for user in User.objects.select_for_update().filter(id__in=supervisor_ids, role='doctor')
        }

        supervisors = []
        for supervisor_id in supervisor_ids:
            selected = supervisors_by_id.get(str(supervisor_id))
            if not selected:
                return {'ok': False, 'error': f'Supervisor with ID "{supervisor_id}" not found.'}
            supervisors.append(selected)

        members = []
        for uid in member_usernames:
            m = members_by_username.get(uid)
            if not m:
                return {'ok': False, 'error': f'Student with ID "{uid}" not found.'}
            if m.pk == student.pk:
                return {'ok': False, 'error': 'You cannot add yourself as a team member.'}
            active, err = _student_is_active(m)
            if active:
                return {'ok': False, 'error': f'Student "{uid}": {err}'}
            members.append(m)

        initial_status = 'pending_supervisor' if team_size == 1 else 'awaiting_members'

        proposal = StudentIdeaProposal.objects.create(
            student=student, supervisor=supervisors[0], title=title,
            description=description, department=department,
            team_size=team_size, team_size_reason=team_size_reason,
            supervisor_count=supervisor_count,
            status=initial_status,
        )

        for selected in supervisors:
            ProposalSupervisor.objects.create(proposal=proposal, supervisor=selected, status='pending')

        for m in members:
            ProposalInvitation.objects.create(proposal=proposal, invitee=m, status='pending')
            notify(m, 'invitation_received',
                   'Team Invitation Received 📨',
                   f'{student.get_full_name() or student.username} invited you to join their project proposal "{title}".')

        if initial_status == 'pending_supervisor':
            _notify_pending_supervisors(proposal)

    return {'ok': True, 'proposal': proposal}


def cancel_proposal(*, proposal, student):
    """Leader cancels their proposal before it's approved."""
    if proposal.student != student:
        return {'ok': False, 'error': 'You are not the owner of this proposal.'}
    if proposal.status == 'assigned':
        return {'ok': False, 'error': 'Cannot cancel an already assigned proposal.'}
    if proposal.status == 'rejected':
        return {'ok': False, 'error': 'Proposal is already rejected.'}

    proposal.status = 'rejected'
    proposal.rejection_reason = 'Cancelled by the proposing student.'
    proposal.save(update_fields=['status', 'rejection_reason', 'updated_at'])

    accepted = list(proposal.invitations.filter(status='accepted').select_related('invitee'))
    proposal.invitations.update(status='rejected')

    for inv in accepted:
        notify(inv.invitee, 'proposal_rejected',
               'Proposal Cancelled',
               f'The proposal "{proposal.title}" you were part of has been cancelled by the proposer.')

    return {'ok': True}


def respond_to_proposal_invitation(*, invitation, action):
    with transaction.atomic():
        invitation = ProposalInvitation.objects.select_for_update().select_related(
            'proposal__student', 'proposal__supervisor', 'invitee'
        ).get(pk=invitation.pk)
        proposal = StudentIdeaProposal.objects.select_for_update().get(pk=invitation.proposal_id)
        User.objects.select_for_update().filter(pk=invitation.invitee_id).first()

        if invitation.status != 'pending':
            return {'ok': False, 'error': 'Invitation already responded to.'}

        if action == 'reject':
            invitation.status = 'rejected'
            invitation.save(update_fields=['status', 'updated_at'])
            notify(proposal.student, 'invitation_rejected',
                   'Team Member Declined',
                   f'{invitation.invitee.get_full_name() or invitation.invitee.username} declined your invitation for "{proposal.title}". You can replace them.')
            return {'ok': True, 'invitation': invitation}

        active, msg = _student_is_active(invitation.invitee)
        if active:
            invitation.status = 'rejected'
            invitation.save(update_fields=['status', 'updated_at'])
            notify(proposal.student, 'invitation_rejected',
                   'Team Member Unavailable',
                   f'{invitation.invitee.get_full_name() or invitation.invitee.username} is unavailable for "{proposal.title}". You can replace them.')
            return {'ok': False, 'error': f'You cannot accept this invitation: {msg}'}

        invitation.status = 'accepted'
        invitation.save(update_fields=['status', 'updated_at'])

        if proposal.status == 'awaiting_members':
            all_invitations = ProposalInvitation.objects.select_for_update().filter(proposal=proposal)
            pending_count = all_invitations.filter(status='pending').count()
            rejected_count = all_invitations.filter(status='rejected').count()
            if pending_count == 0 and rejected_count == 0:
                proposal.status = 'pending_supervisor'
                proposal.save(update_fields=['status', 'updated_at'])
                _notify_pending_supervisors(proposal)

        notify(proposal.student, 'invitation_accepted',
               'Team Member Accepted',
               f'{invitation.invitee.get_full_name() or invitation.invitee.username} accepted your team invitation for "{proposal.title}".')

        return {'ok': True, 'invitation': invitation}


def replace_proposal_member(*, proposal, old_member_id, new_member_id):
    """Leader replaces a rejected invitee with a new one."""
    with transaction.atomic():
        proposal = StudentIdeaProposal.objects.select_for_update().select_related('student').get(pk=proposal.pk)
        if proposal.status != 'awaiting_members':
            return {'ok': False, 'error': 'Proposal is not in awaiting members state.'}

        try:
            old_inv = proposal.invitations.select_for_update().get(invitee__username=old_member_id, status='rejected')
        except ProposalInvitation.DoesNotExist:
            return {'ok': False, 'error': 'No rejected invitation found for this member.'}

        try:
            new_member = User.objects.select_for_update().get(username=str(new_member_id), role='student')
        except User.DoesNotExist:
            return {'ok': False, 'error': f'Student with ID "{new_member_id}" not found.'}

        if new_member.pk == proposal.student_id:
            return {'ok': False, 'error': 'You cannot add yourself as a team member.'}

        active, err = _student_is_active(new_member)
        if active:
            return {'ok': False, 'error': f'Student "{new_member_id}": {err}'}

        # Remove old rejected invitation and create new one
        old_inv.delete()
        ProposalInvitation.objects.create(proposal=proposal, invitee=new_member, status='pending')
        notify(new_member, 'invitation_received',
               'Team Invitation Received 📨',
               f'{proposal.student.get_full_name() or proposal.student.username} invited you to join their project proposal "{proposal.title}".')

    return {'ok': True}


def replace_application_member(*, application, old_member_id, new_member_id):
    """Leader replaces a rejected invitee with a new one in an IdeaApplication."""
    with transaction.atomic():
        application = IdeaApplication.objects.select_for_update().select_related('student', 'idea').get(pk=application.pk)
        if application.status != 'awaiting_members':
            return {'ok': False, 'error': 'Application is not in awaiting members state.'}

        try:
            old_inv = application.invitations.select_for_update().get(invitee__username=old_member_id, status='rejected')
        except TeamInvitation.DoesNotExist:
            return {'ok': False, 'error': 'No rejected invitation found for this member.'}

        try:
            new_member = User.objects.select_for_update().get(username=str(new_member_id), role='student')
        except User.DoesNotExist:
            return {'ok': False, 'error': f'Student with ID "{new_member_id}" not found.'}

        if new_member.pk == application.student_id:
            return {'ok': False, 'error': 'You cannot add yourself as a team member.'}

        active, err = _student_is_active(new_member)
        if active:
            return {'ok': False, 'error': f'Student "{new_member_id}": {err}'}

        old_inv.delete()
        TeamInvitation.objects.create(application=application, invitee=new_member, status='pending')
        notify(new_member, 'invitation_received',
               'Team Invitation Received 📨',
               f'{application.student.get_full_name() or application.student.username} invited you to join their application for "{application.idea.title}".')

    return {'ok': True}


def supervisor_review_proposal(*, proposal, action, rejection_reason='', supervisor=None):
    with transaction.atomic():
        proposal = StudentIdeaProposal.objects.select_for_update().select_related(
            'student', 'supervisor'
        ).get(pk=proposal.pk)
        supervisor = supervisor or proposal.supervisor
        if not supervisor:
            return {'ok': False, 'error': 'Supervisor is required.'}
        if proposal.status != 'pending_supervisor':
            return {'ok': False, 'error': 'Proposal is not awaiting supervisor approval.'}

        assignment = ProposalSupervisor.objects.select_for_update().filter(
            proposal=proposal,
            supervisor=supervisor,
        ).first()
        if not assignment and proposal.supervisor_id == supervisor.id:
            assignment = ProposalSupervisor.objects.create(
                proposal=proposal,
                supervisor=supervisor,
                status='pending',
            )
        if not assignment:
            return {'ok': False, 'error': 'This proposal is not assigned to you for supervision review.'}
        if assignment.status != 'pending':
            return {'ok': False, 'error': 'You already reviewed this supervision assignment.'}

        if action == 'approve':
            assignment.status = 'accepted'
            assignment.rejection_reason = ''
            assignment.save(update_fields=['status', 'rejection_reason', 'updated_at'])
            result = _advance_after_supervisor_responses(proposal)
            if result == 'waiting':
                notify(
                    proposal.student,
                    'proposal_approved_sup',
                    'Supervisor Accepted Assignment',
                    f'{supervisor.get_full_name() or supervisor.username} accepted supervision for "{proposal.title}". Waiting for the remaining supervisor response(s).',
                    actor=supervisor,
                    entity_type='student_proposal',
                    entity_id=proposal.id,
                    metadata={'proposal_id': proposal.id, 'supervisor_id': supervisor.id},
                )
        else:
            assignment.status = 'rejected'
            assignment.rejection_reason = rejection_reason
            assignment.save(update_fields=['status', 'rejection_reason', 'updated_at'])
            result = _advance_after_supervisor_responses(proposal, final_rejection_reason=rejection_reason)
            if result == 'waiting':
                notify(
                    proposal.student,
                    'proposal_rejected',
                    'Supervisor Declined Assignment',
                    f'{supervisor.get_full_name() or supervisor.username} declined supervision for "{proposal.title}". The proposal remains pending with the other requested supervisor(s).',
                    actor=supervisor,
                    entity_type='student_proposal',
                    entity_id=proposal.id,
                    metadata={'proposal_id': proposal.id, 'supervisor_id': supervisor.id},
                )
        return {'ok': True, 'proposal': proposal}


def hod_review_proposal(*, proposal, action, rejection_reason=''):
    with transaction.atomic():
        proposal = StudentIdeaProposal.objects.select_for_update().select_related('student').get(pk=proposal.pk)
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
        accepted_supervisors = _accepted_supervisors(proposal)
        notify_many(
            accepted_supervisors,
            'proposal_assigned',
            'Supervision Assignment Confirmed',
            f'The proposal "{proposal.title}" has been approved by the HoD. You now have supervisory authority for this project.',
            entity_type='student_proposal',
            entity_id=proposal.id,
            metadata={'proposal_id': proposal.id},
        )
        # Notify accepted members
        accepted_invitees = [inv.invitee for inv in proposal.invitations.filter(status='accepted').select_related('invitee')]
        notify_many(accepted_invitees, 'proposal_assigned',
                    'Project Assigned 🎉',
                    f'The proposal "{proposal.title}" you joined has been approved and registered!')
        return {'ok': True, 'proposal': proposal}


def hod_review_doctor_idea(*, idea, action, rejection_reason=''):
    with transaction.atomic():
        idea = ProjectIdea.objects.select_for_update().select_related('doctor').get(pk=idea.pk)
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
    with transaction.atomic():
        # Lock the idea row to prevent race conditions
        idea = ProjectIdea.objects.select_for_update().get(pk=idea.pk)
        student = User.objects.select_for_update().get(pk=student.pk)

        if idea.status != 'approved':
            return {'ok': False, 'error': 'This idea is not available for applications.'}

        if IdeaApplication.objects.filter(idea=idea, status='registered').exists():
            return {'ok': False, 'error': 'This idea has already been taken by another team.'}

        if team_size not in (1, 2, 3):
            return {'ok': False, 'error': 'Team size must be 1, 2, or 3.'}

        if team_size > idea.max_team_size:
            return {'ok': False, 'error': f'This idea allows up to {idea.max_team_size} students.'}

        if len(member_ids) != team_size - 1:
            return {'ok': False, 'error': f'Please provide {team_size - 1} additional member ID(s).'}

        member_usernames = [str(uid) for uid in member_ids]
        if len(member_usernames) != len(set(member_usernames)):
            return {'ok': False, 'error': 'Duplicate team members are not allowed.'}

        allowed, error = student_can_apply(student)
        if not allowed:
            return {'ok': False, 'error': error}

        # Validate members
        members_by_username = {
            user.username: user
            for user in User.objects.select_for_update().filter(username__in=member_usernames, role='student')
        }
        members = []
        for uid in member_usernames:
            m = members_by_username.get(uid)
            if not m:
                return {'ok': False, 'error': f'Student with ID "{uid}" not found.'}
            if m.pk == student.pk:
                return {'ok': False, 'error': 'You cannot add yourself as a team member.'}
            ok, err = student_can_apply(m)
            if not ok:
                return {'ok': False, 'error': f'Student "{uid}": {err}'}
            members.append(m)

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
    with transaction.atomic():
        invitation = TeamInvitation.objects.select_for_update().select_related(
            'application__idea__doctor', 'application__student', 'invitee'
        ).get(pk=invitation.pk)
        app = IdeaApplication.objects.select_for_update().get(pk=invitation.application_id)
        User.objects.select_for_update().filter(pk=invitation.invitee_id).first()

        if invitation.status != 'pending':
            return {'ok': False, 'error': 'Invitation already responded to.'}

        if action == 'reject':
            invitation.status = 'rejected'
            invitation.save(update_fields=['status', 'updated_at'])
            notify(app.student, 'invitation_rejected',
                   'Team Member Declined',
                   f'{invitation.invitee.get_full_name() or invitation.invitee.username} declined your invitation for "{app.idea.title}". You can replace them.')
            return {'ok': True, 'invitation': invitation}

        active, msg = _student_is_active(invitation.invitee)
        if active:
            invitation.status = 'rejected'
            invitation.save(update_fields=['status', 'updated_at'])
            notify(app.student, 'invitation_rejected',
                   'Team Member Unavailable',
                   f'{invitation.invitee.get_full_name() or invitation.invitee.username} is unavailable for "{app.idea.title}". You can replace them.')
            return {'ok': False, 'error': f'You cannot accept this invitation: {msg}'}

        invitation.status = 'accepted'
        invitation.save(update_fields=['status', 'updated_at'])

        if app.status == 'awaiting_members':
            all_invitations = TeamInvitation.objects.select_for_update().filter(application=app)
            pending_count = all_invitations.filter(status='pending').count()
            rejected_count = all_invitations.filter(status='rejected').count()
            if pending_count == 0 and rejected_count == 0:
                app.status = 'pending_doctor'
                app.save(update_fields=['status', 'updated_at'])
                notify(app.idea.doctor, 'application_submitted',
                       'New Application Pending Review',
                       f'{app.student.get_full_name() or app.student.username} and their team applied for your idea "{app.idea.title}".')

        notify(app.student, 'invitation_accepted',
               'Team Member Accepted',
               f'{invitation.invitee.get_full_name() or invitation.invitee.username} accepted your team invitation for "{app.idea.title}".')

        return {'ok': True, 'invitation': invitation}


def doctor_review_application(*, application, action, rejection_reason=''):
    with transaction.atomic():
        application = IdeaApplication.objects.select_for_update().select_related('idea', 'student').get(pk=application.pk)

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
    with transaction.atomic():
        application = IdeaApplication.objects.select_for_update().select_related('idea', 'student').get(pk=application.pk)
        ProjectIdea.objects.select_for_update().filter(pk=application.idea_id).first()

        if application.status != 'pending_hod':
            return {'ok': False, 'error': 'Application is not awaiting HoD approval.'}
        if action == 'approve':
            already_registered = IdeaApplication.objects.select_for_update().filter(
                idea_id=application.idea_id,
                status='registered',
            ).exclude(pk=application.pk).exists()
            if already_registered:
                return {'ok': False, 'error': 'This idea has already been registered by another team.'}

            application.status = 'registered'
            try:
                application.save(update_fields=['status', 'updated_at'])
            except IntegrityError:
                return {'ok': False, 'error': 'This idea has already been registered by another team.'}

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
