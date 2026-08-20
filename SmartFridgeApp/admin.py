from django.contrib import admin

from SmartFridgeApp.models import User, ProductDictionary, UserProduct, ShoppingList

# Register your models here.

admin.site.site_header = "Panel Zarządzania SmartFridge" 
admin.site.site_title = "SmartFridge Admin"
admin.site.index_title = "Zarządzanie bazą danych"

admin.site.register(User)
admin.site.register(ProductDictionary)
admin.site.register(UserProduct)
admin.site.register(ShoppingList)