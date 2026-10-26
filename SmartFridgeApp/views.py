from django.contrib.auth import login, logout, get_user_model, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils.dateparse import parse_date
from django.db import transaction
from datetime import date, datetime, timedelta
from types import SimpleNamespace
from django.utils.html import json_script
from .models import ProductDictionary, Recipe, RecipeProduct, Unit, Step, Area, ShoppingList, ShoppingListItem, \
    ItemStatus, UserProduct
from django.db.models import Q, RestrictedError
from .forms import CustomUserCreationForm
import json
import uuid
import openfoodfacts
from django.http import JsonResponse

USE_FAKE_DASHBOARD_DATA = False


def _with_freshness(user_product):
    exp = user_product.expiration_date

    if not exp:
        user_product.freshness_percent = None
        user_product.freshness_level = 'unknown'
        return user_product

    added = user_product.added_date.date() if user_product.added_date else date.today()
    total_days = (exp - added).days
    remaining_days = (exp - date.today()).days

    # 1. Determine Color/Level strictly by absolute days remaining
    if remaining_days < 0:
        user_product.freshness_level = 'expired'
    elif remaining_days <= 2:
        user_product.freshness_level = 'critical'
    elif remaining_days <= 5:
        user_product.freshness_level = 'warning'
    else:
        user_product.freshness_level = 'fresh'

    # 2. Determine Bar Size (Percentage)
    if remaining_days < 0:
        # Expired items are pushed to 100% so the CSS rotting gradient can fill the space
        user_product.freshness_percent = 100
    else:
        # Prevent 1-day items from showing 100% by assuming a minimum visual baseline of 14 days
        effective_total = max(total_days, 14)
        percent = max(0, min(100, round((remaining_days / effective_total) * 100)))

        # Force visual caps so the physical size always matches the urgency level
        if user_product.freshness_level == 'critical':
            percent = min(percent, 15)  # Never wider than 15% if critical (Red)
        elif user_product.freshness_level == 'warning':
            percent = min(percent, 40)  # Never wider than 40% if warning (Orange)

        # Ensure a tiny sliver is always visible (4%) so it doesn't look completely empty on the last day
        user_product.freshness_percent = max(percent, 4)

    return user_product

def _fake_dashboard_areas(user=None):
    display_name = user.username if (user and user.is_authenticated) else "You"
    user_avatar = user.avatar.url if (
            user and user.is_authenticated and hasattr(user, 'avatar') and user.avatar) else None

    def user_stub(username, avatar_url=None):
        return {"username": username, "avatar_url": avatar_url}

    today = date.today()

    def fake_product(name, days_left=None, added_days_ago=14):
        up = SimpleNamespace(
            product=SimpleNamespace(name=name),
            expiration_date=(today + timedelta(days=days_left)) if days_left is not None else None,
            added_date=datetime.combine(today - timedelta(days=added_days_ago), datetime.min.time()),
        )
        return _with_freshness(up)

    fridge = SimpleNamespace(
        id=1,
        name="Fridge",
        is_shared=False,
        is_owner=True,
        products=[
            fake_product("Whole Milk", days_left=2, added_days_ago=10),  # critical
            fake_product("Free-range Eggs", days_left=18, added_days_ago=4),  # fresh
            fake_product("Leftover Soup", days_left=-1, added_days_ago=6),  # expired
            fake_product("Greek Yogurt", days_left=9, added_days_ago=6),  # warning
            fake_product("Cheddar Block", days_left=25, added_days_ago=5),  # fresh
            fake_product("Mystery Jar", days_left=None),  # unknown
        ],
    )

    pantry = SimpleNamespace(
        id=2,
        name="Pantry",
        is_shared=True,
        is_owner=False,
        owner=SimpleNamespace(username="Gacek"),
        shared_users_script=json_script(
            [user_stub("Kasia"), user_stub("Marek"), user_stub(display_name, user_avatar)],
            "area-users-2"
        ),
        products=[
            fake_product("Canned Tomatoes", days_left=300, added_days_ago=20),
            fake_product("Homemade Jam", days_left=10, added_days_ago=40),
            fake_product("Pickled Cucumbers", days_left=150, added_days_ago=15),
            fake_product("Rice, 5kg bag", days_left=None),
            fake_product("Dried Beans", days_left=200, added_days_ago=30),
        ],
    )

    freezer = SimpleNamespace(
        id=3,
        name="Freezer",
        is_shared=False,
        is_owner=True,
        products=[
            fake_product("Vanilla Ice Cream", days_left=120, added_days_ago=5),
            fake_product("Frozen Peas", days_left=5, added_days_ago=25),
            fake_product("Sourdough Loaf", days_left=45, added_days_ago=3),
            fake_product("Mixed Veg Bag", days_left=9, added_days_ago=20),
            fake_product("Dumplings", days_left=60, added_days_ago=10),
        ],
    )

    attic = SimpleNamespace(
        id=4,
        name="Attic",
        is_shared=False,
        is_owner=True,
        products=[]
    )

    room_fridge_members = [user_stub("Kasia"), user_stub("Marek")]
    room_fridge = SimpleNamespace(
        id=5,
        name="Room fridge",
        is_shared=True,
        is_owner=True,
        owner=SimpleNamespace(username=display_name, avatar_url=user_avatar),
        shared_users_script=json_script(room_fridge_members, "area-users-5"),
        products=[
            fake_product("Sparkling Water", days_left=180, added_days_ago=10),
            fake_product("Leftover Pizza", days_left=1, added_days_ago=3),
            fake_product("Energy Drinks", days_left=200, added_days_ago=15),
            fake_product("String Cheese", days_left=8, added_days_ago=6),
            fake_product("Hummus", days_left=3, added_days_ago=9),
        ],
    )

    kitchen_cabinet_members = [
        user_stub("Kasia"), user_stub("Marek"), user_stub("Ola"),
        user_stub("Tomek"), user_stub("Zosia"), user_stub("Piotr"),
        user_stub("Ania"), user_stub("Wiktor"), user_stub("Bartek"),
    ]
    kitchen_cabinet = SimpleNamespace(
        id=6,
        name="Kitchen cabinet",
        is_shared=True,
        is_owner=True,
        owner=SimpleNamespace(username=display_name, avatar_url=user_avatar),
        shared_users_script=json_script(kitchen_cabinet_members, "area-users-6"),
        products=[
            fake_product(f"Canned Beans #{i}", days_left=200 - i * 15, added_days_ago=30)
            for i in range(1, 9)
        ],
    )

    return [fridge, pantry, freezer, attic, room_fridge, kitchen_cabinet]


