from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from django.urls import path, include

from . import views

urlpatterns = [
    # Password reset & Auth...
    path('password_reset/', auth_views.PasswordResetView.as_view(template_name='regain-access/password_reset.html'),
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

    path('login/', auth_views.LoginView.as_view(redirect_authenticated_user=True), name='login'),
    path('', include('django.contrib.auth.urls')),
    path('register', views.register, name='register'),

    # Profile:
    path('profile', views.profile, name='profile'),
    path('profile/edit/', views.edit_profile_view, name='edit_profile'),
    path('profile/change-password/', views.change_password_view, name='change_password'),

    # Areas:
    path('areas', views.areas, name='areas'),
    path('areas/create/', views.create_area, name='create_area'),
    path('areas/join/', views.join_area, name='join_area'),
    path('areas/create/', views.create_area, name='api_add_area'),
    path('areas/join/', views.join_area, name='api_join_area'),
    path('areas/edit/', views.edit_area, name='edit_area'),
    path('areas/delete/', views.delete_area, name='delete_area'),
    path('profile/delete', views.delete_account, name='delete_account'),

    # Expenses & Shopping list...
    path('expenses', views.expenses, name='expenses'),
    path('api/expenses/', views.api_get_expenses, name='api_get_expenses'),
    path('expenses/details/', views.expense_details, name='expense_details'),
    path('api/expense-details/', views.api_get_expense_details, name='api_get_expense_details'),
    path('shopping-list/', views.shopping_list_view, name='shopping_list'),
    path('shopping-list/create/', views.create_shopping_list, name='create_shopping_list'),
    path('shopping-list/create/', views.create_shopping_list, name='api_create_shopping_list'),
    path('shopping-list/<int:list_id>/edit/', views.edit_shopping_list, name='edit_shopping_list'),
    path('shopping-list/<int:list_id>/delete/', views.delete_shopping_list, name='delete_shopping_list'),
    path('shopping-list/<int:list_id>/add-item/', views.add_shopping_item, name='add_shopping_item'),
    path('shopping-list/item/toggle/<int:item_id>/', views.toggle_shopping_item, name='toggle_shopping_item'),
    path('shopping-list/item/edit/', views.edit_shopping_item, name='edit_shopping_item'),
    path('shopping-list/item/delete/', views.delete_shopping_item, name='delete_shopping_item'),
    path('units/create/', views.create_unit, name='create_unit'),

    # Products API:
    path('api/off-search/', views.openfoodfacts_search, name='openfoodfacts_search'),
    path('api/off-barcode/<str:barcode>/', views.fetch_barcode_data, name='fetch_barcode_data'),
    path('api/add-product/', views.api_add_product, name='api_add_product'),
    path('api/edit-product/', views.api_edit_product, name='api_edit_product'),
    path('api/delete-product/', views.api_delete_product, name='api_delete_product'),

    # Recipes & Admin...
    path('recipes/', views.recipes, name='recipes'),
    path('recipes/<int:recipe_id>/', views.recipe_detail, name='recipe_detail'),
    path('recipes/<int:recipe_id>/add-step/', views.add_step, name='add_step'),
    path('steps/<int:step_id>/edit/', views.edit_step, name='edit_step'),
    path('recipes/create/', views.create_recipe, name='create_recipe'),
    path('recipes/<int:recipe_id>/edit_recipe/', views.edit_recipe, name='edit_recipe'),
    path('recipes/<int:recipe_id>/delete/', views.delete_recipe, name='delete_recipe'),
    path('steps/<int:step_id>/delete/', views.delete_step, name='delete_step'),
    path('recipes/<int:recipe_id>/send-to-verify/', views.send_recipe_for_verification,
         name='send_recipe_for_verification'),

    path('admin-panel/', views.admin_panel_view, name='admin_panel'),
    path('admin-panel/unit/add/', views.admin_add_unit, name='admin_add_unit'),
    path('admin-panel/unit/edit/', views.admin_edit_unit, name='admin_edit_unit'),
    path('admin-panel/unit/delete/', views.admin_delete_unit, name='admin_delete_unit'),
    path('my-products/', views.my_products_view, name='my-products'),

    path('api/local-search/', views.local_product_search, name='local_product_search'),

    path('areas/<int:area_id>/stop-sharing/', views.stop_sharing_area, name='stop_sharing_area'),
    path('areas/<int:area_id>/remove-member/', views.remove_area_member, name='remove_area_member'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
