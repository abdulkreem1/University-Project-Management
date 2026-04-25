from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction

from .models import DynamicForm, FormField, FormResponse
from .serializers import DynamicFormSerializer, FormResponseSerializer
from .permissions import IsHod, IsStudent


# ── HoD: save/update form for their department ───────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHod])
def hod_get_form(request, context):
    """GET the HoD's form for a given context (propose / browse)."""
    form = DynamicForm.objects.filter(
        department=request.user.department, context=context
    ).prefetch_related('fields').first()
    if not form:
        return Response({'fields': [], 'title': '', 'id': None})
    return Response(DynamicFormSerializer(form).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHod])
def hod_save_form(request, context):
    """POST to create/replace the HoD's form fields for a given context."""
    fields_data = request.data.get('fields', [])
    title       = request.data.get('title', '')
    description = request.data.get('description', '')

    with transaction.atomic():
        form, _ = DynamicForm.objects.get_or_create(
            department=request.user.department,
            context=context,
            defaults={
                'hod': request.user, 
                'title': title,
                'description': description,
            },
        )
        form.title = title
        form.description = description
        form.hod   = request.user
        form.save()

        # Replace all fields
        form.fields.all().delete()
        for idx, f in enumerate(fields_data):
            FormField.objects.create(
                form       = form,
                label      = f.get('label', ''),
                field_type = f.get('field_type', 'text'),
                required   = f.get('required', False),
                options    = f.get('options', []),
                order      = idx,
            )

    return Response(DynamicFormSerializer(
        DynamicForm.objects.prefetch_related('fields').get(pk=form.pk)
    ).data)


# ── Student: fetch form for a department + context ───────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_get_form(request, department, context):
    """GET the dynamic form for a department+context (visible to students)."""
    form = DynamicForm.objects.filter(
        department=department, context=context
    ).prefetch_related('fields').first()
    if not form:
        return Response({'fields': [], 'title': '', 'id': None})
    return Response(DynamicFormSerializer(form).data)


# ── Student: submit form response ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudent])
def submit_form_response(request):
    """POST a student's filled form response."""
    serializer = FormResponseSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    response = serializer.save(student=request.user)
    return Response(FormResponseSerializer(response).data, status=201)


# ── Retrieve responses (HoD / admin) ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHod])
def hod_list_responses(request, context):
    """GET all form responses for the HoD's department + context."""
    responses = FormResponse.objects.filter(
        form__department=request.user.department,
        form__context=context,
    ).select_related('student').prefetch_related('field_responses__field')
    return Response(FormResponseSerializer(responses, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_response_by_proposal(request, proposal_id):
    """GET the form response linked to a specific proposal."""
    try:
        resp = FormResponse.objects.prefetch_related('field_responses__field').get(
            proposal_id=proposal_id
        )
    except FormResponse.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    return Response(FormResponseSerializer(resp).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_response_by_application(request, application_id):
    """GET the form response linked to a specific idea application."""
    try:
        resp = FormResponse.objects.prefetch_related('field_responses__field').get(
            application_id=application_id
        )
    except FormResponse.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
    return Response(FormResponseSerializer(resp).data)
