from django.urls import path, include
from . import views

urlpatterns = [
    path('home', views.home, name='home'),
    path('', views.landing, name='landing'),
    path("", include('django.contrib.auth.urls')),

    path("register", views.register, name='register'),
]