@login_required(login_url='login')
def home(request):
    if USE_FAKE_DASHBOARD_DATA:
        areas = _fake_dashboard_areas(request.user)
    else:
        user_areas = Area.objects.filter(
            Q(owner=request.user) | Q(users=request.user)
        ).distinct().select_related('owner').prefetch_related(
            'users',
            'userproduct_set__product',
            'userproduct_set__unit',
        ).order_by('name')

        areas = list(user_areas)
        for area in areas:
            area.products = [_with_freshness(up) for up in area.userproduct_set.all()]
            area.is_owner = (getattr(area, 'owner', None) == request.user)

            if area.is_shared:
                members = [
                    {
                        "username": u.username,
                        "avatar_url": u.avatar.url if (hasattr(u, 'avatar') and u.avatar) else None
                    }
                    for u in area.users.all() if u != request.user
                ]
                area.shared_users_script = json_script(members, f"area-users-{area.id}")

    # ADD THIS QUERY SO THE DASHBOARD KNOWS ABOUT UNITS
    available_units = Unit.objects.filter(Q(is_global=True) | Q(user=request.user)).order_by('-is_global', 'symbol')

    return render(request, 'dashboard/dashboard.html', {
        'areas': areas,
        'available_units': available_units,  # PASS IT TO THE TEMPLATE
    })


def landing(request):
    return render(request, "landing.html")


