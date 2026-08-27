from django.urls import path, include
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('home', views.home, name='home'),
    path('', views.landing, name='landing'),
    path('login/', auth_views.LoginView.as_view(redirect_authenticated_user=True), name='login'),
    path('', include('django.contrib.auth.urls')),
    path('register', views.register, name='register'),

    path('profile', views.profile, name='profile'),

    path('areas', views.areas, name='areas'),

    path('profile/delete', views.delete_account, name='delete_account'),

    path('expenses', views.expenses, name='expenses'),

    path('expenses/details/', views.expense_details, name='expense_details')
]
