from rest_framework import serializers
from .models import DynamicForm, FormField, FormResponse, FieldResponse


class FormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FormField
        fields = ['id', 'label', 'field_type', 'required', 'options', 'order']


class DynamicFormSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True, read_only=True)

    class Meta:
        model  = DynamicForm
        fields = ['id', 'department', 'context', 'title', 'description', 'fields', 'updated_at']


class FieldResponseSerializer(serializers.ModelSerializer):
    field_label = serializers.CharField(source='field.label', read_only=True)
    field_type  = serializers.CharField(source='field.field_type', read_only=True)

    class Meta:
        model  = FieldResponse
        fields = ['field', 'field_label', 'field_type', 'value']


class FormResponseSerializer(serializers.ModelSerializer):
    field_responses = FieldResponseSerializer(many=True)

    class Meta:
        model  = FormResponse
        fields = ['id', 'form', 'student', 'proposal_id', 'application_id',
                  'submitted_at', 'field_responses']
        read_only_fields = ['id', 'student', 'submitted_at']

    def create(self, validated_data):
        field_responses_data = validated_data.pop('field_responses')
        response = FormResponse.objects.create(**validated_data)
        for fr in field_responses_data:
            FieldResponse.objects.create(response=response, **fr)
        return response
