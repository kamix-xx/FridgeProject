# Create your models here.

from django.db import models


class User(models.Model):

    class Role(models.TextChoices):
        USER = "USER", "USER"
        ADMIN = "ADMIN", "ADMIN"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "ACTIVE"
        DELETED = "DELETED", "DELETED"

    id = models.AutoField(primary_key=True)

    login = models.CharField(max_length=15, unique=True)
    name = models.CharField(max_length=20)
    email = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)

    creation_date = models.DateTimeField(auto_now_add=True)

    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True
    )

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER
    )

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.ACTIVE
    )

class Area(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=10)
    creation_date = models.DateTimeField(auto_now_add=True)
    key = models.CharField(max_length=255, unique=True)

    users = models.ManyToManyField(
        User,
        related_name='areas'
    )

class Unit(models.Model):
    id = models.AutoField(primary_key=True)
    symbol = models.ImageField(upload_to='units/')
    is_global = models.BooleanField(default=False)
    User_id = models.ForeignKey(User, on_delete=models.CASCADE, null=True)

class Item_Status(models.TextChoices):
    GLOBAL = "GLOBAL", "GLOBAL"
    PRIVATE = "PRIVATE", "PRIVATE"
    PENDING = "PENDING", "PENDING"

class Product_Dictionary(models.Model):
    id = models.AutoField(primary_key=True)
    barcode = models.CharField(max_length=50, null=True)
    icon_number = models.IntegerField(null=False)
    kcal = models.IntegerField(null=True)
    proteins = models.FloatField(null=True)
    fats = models.FloatField(null=True)
    nutriscore = models.CharField(max_length=1, null=False)
    is_global = models.BooleanField(default=True)
    User_id = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=45, null=False, unique=True)
    status = models.CharField(
        max_length=15,
        choices=Item_Status.choices,
        default=Item_Status.GLOBAL
    )