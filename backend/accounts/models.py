from django.contrib.auth.models import AbstractUser
from django.db import models


DEPARTMENTS = [
    ('software_engineering',    'Software Engineering'),
    ('artificial_intelligence', 'Artificial Intelligence'),
    ('information_security',    'Information Security'),
    ('communications',          'Communications'),
    ('control_robotics',        'Control & Robotics'),
]


class User(AbstractUser):
    ROLE_CHOICES = [
        ('dean', 'Dean'),
        ('admin', 'Administrator'),
        ('hod', 'Head of Department'),
        ('doctor', 'Doctor'),
        ('student', 'Student'),
    ]

    role                 = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    must_change_password = models.BooleanField(default=False)
    department           = models.CharField(max_length=50, choices=DEPARTMENTS, null=True, blank=True)

    def __str__(self):
        return self.username

