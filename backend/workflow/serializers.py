from rest_framework import serializers
from .models import (
    WorkflowTemplate, WorkflowStage, WorkflowStageField,
    ProjectWorkflow, WorkflowStageInstance, WorkflowFieldResponse
)


class WorkflowStageFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowStageField
        fields = ['id', 'label', 'field_type', 'required', 'options', 'order']


class WorkflowStageSerializer(serializers.ModelSerializer):
    fields = WorkflowStageFieldSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowStage
        fields = [
            'id', 'name', 'description', 'order',
            'trigger_type', 'trigger_days', 'trigger_date',
            'fields', 'notify_before_days', 'is_required',
            'created_at', 'updated_at'
        ]


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    stages = WorkflowStageSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'department',
            'created_by', 'created_by_name', 'status',
            'stages', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by']


class WorkflowFieldResponseSerializer(serializers.ModelSerializer):
    field_label = serializers.CharField(source='field.label', read_only=True)
    field_type = serializers.CharField(source='field.field_type', read_only=True)
    
    class Meta:
        model = WorkflowFieldResponse
        fields = ['id', 'field', 'field_label', 'field_type', 'value']


class WorkflowStageInstanceSerializer(serializers.ModelSerializer):
    stage_details = WorkflowStageSerializer(source='stage', read_only=True)
    field_responses = WorkflowFieldResponseSerializer(many=True, read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True)
    
    class Meta:
        model = WorkflowStageInstance
        fields = [
            'id', 'stage', 'stage_details',
            'due_date', 'status',
            'field_responses',
            'submitted_at', 'reviewed_at',
            'reviewed_by', 'reviewed_by_name',
            'feedback', 'created_at', 'updated_at'
        ]


class ProjectWorkflowSerializer(serializers.ModelSerializer):
    template_details = WorkflowTemplateSerializer(source='template', read_only=True)
    stage_instances = WorkflowStageInstanceSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProjectWorkflow
        fields = [
            'id', 'project_board_id', 'template', 'template_details',
            'stage_instances', 'started_at', 'completed_at', 'is_active'
        ]
