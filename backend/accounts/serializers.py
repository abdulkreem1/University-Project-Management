from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role']                 = user.role
        token['username']             = user.username
        token['must_change_password'] = user.must_change_password
        token['department']           = user.department
        return token

    def validate(self, attrs):
        username = attrs.get('username', '').strip()
        password = attrs.get('password', '').strip()

        # Check if user exists locally
        if not User.objects.filter(username=username).exists():
            # User not found — try external API verification for students
            from .services import lookup_student_in_reference, register_verified_student
            lookup = lookup_student_in_reference(username)
            if lookup['ok']:
                # Found in external API — create local account
                result = register_verified_student(
                    university_id=username,
                    ref_data=lookup['data'],
                )
                # If creation failed for a reason other than duplicate, raise
                if not result['ok']:
                    raise AuthenticationFailed(result['error'])
            else:
                # Not found anywhere — let normal flow raise the error
                pass

        # Proceed with standard JWT validation (checks password etc.)
        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']


class ImportExcelSerializer(serializers.Serializer):
    file = serializers.FileField()
    role = serializers.ChoiceField(choices=[('student', 'Student'), ('doctor', 'Doctor')])