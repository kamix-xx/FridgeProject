from django.urls import path, include
from . import views

path('home/', views.home, name='home')