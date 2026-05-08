from rest_framework import serializers
from .models import (
    ProjectIdea, StudentIdeaProposal, ProjectApplication, IdeaApplication,
    TeamInvitation, ProposalInvitation, ProjectWithdrawalRequest, ProposalSupervisor,
)


# ── UC-01: Doctor idea ────────────────────────────────────────────────────────

class ProjectIdeaSerializer(serializers.ModelSerializer):
    doctor_name  = serializers.SerializerMethodField(read_only=True)
    is_taken     = serializers.SerializerMethodField(read_only=True)
    registered_team = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = ProjectIdea
        fields = [
            'id', 'title', 'description', 'department',
            'required_skills', 'max_team_size', 'status',
            'rejection_reason', 'created_at', 'doctor_name',
            'is_taken', 'registered_team',
        ]
        read_only_fields = ['status', 'rejection_reason', 'created_at', 'doctor_name',
                            'is_taken', 'registered_team']

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() or obj.doctor.username

    def get_is_taken(self, obj):
        return any(app.status == 'registered' for app in obj.applications.all())

    def get_registered_team(self, obj):
        """Return leader + accepted members if idea is registered."""
        app = next((a for a in obj.applications.all() if a.status == 'registered'), None)
        if not app:
            return None
        leader = {
            'username': app.student.username,
            'name': app.student.get_full_name() or app.student.username,
        }
        members = [
            {
                'username': inv.invitee.username,
                'name': inv.invitee.get_full_name() or inv.invitee.username,
            }
            for inv in app.invitations.all()
            if inv.status == 'accepted'
        ]
        return {'leader': leader, 'members': members}

    def validate_max_team_size(self, value):
        if value not in (2, 3):
            raise serializers.ValidationError('Max team size must be 2 or 3.')
        return value


# ── UC-02: Student proposal ───────────────────────────────────────────────────

class StudentIdeaProposalSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField(read_only=True)
    student_name    = serializers.SerializerMethodField(read_only=True)
    invitations     = serializers.SerializerMethodField(read_only=True)
    supervisors     = serializers.SerializerMethodField(read_only=True)
    supervisor_ids  = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
    )

    class Meta:
        model  = StudentIdeaProposal
        fields = [
            'id', 'title', 'description', 'department',
            'supervisor', 'supervisor_name', 'student_name',
            'supervisor_count', 'supervisor_ids', 'supervisors',
            'team_size', 'team_size_reason',
            'status', 'rejection_reason', 'invitations',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'rejection_reason', 'created_at', 'updated_at',
                            'supervisor_name', 'student_name', 'invitations', 'supervisors']
        extra_kwargs = {
            'supervisor': {'required': False, 'allow_null': True},
        }

    def get_supervisor_name(self, obj):
        names = [item['name'] for item in self.get_supervisors(obj)]
        if names:
            return ', '.join(names)
        if obj.supervisor:
            return obj.supervisor.get_full_name() or obj.supervisor.username
        return None

    def get_supervisors(self, obj):
        assignments = list(obj.supervisor_assignments.all())
        if assignments:
            return [
                {
                    'id': assignment.id,
                    'supervisor': assignment.supervisor_id,
                    'name': assignment.supervisor.get_full_name() or assignment.supervisor.username,
                    'username': assignment.supervisor.username,
                    'status': assignment.status,
                    'rejection_reason': assignment.rejection_reason,
                }
                for assignment in assignments
            ]
        if obj.supervisor:
            status = 'accepted' if obj.status in ('pending_hod', 'assigned') else 'pending'
            return [{
                'id': None,
                'supervisor': obj.supervisor_id,
                'name': obj.supervisor.get_full_name() or obj.supervisor.username,
                'username': obj.supervisor.username,
                'status': status,
                'rejection_reason': '',
            }]
        return []

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_invitations(self, obj):
        return [
            {
                'id': inv.id,
                'invitee_id': inv.invitee.username,
                'invitee_name': inv.invitee.get_full_name() or inv.invitee.username,
                'status': inv.status,
            }
            for inv in obj.invitations.all()
        ]

    def validate_supervisor(self, value):
        if value and getattr(value, 'role', None) != 'doctor':
            raise serializers.ValidationError('Supervisor must be a doctor.')
        return value

    def validate_supervisor_count(self, value):
        if value not in (1, 2, 3):
            raise serializers.ValidationError('Supervisor count must be 1, 2, or 3.')
        return value


