from django.urls import path, include
from . import views
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Password reset:
    path('password_reset/',
         auth_views.PasswordResetView.as_view(template_name='regain-access/password_reset.html'),
         name='password_reset'),

    path('password_reset/done/',
         auth_views.PasswordResetDoneView.as_view(template_name='regain-access/password_reset_done.html'),
         name='password_reset_done'),

    path('reset/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(template_name='regain-access/password_reset_confirm.html'),
         name='password_reset_confirm'),

    path('reset/done/',
         auth_views.PasswordResetCompleteView.as_view(template_name='regain-access/password_reset_complete.html'),
         name='password_reset_complete'),
    path('home', views.home, name='home'),
    path('', views.landing, name='landing'),

    # Login:
    path('login/', auth_views.LoginView.as_view(redirect_authenticated_user=True), name='login'),
    path('', include('django.contrib.auth.urls')),
    path('register', views.register, name='register'),

    # Profile:
    path('profile', views.profile, name='profile'),
    path('profile/edit/', views.edit_profile_view, name='edit_profile'),
    path('profile/change-password/', views.change_password_view, name='change_password'),
    path('profile/delete', views.delete_account, name='delete_account'),

    path('areas', views.areas, name='areas'),

    path('expenses', views.expenses, name='expenses'),

    path('expenses/details/', views.expense_details, name='expense_details'),

    path('shopping-list/', views.shopping_list_view, name='shopping_list'),

    # Recipes:
    path('recipes/', views.recipes, name='recipes'),
    path('recipes/<int:recipe_id>/', views.recipe_detail, name='recipe_detail'),
    # Pamiętaj, że add_step przyjmuje recipe_id, a edit_step przyjmuje step_id
    path('recipes/<int:recipe_id>/add-step/', views.add_step, name='add_step'),
    path('steps/<int:step_id>/edit/', views.edit_step, name='edit_step'),
    path('recipes/create/', views.create_recipe, name='create_recipe'),
    path('recipes/<int:recipe_id>/', views.recipe_detail, name='recipe_detail'),
    path('recipes/<int:recipe_id>/delete/', views.delete_recipe, name='delete_recipe'),
    path('steps/<int:step_id>/delete/', views.delete_step, name='delete_step'),

    # Admin-panel:
    path('admin-panel/', views.admin_panel_view, name='admin-panel'),

    path('my-products/', views.my_products_view, name='my-products'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