def register(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Account has been successfully created')
            return redirect('home')
    else:
        form = CustomUserCreationForm()

    return render(request, 'registration/register.html', {'form': form})


@login_required(login_url='login')
def my_products_view(request):
    if USE_FAKE_DASHBOARD_DATA:
        areas = _fake_dashboard_areas(request.user)
    else:
        user_areas = Area.objects.filter(
            Q(owner=request.user) | Q(users=request.user)
        ).distinct().prefetch_related(
            'userproduct_set__product',
            'userproduct_set__unit',
        ).order_by('name')

        areas = list(user_areas)
        for area in areas:
            area.products = [_with_freshness(up) for up in area.userproduct_set.all()]

    # ADD THIS: Fetch available units
    available_units = Unit.objects.filter(Q(is_global=True) | Q(user=request.user)).order_by('-is_global', 'symbol')

    # ADD THIS: Pass available_units to the template
    return render(request, 'my-products/my_products.html', {
        'areas': areas,
        'available_units': available_units
    })

# -------------------- #
# ------ Areas: ------ #
# -------------------- #
@login_required(login_url='login')
def areas(request):
    display_name = request.user.username
    user_avatar = request.user.avatar.url if request.user.avatar else None

    def user_stub(user):
        return {
            "username": user.username,
            "avatar_url": user.avatar.url if user.avatar else None
        }

    db_areas = request.user.areas.prefetch_related('users', 'owner').order_by('-creation_date')

    formatted_areas = []

    for area in db_areas:
        is_owner = (area.owner == request.user)
        is_shared = area.is_shared

        area_data = {
            "id": area.id, "name": area.name,
            "created_at": area.creation_date.strftime("%d.%m.%Y"), "is_shared": is_shared,
            "share_code": area.key if area.key else "ERROR",
        }

        if is_shared:
            area_data["owner"] = user_stub(area.owner) if area.owner else None
            area_data["is_owner"] = is_owner

            members = [user_stub(u) for u in area.users.all() if u != request.user]
            area_data["shared_users"] = members
            area_data["shared_users_script"] = json_script(members, f"area-users-{area.id}")

        formatted_areas.append(area_data)

    context = {
        'user_areas': formatted_areas
    }

    return render(request, 'areas/areas.html', context)


@login_required(login_url='login')
def create_area(request):
    if request.method == 'POST':
        area_name = request.POST.get('area_name')

        if area_name:
            unique_key = uuid.uuid4().hex[:12].upper()

            with transaction.atomic():
                new_area = Area.objects.create(
                    name=area_name,
                    key=unique_key,
                    owner=request.user
                )

                new_area.users.add(request.user)

            messages.success(
                request,
                f'Area "{area_name}" created successfully!'
            )

    return redirect('areas')


@login_required(login_url='login')
def join_area(request):
    if request.method == 'POST':
        area_code = (request.POST.get('area_code') or request.POST.get('code') or '').strip()

        if area_code:
            try:
                area = Area.objects.get(key=area_code)

                if area.owner == request.user:
                    messages.info(request, f'You are the owner of "{area.name}", you cannot join it again.')
                elif area.users.filter(id=request.user.id).exists():
                    messages.info(request, f'You are already a member of "{area.name}".')
                else:
                    area.users.add(request.user)
                    messages.success(request, f'Successfully joined "{area.name}"!')
            except Area.DoesNotExist:
                messages.error(request, 'Invalid area code. Please check and try again.')

    next_url = request.META.get('HTTP_REFERER') or 'home'
    return redirect(next_url)


@login_required(login_url='login')
def edit_area(request):
    if request.method == 'POST':
        area_id = request.POST.get('area_id')
        new_name = request.POST.get('area_name') or request.POST.get('name')

        if area_id and new_name:
            area = get_object_or_404(Area, id=area_id)

            if area.owner == request.user:
                area.name = new_name
                area.save()
                messages.success(request, 'Area name updated successfully.')
            else:
                messages.error(request, 'Only the owner can rename this area.')

    next_url = request.META.get('HTTP_REFERER') or 'home'
    return redirect(next_url)


@login_required(login_url='login')
def delete_area(request):
    if request.method == 'POST':
        area_id = request.POST.get('area_id')

        if area_id:
            area = get_object_or_404(Area, id=area_id)

            if area.owner == request.user:
                area.delete()
                messages.success(request, 'Area deleted successfully.')
            else:
                area.users.remove(request.user)
                messages.success(request, f'You have left the area "{area.name}".')

    return redirect('areas')


# ----------------------------- #
# ------ Shopping lists: ------ #
# ----------------------------- #
def _fake_shopping_lists():
    """Generates mock shopping lists for dashboard demonstration mode."""
    list1 = SimpleNamespace(
        id=1,
        name="Weekly Groceries",
        items=[
            SimpleNamespace(id=101, product=SimpleNamespace(name="Whole Milk"), quantity=2,
                            unit=SimpleNamespace(symbol="l"), is_done=False),
            SimpleNamespace(id=102, product=SimpleNamespace(name="Free-range Eggs"), quantity=12,
                            unit=SimpleNamespace(symbol="pcs"), is_done=True),
            SimpleNamespace(id=103, product=SimpleNamespace(name="Sourdough Bread"), quantity=1,
                            unit=SimpleNamespace(symbol="loaf"), is_done=False),
            SimpleNamespace(id=104, product=SimpleNamespace(name="Cheddar Cheese"), quantity=300,
                            unit=SimpleNamespace(symbol="g"), is_done=False),
        ]
    )
    list2 = SimpleNamespace(
        id=2,
        name="Party Supplies",
        items=[
            SimpleNamespace(id=201, product=SimpleNamespace(name="Sparkling Water"), quantity=6,
                            unit=SimpleNamespace(symbol="bottle"), is_done=False),
            SimpleNamespace(id=202, product=SimpleNamespace(name="Tortilla Chips"), quantity=3,
                            unit=SimpleNamespace(symbol="pack"), is_done=False),
            SimpleNamespace(id=203, product=SimpleNamespace(name="Fresh Limes"), quantity=5,
                            unit=SimpleNamespace(symbol="pcs"), is_done=True),
        ]
    )
    list3 = SimpleNamespace(
        id=3,
        name="Home Essentials",
        items=[
            SimpleNamespace(id=301, product=SimpleNamespace(name="Paper Towels"), quantity=2,
                            unit=SimpleNamespace(symbol="pack"), is_done=False),
            SimpleNamespace(id=302, product=SimpleNamespace(name="Dish Soap"), quantity=1,
                            unit=SimpleNamespace(symbol="bottle"), is_done=False),
        ]
    )
    return [list1, list2, list3]


@login_required(login_url='login')
def shopping_list_view(request):
    if USE_FAKE_DASHBOARD_DATA:
        shopping_lists = _fake_shopping_lists()
    else:
        user_lists = ShoppingList.objects.filter(user=request.user).prefetch_related(
            'shoppinglistitem_set__product', 'shoppinglistitem_set__unit'
        ).order_by('id')

        # Auto-create default list if the user has no shopping list
        if not user_lists.exists():
            first_list = ShoppingList.objects.create(name="My First List", user=request.user)
            user_lists = ShoppingList.objects.filter(id=first_list.id)

        shopping_lists = []
        for sl in user_lists:
            sl.items = list(sl.shoppinglistitem_set.all())
            shopping_lists.append(sl)

    available_units = Unit.objects.filter(Q(is_global=True) | Q(user=request.user)).order_by('-is_global', 'symbol')

    return render(request, 'shopping_list/shopping_list.html', {
        'shopping_lists': shopping_lists,
        'available_units': available_units,
    })


@login_required(login_url='login')
def create_shopping_list(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        if name:
            new_list = ShoppingList.objects.create(name=name, user=request.user)
            messages.success(request, f'Shopping list "{name}" created!')

            return redirect(f"/shopping-list/?list_id={new_list.id}")

    return redirect('shopping_list')


@login_required(login_url='login')
def edit_shopping_list(request, list_id):
    if request.method == 'POST':
        shopping_list = get_object_or_404(ShoppingList, id=list_id, user=request.user)
        new_name = request.POST.get('name')

        if new_name:
            shopping_list.name = new_name
            shopping_list.save()
            messages.success(request, 'Shopping list updated successfully!')

        return redirect(f"/shopping-list/?list_id={shopping_list.id}")

    return redirect('shopping_list')


@login_required(login_url='login')
def add_shopping_item(request, list_id):
    if request.method == 'POST':
        shopping_list = get_object_or_404(
            ShoppingList,
            id=list_id,
            user=request.user
        )

        product_name = request.POST.get('product_name')
        quantity = request.POST.get('quantity')
        unit_symbol = request.POST.get('unit_symbol', 'psc')

        if product_name and quantity:
            with transaction.atomic():
                unit_obj, _ = Unit.objects.get_or_create(
                    symbol=unit_symbol,
                    defaults={
                        'user': request.user,
                        'is_global': False
                    }
                )

                product_obj, _ = ProductDictionary.objects.get_or_create(
                    name=product_name,
                    defaults={
                        'user': request.user,
                        'is_global': False,
                        'icon_number': 1,
                        'nutriscore': 'X',
                        'status': ItemStatus.UNOFFICIAL
                    }
                )

                ShoppingListItem.objects.create(
                    shoppingList=shopping_list,
                    product=product_obj,
                    quantity=float(quantity),
                    unit=unit_obj
                )

            messages.success(
                request,
                f'Added "{product_name}" to the list.'
            )

    return redirect(f"/shopping-list/?list_id={list_id}")


@login_required(login_url='login')
def toggle_shopping_item(request, item_id):
    if request.method == 'POST':
        item = get_object_or_404(ShoppingListItem, id=item_id, shoppingList__user=request.user)
        try:
            data = json.loads(request.body)
            item.is_done = data.get('is_done', item.is_done)
            item.save()
            return JsonResponse({'status': 'success', 'is_done': item.is_done})
        except json.JSONDecodeError:
            pass
    return JsonResponse({'status': 'error'}, status=400)


@login_required(login_url='login')
def edit_shopping_item(request):
    if request.method == 'POST':
        item_id = request.POST.get('item_id')
        product_name = request.POST.get('product_name')
        quantity = request.POST.get('quantity')
        unit_symbol = request.POST.get('unit_symbol', 'pcs').strip()

        if item_id and product_name and quantity:
            item = get_object_or_404(ShoppingListItem, id=item_id, shoppingList__user=request.user)

            # Find or create the unit symbol safely
            unit_obj, _ = Unit.objects.get_or_create(
                symbol=unit_symbol,
                defaults={'user': request.user, 'is_global': False}
            )

            product_obj, _ = ProductDictionary.objects.get_or_create(
                name=product_name,
                defaults={
                    'user': request.user,
                    'is_global': False,
                    'icon_number': 1,
                    'nutriscore': 'X',
                    'status': ItemStatus.UNOFFICIAL
                }
            )

            item.product = product_obj
            item.quantity = float(quantity)
            item.unit = unit_obj
            item.save()

            messages.success(request, 'Product updated successfully.')
            return redirect(f"/shopping-list/?list_id={item.shoppingList.id}")

    return redirect('shopping_list')


@login_required(login_url='login')
def delete_shopping_item(request):
    if request.method == 'POST':
        item_id = request.POST.get('item_id')
        if item_id:
            item = get_object_or_404(ShoppingListItem, id=item_id, shoppingList__user=request.user)
            list_id = item.shoppingList.id
            item.delete()

            messages.success(request, 'Product deleted.')
            return redirect(f"/shopping-list/?list_id={list_id}")

    return redirect('shopping_list')


@login_required(login_url='login')
def delete_shopping_list(request, list_id):
    if request.method == 'POST':
        shopping_list = get_object_or_404(ShoppingList, id=list_id, user=request.user)
        shopping_list.delete()
        messages.success(request, 'Shopping list deleted successfully!')

    return redirect('shopping_list')


# -------------------- #
# ------ Units: ------ #
# -------------------- #
@login_required(login_url='login')
def create_unit(request):
    if request.method == 'POST':
        symbol = request.POST.get('symbol', '').strip()

        if symbol:
            exists = Unit.objects.filter(symbol__iexact=symbol).exists()

            if not exists:
                is_global = (request.user.role == 'ADMIN')

                Unit.objects.create(
                    symbol=symbol,
                    is_global=is_global,
                    user=request.user if not is_global else None
                )
                messages.success(request, f'Unit "{symbol}" created successfully!')
            else:
                messages.warning(request, f'Unit "{symbol}" already exists in the database.')

    return redirect(request.META.get('HTTP_REFERER', 'shopping_list'))


# ----------------------- #
# ------ Expenses: ------ #
# ----------------------- #
@login_required(login_url='login')
def expenses(request):
    return render(request, 'expense-tracker/expense-tracker.html')


@login_required(login_url='login')
def expense_details(request):
    return render(request, 'expense-tracker/expense-details.html')


# ---------------------- #
# ------ Profile: ------ #
# ---------------------- #
@login_required(login_url='login')
# If a user is logged-in, Django automatically passes 'request.user' object to every template as 'user'
def profile(request):
    return render(request, 'user/profile.html')


@login_required(login_url='login')
def delete_account(request):
    if request.method == 'POST':
        user = request.user
        logout(request)
        user.delete()
        messages.success(request, 'Your account has been deleted.')
        return redirect('login')

    return redirect('profile')


# Edit user data:
User = get_user_model()


@login_required(login_url='login')
def edit_profile_view(request):
    if request.method == 'POST':
        user = request.user

        # Get data from the form:
        new_username = request.POST.get('username')
        new_email = request.POST.get('email')
        new_first_name = request.POST.get('first_name')
        new_avatar = request.FILES.get('avatar')

        if new_username and new_username != user.username:
            if User.objects.filter(username=new_username).exists():
                messages.error(request, 'This login is already taken.')
                return redirect('profile')
            user.username = new_username

        if new_email and new_email != user.email:
            if User.objects.filter(email=new_email).exists():
                messages.error(request, 'This email is already in use.')
                return redirect('profile')
            user.email = new_email

        if new_first_name:
            user.first_name = new_first_name

        # Pobierz flagę remove_avatar z formularza POST
        remove_avatar = request.POST.get('remove_avatar') == 'true'

        # Zmiana zdjęcia: Usuwanie lub Wgrywanie
        if remove_avatar:
            if user.avatar:
                user.avatar.delete(save=False)  # Automatycznie usuwa z dysku stary plik
            user.avatar = None
        elif new_avatar:
            user.avatar = new_avatar

        user.save()
        messages.success(request, 'Profile successfully updated.')

    return redirect('profile')


@login_required(login_url='login')
def change_password_view(request):
    if request.method == 'POST':
        old_password = request.POST.get('old_password')
        new_password = request.POST.get('new_password')
        repeat_password = request.POST.get('repeat_password')

        # Weryfikacja starego hasła
        if not request.user.check_password(old_password):
            messages.error(request, 'Incorrect old password.', extra_tags='password_error error')
            return redirect('profile')

        # Weryfikacja czy nowe hasła się zgadzają
        if new_password != repeat_password:
            messages.error(request, 'New passwords do not match.')
            return redirect('profile')

        # Zabezpieczenie przed zbyt krótkim hasłem (opcjonalne)
        if len(new_password) < 8:
            messages.error(request, 'Password must be at least 8 characters long.')
            return redirect('profile')

        # Zmiana hasła i utrzymanie sesji
        request.user.set_password(new_password)
        request.user.save()
        update_session_auth_hash(request, request.user)

        messages.success(request, 'Password changed successfully.')

    return redirect('profile')


# ---------------------- #
# ------ Recipes: ------ #
# ---------------------- #

@login_required(login_url='login')
def get_recipe_status(obj):
    # Check the status:
    status = "not suppose to happen :)"
    if obj.item_status == "OFFICIAL":
        status = "Official recipe"
    else:
        if obj.item_status == "PENDING":
            status = "Pending"
        else:
            status = "Private"
    return status


@login_required(login_url='login')
def recipes(request):
    # recipes = Recipe.objects.all()
    # Pobieramy przepisy użytkownika (najnowsze na górze)
    user_recipes = Recipe.objects.filter(user=request.user).order_by('-id')

    for user_recipe in user_recipes:
        # noinspection unresolved-references
        user_recipe.status_display = get_recipe_status(user_recipe)

    context = {
        'user_recipes': user_recipes
    }
    return render(request, 'recipes/recipes.html', context)


@login_required(login_url='login')
def recipe_detail(request, recipe_id):
    # Pobieramy obiekt z bazy
    recipe_obj = get_object_or_404(Recipe, id=recipe_id)

    # Pobieramy składniki
    ingredients_qs = RecipeProduct.objects.filter(recipe=recipe_obj).select_related('product', 'unit')

    # Pobieramy kroki
    steps_qs = Step.objects.filter(recipe=recipe_obj).order_by('order')

    # Check the status:
    status = get_recipe_status(recipe_obj)

    # Formatujemy dane dokładnie pod Twój istniejący szkielet HTML
    recipe = {
        "id": recipe_obj.id,
        "title": recipe_obj.name,
        "est_time": recipe_obj.prep_time.strftime("%H:%M") if recipe_obj.prep_time else "N/A",
        'status': status,
        "image_url": recipe_obj.thumbnail.url if recipe_obj.thumbnail else "https://i.imgur.com/2SjgpvQ.jpeg",
        "description_short": recipe_obj.description,
        "description_long": "",  # Jeśli masz osobne pole, możesz tu przekazać
        "ingredients": [
            {
                "name": item.product.name,
                "quantity": item.quantity,
                "unit": item.unit.symbol
            }
            for item in ingredients_qs
        ]
    }

    # Formatujemy kroki z bazy pod pętlę w HTML
    recipe_steps = [
        {
            "id": step.id,
            "title": step.name,
            "subtitle": None,
            "description": step.description,
            "instructions": [],  # Jeśli instrukcje są w opisie, zostawiamy pustą listę
            "image_url": step.picture.url if step.picture else "https://i.imgur.com/2SjgpvQ.jpeg"
        }
        for step in steps_qs
    ]

    context = {
        'recipe': recipe,
        'recipe_steps': recipe_steps
    }

    return render(request, 'recipes/recipe_detail.html', context)


@login_required(login_url='login')
def create_recipe(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description')
        prep_time = request.POST.get('prep_time')
        thumbnail = request.FILES.get('thumbnail')
        ingredients_json = request.POST.get('ingredients_data')

        status = ItemStatus.OFFICIAL if request.user.is_staff else ItemStatus.UNOFFICIAL

        # 1. Zapis Przepisu
        recipe = Recipe.objects.create(
            name=name,
            description=description,
            prep_time=prep_time,
            thumbnail=thumbnail,
            user=request.user,
            item_status=status,
            calories=1,  # Validator wymusza wartość >= 1
            is_global=False,  # Przepis dodany przez użytkownika jest prywatny
        )

        # 2. Przetworzenie składników i zapis do tabeli pośredniej (RecipeProduct)
        if ingredients_json:
            print(f"--- DANE SKŁADNIKÓW Z FORMULARZA: {ingredients_json} ---")  # LOG DO KONSOLI
            ingredients = json.loads(ingredients_json)

            for item in ingredients:
                ing_name = item.get('name')
                ing_qty = item.get('quantity')
                ing_unit_symbol = item.get('unit')

                # Znajdź lub stwórz jednostkę
                unit_obj, _ = Unit.objects.get_or_create(
                    symbol=ing_unit_symbol,
                    defaults={'user': request.user, 'is_global': False}
                )

                # Znajdź lub stwórz produkt w słowniku
                product_obj, _ = ProductDictionary.objects.get_or_create(
                    name=ing_name,
                    defaults={
                        'user': request.user,
                        'is_global': False,
                        'icon_number': 1,  # Wymagane przez model (null=False)
                        'nutriscore': 'X'  # Wymagane przez model (max_length=1)
                    }
                )

                # Utworzenie relacji z użyciem prawidłowej nazwy modelu (RecipeProduct)
                RecipeProduct.objects.create(
                    quantity=ing_qty,
                    unit=unit_obj,
                    recipe=recipe,
                    product=product_obj
                )
        else:
            print("--- UWAGA: Otrzymano pustą listę składników (None lub '') ---")

        messages.success(request, 'Recipe created successfully.')

    return redirect('recipes')


@login_required(login_url='login')
def edit_recipe(request, recipe_id):
    # Pobieramy przepis i upewniamy się, że należy do aktualnego usera
    recipe = get_object_or_404(Recipe, id=recipe_id, user=request.user)

    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description')
        prep_time = request.POST.get('prep_time')
        thumbnail = request.FILES.get('thumbnail')
        ingredients_json = request.POST.get('ingredients_data')

        # Pobieramy flagę usunięcia miniatury z formularza (domyślnie 'false')
        remove_thumb_flag = request.POST.get('remove_thumbnail', 'false')

        # 1. Aktualizacja podstawowych danych przepisu
        if name:
            recipe.name = name
        if description:
            recipe.description = description
        if prep_time:
            recipe.prep_time = prep_time
        if thumbnail:
            recipe.thumbnail = thumbnail
        elif remove_thumb_flag == 'true':
            # Jeśli nie wgrano nowego zdjęcia, a flaga wynosi 'true', usuń obrazek z bazy
            if recipe.thumbnail:
                recipe.thumbnail.delete(save=False)  # Usuwa plik z dysku (opcjonalnie)
            recipe.thumbnail = None  # Resetuje pole w bazie danych

        recipe.save()

        # 2. Aktualizacja składników (nadpisujemy stare powiązania)
        if ingredients_json:
            ingredients = json.loads(ingredients_json)

            # Czyścimy stare powiązania produktów z tym przepisem
            RecipeProduct.objects.filter(recipe=recipe).delete()

            for item in ingredients:
                ing_name = item.get('name')
                ing_qty = item.get('quantity')
                ing_unit_symbol = item.get('unit')

                # Znajdź lub stwórz jednostkę
                unit_obj, _ = Unit.objects.get_or_create(
                    symbol=ing_unit_symbol,
                    defaults={'user': request.user, 'is_global': False}
                )

                # Znajdź lub stwórz produkt w słowniku
                product_obj, _ = ProductDictionary.objects.get_or_create(
                    name=ing_name,
                    defaults={
                        'user': request.user,
                        'is_global': False,
                        'icon_number': 1,
                        'nutriscore': 'X'
                    }
                )

                # Tworzymy nowe relacje na podstawie zaktualizowanej listy
                RecipeProduct.objects.create(
                    quantity=ing_qty,
                    unit=unit_obj,
                    recipe=recipe,
                    product=product_obj
                )

        messages.success(request, 'Recipe updated successfully.')
        # Przekierowujemy z powrotem do detali zedytowanego przepisu
        return redirect('recipe_detail', recipe_id=recipe.id)

    return redirect('recipes')


@login_required(login_url='login')
def add_step(request, recipe_id):
    if request.method == 'POST':
        # 1. Pobieramy przepis, do którego chcemy dodać krok
        recipe = get_object_or_404(Recipe, id=recipe_id)

        # Zabezpieczenie (opcjonalne): sprawdź czy to faktycznie przepis tego użytkownika
        if recipe.user != request.user:
            messages.error(request, "You can only edit your own recipes.")
            return redirect('recipe_detail', recipe_id=recipe_id)

        # 2. Pobieramy dane z inputów modala
        name = request.POST.get('name')
        description = request.POST.get('description')
        picture = request.FILES.get('picture')

        # 3. Automatyczne obliczanie numeru kroku (order) - wrzucamy na sam koniec listy
        current_steps_count = Step.objects.filter(recipe=recipe).count()
        next_order = current_steps_count + 1

        # 4. Zapis do bazy danych
        Step.objects.create(
            name=name,
            description=description,
            picture=picture,
            order=next_order,
            recipe=recipe
        )

        messages.success(request, 'Step added successfully!')

    return redirect('recipe_detail', recipe_id=recipe_id)


@login_required(login_url='login')
def edit_step(request, step_id):
    step = get_object_or_404(Step, id=step_id)
    recipe_id = step.recipe.id

    if step.recipe.user != request.user:
        messages.error(request, 'You cannot edit this step.')
        return redirect('recipe_detail', recipe_id=recipe_id)

    if request.method == 'POST':
        name = request.POST.get('name')  # w formularzu HTML pole tytułu kroku ma name = "name"
        description = request.POST.get('description')
        picture = request.FILES.get('picture')

        # Pobieramy flagę usunięcia miniatury z formularza (domyślnie 'false')
        remove_pict_flag = request.POST.get('remove_picture', 'false')

        if name:
            step.name = name
        if description:
            step.description = description
        if picture:
            step.picture = picture  # Zależnie od nazwy pola w modelu Step (np. image lub picture)
        elif remove_pict_flag == 'true':
            # Jeśli nie wgrano nowego zdjęcia, a flaga wynosi 'true', usuń obrazek z bazy
            if step.picture:
                step.picture.delete(save=False)  # Usuwa plik z dysku (opcjonalnie)
            step.picture = None  # Resetuje pole w bazie danych

        step.save()
        messages.success(request, 'Step updated successfully.')
        return redirect('recipe_detail', recipe_id=recipe_id)

    return redirect('recipe_detail', recipe_id=recipe_id)


@login_required(login_url='login')
def delete_recipe(request, recipe_id):
    if request.method == 'POST':
        recipe = get_object_or_404(Recipe, id=recipe_id)
        if recipe.user == request.user:
            recipe.delete()
            messages.success(request, 'Recipe deleted successfully.')
        else:
            messages.error(request, 'You cannot delete this recipe.')
    return redirect('recipes')  # Przekierowanie do ogólnej listy


@login_required(login_url='login')
def delete_step(request, step_id):
    if request.method == 'POST':
        step = get_object_or_404(Step, id=step_id)
        recipe_id = step.recipe.id

        if step.recipe.user == request.user:
            step.delete()
            messages.success(request, 'Step deleted successfully.')
        else:
            messages.error(request, 'You cannot delete this step.')

        return redirect('recipe_detail', recipe_id=recipe_id)

    return redirect('recipes')


@login_required(login_url='login')
def send_recipe_for_verification(request, recipe_id):
    if request.method == 'POST':
        recipe = get_object_or_404(Recipe, id=recipe_id)

        # Upewniamy się, że tylko właściciel przepisu może go wysłać do weryfikacji
        if recipe.user == request.user:
            # Ustawienie statusu (upewnij się, czy w Twoim modelu pole nazywa się 'item_status' czy 'status')
            recipe.item_status = 'PENDING'
            recipe.save()
            messages.success(request, 'Recipe submitted for verification successfully.')
        else:
            messages.error(request, 'You cannot send this recipe for verification.')

        return redirect('recipe_detail', recipe_id=recipe.id)

    return redirect('recipes')


# -------------------------- #
# ------ Admin panel: ------ #
# -------------------------- #
@login_required(login_url='login')
def admin_panel_view(request):
    if request.user.role != 'ADMIN':
        messages.error(request, 'Access denied. Administrator privileges required.')
        return redirect('home')

    all_users = User.objects.exclude(role='ADMIN')

    pending_recipes = Recipe.objects.filter(item_status=ItemStatus.PENDING)
    public_recipes = Recipe.objects.filter(item_status=ItemStatus.OFFICIAL)
    global_units = Unit.objects.filter(is_global=True).order_by('symbol')

    context = {
        'db_users': all_users,
        'pending_recipes': pending_recipes,
        'public_recipes': public_recipes,
        'global_units': global_units,
    }

    return render(request, 'admin/admin_panel.html', context)


@login_required(login_url='login')
def admin_add_unit(request):
    if request.user.role == 'ADMIN' and request.method == 'POST':
        symbol = request.POST.get('symbol', '').strip()
        if symbol:
            if not Unit.objects.filter(symbol__iexact=symbol, is_global=True).exists():
                Unit.objects.create(symbol=symbol, is_global=True)
                messages.success(request, f'Global unit "{symbol}" added successfully.')
            else:
                messages.error(request, 'This global unit already exists.')
    return redirect('admin_panel')


@login_required(login_url='login')
def admin_edit_unit(request):
    if request.user.role == 'ADMIN' and request.method == 'POST':
        unit_id = request.POST.get('unit_id')
        new_symbol = request.POST.get('symbol', '').strip()

        if unit_id and new_symbol:
            unit = get_object_or_404(Unit, id=unit_id, is_global=True)

            if not Unit.objects.filter(symbol__iexact=new_symbol, is_global=True).exclude(id=unit_id).exists():
                unit.symbol = new_symbol
                unit.save()
                messages.success(request, 'Unit updated successfully.')
            else:
                messages.error(request, 'A global unit with this symbol already exists.')

    return redirect('admin_panel')


@login_required(login_url='login')
def admin_delete_unit(request):
    if request.user.role == 'ADMIN' and request.method == 'POST':
        unit_id = request.POST.get('item_id')

        if unit_id:
            unit = get_object_or_404(Unit, id=unit_id, is_global=True)
            try:
                # Sprawdzamy relacje 'RESTRICT'
                unit.delete()
                messages.success(request, 'Global unit deleted successfully.')
            except RestrictedError:
                # "Złapanie" błędu bazy danych
                messages.error(
                    request,
                    f'Cannot delete "{unit.symbol}". It is currently used by users in their recipes or shopping lists.'
                )
    return redirect('admin_panel')


# TODO: Te api to troche kasztan, bo można wysłać max 15 żądań na minutę z jednego IP, zrobiłem teraz tak że po wpisaniu czeka 800ms i dopiero wysyła sygnał do API

# --- 1. Wyszukiwanie po nazwie (Live Search) ---
@login_required(login_url='login')
def openfoodfacts_search(request):
    query = request.GET.get('q', '').strip()
    if len(query) < 3:
        return JsonResponse({'results': []})

    try:
        api = openfoodfacts.API(user_agent="SmartFridgePlus/1.0")
        response = api.product.text_search(query, page_size=40, sort_by="unique_scans_n")
        products_data = response.get('products', [])

        raw_results = []
        seen_names = set()

        for p in products_data:
            name = p.get('product_name_pl') or p.get('product_name') or p.get('product_name_en')
            brand = p.get('brands', '').split(',')[0].strip()

            if name:
                name = name.strip()
                name_lower = name.lower()
                if name_lower not in seen_names:
                    seen_names.add(name_lower)
                    raw_results.append({
                        'name': name.capitalize(),
                        'brand': brand.capitalize() if brand else '',
                        'barcode': p.get('code', ''),
                        'image_url': p.get('image_front_thumb_url', '')
                    })

        raw_results.sort(key=lambda x: (
            0 if x['image_url'] else 1,
            0 if x['brand'] else 1,
            len(x['name'])
        ))

        return JsonResponse({'results': raw_results[:8]})

    except Exception as e:
        print(f"OpenFoodFacts API Error (ignored): {e}")
        return JsonResponse({'results': []})


# --- 2. Pobieranie pełnych danych po kodzie kreskowym ---
@login_required(login_url='login')
def fetch_barcode_data(request, barcode):
    try:
        api = openfoodfacts.API(user_agent="SmartFridgePlus/1.0")
        product_data = api.product.get(barcode, fields=["code", "product_name", "product_name_pl", "nutriscore_grade",
                                                        "nutriments"])

        if not product_data:
            return JsonResponse({'error': 'Product not found.'}, status=404)

        name = product_data.get('product_name_pl') or product_data.get('product_name') or ""
        nutriments = product_data.get('nutriments', {})

        return JsonResponse({
            'barcode': barcode,
            'name': name.capitalize(),
            'kcal': int(nutriments.get('energy-kcal_100g', 0)),
            'proteins': round(float(nutriments.get('proteins_100g', 0.0)), 2),
            'fats': round(float(nutriments.get('fat_100g', 0.0)), 2),
            'nutriscore': (product_data.get('nutriscore_grade') or 'X').upper()
        })
    except Exception as e:
        return JsonResponse({'error': 'Connection error'}, status=503)


from django.db.models import Q
from django.utils.dateparse import parse_date


@login_required(login_url='login')
def api_add_product(request):
    if request.method == 'POST':
        barcode = request.POST.get('barcode', '').strip()
        name = request.POST.get('product_name', '').strip()
        area_id = request.POST.get('area_id')

        if not name or not area_id:
            messages.error(request, 'Product name and area are required.')
            return redirect(request.META.get('HTTP_REFERER') or 'home')

        try:
            quantity = int(float(request.POST.get('quantity', 1)))
            if quantity < 1: quantity = 1
        except (ValueError, TypeError):
            quantity = 1

        try:
            price = float(request.POST.get('price', 0.01))
            if price < 0.01: price = 0.01
        except (ValueError, TypeError):
            price = 0.01

        try:
            kcal = int(request.POST.get('kcal') or 0)
        except (ValueError, TypeError):
            kcal = 0

        try:
            proteins = float(request.POST.get('proteins') or 0.0)
        except (ValueError, TypeError):
            proteins = 0.0

        try:
            fats = float(request.POST.get('fats') or 0.0)
        except (ValueError, TypeError):
            fats = 0.0

        nutriscore = request.POST.get('nutriscore', 'X').upper()
        if nutriscore not in ['A', 'B', 'C', 'D', 'E']:
            nutriscore = 'X'

        expiration_date_raw = request.POST.get('expiration_date')
        expiration_date = parse_date(expiration_date_raw) if expiration_date_raw else None

        unit_symbol = request.POST.get('unit_symbol', 'pcs').strip()

        area = get_object_or_404(Area, id=area_id)
        if area.owner != request.user and not area.users.filter(id=request.user.id).exists():
            messages.error(request, 'Access denied for selected area.')
            return redirect(request.META.get('HTTP_REFERER') or 'home')

        unit = Unit.objects.filter(symbol__iexact=unit_symbol).first()
        if not unit:
            unit = Unit.objects.create(symbol=unit_symbol, is_global=False, user=request.user)

        product_dict = None
        if barcode:
            product_dict = ProductDictionary.objects.filter(barcode=barcode).first()
        if not product_dict:
            product_dict = ProductDictionary.objects.filter(name__iexact=name).first()
        if not product_dict:
            product_dict = ProductDictionary.objects.create(
                name=name,
                barcode=barcode if barcode else None,
                kcal=kcal,
                proteins=proteins,
                fats=fats,
                nutriscore=nutriscore,
                icon_number=1,
                is_global=False,
                user=request.user,
                status=ItemStatus.UNOFFICIAL
            )

        UserProduct.objects.create(
            quantity=quantity,
            price=price,
            expiration_date=expiration_date,
            area=area,
            product=product_dict,
            unit=unit
        )

        messages.success(request, f'Added "{name}" to area: {area.name}!')

    return redirect(request.META.get('HTTP_REFERER') or 'home')


@login_required(login_url='login')
def api_delete_product(request):
    if request.method == 'POST':
        product_id = request.POST.get('product_id')

        if product_id:
            try:
                # Force integer conversion to catch 'undefined' or empty strings
                product_id = int(product_id)
                user_product = get_object_or_404(UserProduct, id=product_id)
                area = user_product.area

                if area.owner == request.user or area.users.filter(id=request.user.id).exists():
                    user_product.delete()
                    messages.success(request, 'Product removed successfully.')
                else:
                    messages.error(request, 'Permission denied.')

            except (ValueError, TypeError):
                messages.error(request, 'Invalid product data received.')

    return redirect(request.META.get('HTTP_REFERER') or 'home')


@login_required(login_url='login')
def api_edit_product(request):
    if request.method == 'POST':
        raw_id = request.POST.get('user_product_id') or request.POST.get('product_id')

        try:
            # Force integer conversion to catch 'undefined'
            user_product_id = int(raw_id)
            user_product = get_object_or_404(UserProduct, id=user_product_id)
        except (ValueError, TypeError):
            messages.error(request, 'Invalid product data received.')
            return redirect(request.META.get('HTTP_REFERER') or 'home')

        area = user_product.area
        if area.owner != request.user and not area.users.filter(id=request.user.id).exists():
            messages.error(request, 'Permission denied.')
            return redirect(request.META.get('HTTP_REFERER') or 'home')

        name = request.POST.get('product_name', '').strip()
        area_id = request.POST.get('area_id')

        if name:
            user_product.product.name = name
            user_product.product.save()

        if area_id:
            try:
                new_area = get_object_or_404(Area, id=int(area_id))
                if new_area.owner == request.user or new_area.users.filter(id=request.user.id).exists():
                    user_product.area = new_area
            except (ValueError, TypeError):
                pass

        try:
            user_product.quantity = float(request.POST.get('quantity', user_product.quantity))
        except (ValueError, TypeError):
            pass

        try:
            user_product.price = float(request.POST.get('price', user_product.price))
        except (ValueError, TypeError):
            pass

        exp_raw = request.POST.get('expiration_date')
        if exp_raw:
            user_product.expiration_date = parse_date(exp_raw)

        unit_symbol = request.POST.get('unit_symbol', '').strip()
        if unit_symbol:
            unit = Unit.objects.filter(symbol__iexact=unit_symbol).first()
            if not unit:
                unit = Unit.objects.create(symbol=unit_symbol, is_global=False, user=request.user)
            user_product.unit = unit

        user_product.save()
        messages.success(request, 'Product updated successfully.')

    return redirect(request.META.get('HTTP_REFERER') or 'home')