class ProposalInvitationSerializer(serializers.ModelSerializer):
    idea_title   = serializers.SerializerMethodField(read_only=True)
    leader_name  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = ProposalInvitation
        fields = ['id', 'proposal', 'idea_title', 'leader_name', 'status', 'created_at']
        read_only_fields = ['status', 'created_at', 'idea_title', 'leader_name']

    def get_idea_title(self, obj):
        return obj.proposal.title

    def get_leader_name(self, obj):
        return obj.proposal.student.get_full_name() or obj.proposal.student.username


class ProposalReviewSerializer(serializers.Serializer):
    action           = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['action'] == 'reject' and not data.get('rejection_reason', '').strip():
            raise serializers.ValidationError({'rejection_reason': 'Reason is required when rejecting.'})
        return data


class ProjectWithdrawalCreateSerializer(serializers.Serializer):
    reason = serializers.CharField(allow_blank=False, trim_whitespace=True)


class ProjectWithdrawalRequestSerializer(serializers.ModelSerializer):
    student_name     = serializers.SerializerMethodField(read_only=True)
    student_username = serializers.SerializerMethodField(read_only=True)
    project_type     = serializers.SerializerMethodField(read_only=True)
    project_title    = serializers.SerializerMethodField(read_only=True)
    department       = serializers.SerializerMethodField(read_only=True)
    reviewer_name    = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProjectWithdrawalRequest
        fields = [
            'id', 'student', 'student_name', 'student_username',
            'project_type', 'project_title', 'department',
            'reason', 'status', 'rejection_reason', 'reviewed_by', 'reviewer_name',
            'created_at', 'reviewed_at',
        ]
        read_only_fields = fields

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_student_username(self, obj):
        return obj.student.username

    def get_project_type(self, obj):
        return 'student_proposal' if obj.proposal_id else 'doctor_idea_application'

    def get_project_title(self, obj):
        if obj.proposal_id:
            return obj.proposal.title
        return obj.application.idea.title

    def get_department(self, obj):
        if obj.proposal_id:
            return obj.proposal.department
        return obj.application.idea.department

    def get_reviewer_name(self, obj):
        if not obj.reviewed_by:
            return None
        return obj.reviewed_by.get_full_name() or obj.reviewed_by.username


# ── UC-03: Idea application ───────────────────────────────────────────────────

class IdeaApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField(read_only=True)
    idea_title   = serializers.SerializerMethodField(read_only=True)
    doctor_name  = serializers.SerializerMethodField(read_only=True)
    invitations  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = IdeaApplication
        fields = [
            'id', 'idea', 'idea_title', 'doctor_name', 'team_size',
            'student_name', 'status', 'rejection_reason',
            'invitations', 'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'rejection_reason', 'created_at', 'updated_at',
                            'student_name', 'idea_title', 'doctor_name', 'invitations']

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_idea_title(self, obj):
        return obj.idea.title

    def get_doctor_name(self, obj):
        return obj.idea.doctor.get_full_name() or obj.idea.doctor.username

    def get_invitations(self, obj):
        return [
            {
                'id': inv.id,
                'invitee_id': inv.invitee.username,
                'invitee_name': inv.invitee.get_full_name() or inv.invitee.username,
                'status': inv.status,
            }
            for inv in obj.invitations.all()
        ]


class TeamInvitationSerializer(serializers.ModelSerializer):
    idea_title   = serializers.SerializerMethodField(read_only=True)
    leader_name  = serializers.SerializerMethodField(read_only=True)
    doctor_name  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = TeamInvitation
        fields = ['id', 'application', 'idea_title', 'leader_name', 'doctor_name', 'status', 'created_at']
        read_only_fields = ['status', 'created_at', 'idea_title', 'leader_name', 'doctor_name']

    def get_idea_title(self, obj):
        return obj.application.idea.title

    def get_leader_name(self, obj):
        return obj.application.student.get_full_name() or obj.application.student.username

    def get_doctor_name(self, obj):
        return obj.application.idea.doctor.get_full_name() or obj.application.idea.doctor.username
