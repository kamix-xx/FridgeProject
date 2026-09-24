from django.contrib.auth import login, logout, get_user_model, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import CustomUserCreationForm
from django.contrib import messages
from datetime import date, datetime, timedelta
from types import SimpleNamespace
from django.utils.html import json_script

USE_FAKE_DASHBOARD_DATA = True

def _with_freshness(user_product):
    exp = user_product.expiration_date

    if not exp:
        user_product.freshness_percent = None
        user_product.freshness_level = 'unknown'
        return user_product

    added = user_product.added_date.date() if user_product.added_date else date.today()
    total_days = (exp - added).days
    remaining_days = (exp - date.today()).days

    if remaining_days <= 0:
        percent = 0
    elif total_days <= 0:
        percent = 100
    else:
        percent = max(0, min(100, round(remaining_days / total_days * 100)))

    user_product.freshness_percent = percent

    if remaining_days <= 0:
        user_product.freshness_level = 'expired'
    elif percent <= 30:
        user_product.freshness_level = 'critical'
    elif percent <= 65:
        user_product.freshness_level = 'warning'
    else:
        user_product.freshness_level = 'fresh'

    return user_product


def _fake_dashboard_areas(user=None):
    display_name = user.username if (user and user.is_authenticated) else "You"
    user_avatar = user.avatar.url if (user and user.is_authenticated and hasattr(user, 'avatar') and user.avatar) else None

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
            fake_product("Whole Milk", days_left=2, added_days_ago=10),       # critical
            fake_product("Free-range Eggs", days_left=18, added_days_ago=4),  # fresh
            fake_product("Leftover Soup", days_left=-1, added_days_ago=6),    # expired
            fake_product("Greek Yogurt", days_left=9, added_days_ago=6),      # warning
            fake_product("Cheddar Block", days_left=25, added_days_ago=5),    # fresh
            fake_product("Mystery Jar", days_left=None),                      # unknown
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


def home(request):
    if not request.user.is_authenticated:
        return redirect('landing')

    if USE_FAKE_DASHBOARD_DATA:
        areas = _fake_dashboard_areas(request.user)
    else:
        areas = list(
            request.user.areas
            .prefetch_related(
                'users',
                'userproduct_set__product',
                'userproduct_set__unit',
            )
            .order_by('name')
        )

        for area in areas:
            area.products = [_with_freshness(up) for up in area.userproduct_set.all()]
            area.is_owner = (getattr(area, 'owner', None) == request.user)
            if area.is_shared and area.is_owner:
                members = [
                    {
                        "username": u.username,
                        "avatar_url": u.avatar.url if (hasattr(u, 'avatar') and u.avatar) else None
                    }
                    for u in area.users.all() if u != request.user
                ]
                area.shared_users_script = json_script(members, f"area-users-{area.id}")

    return render(request, 'dashboard/dashboard.html', {
        'areas': areas,
    })

def landing(request):
    return render(request, "landing.html")


def register(request):
    # Redirect the logged-in user:
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


def areas(request):
    display_name = request.user.username if request.user.is_authenticated else "You"

    # Fetch the real avatar URL if the user has uploaded one
    user_avatar = (
        request.user.avatar.url
        if request.user.is_authenticated and request.user.avatar
        else None
    )

    def user_stub(username, avatar_url=None):
        return {"username": username, "avatar_url": avatar_url}

    def shared_block(area_id, owner, members):
        return {
            "owner": owner,
            "is_owner": owner["username"] == display_name,
            "shared_users": members,
            "shared_users_script": json_script(members, f"area-users-{area_id}"),
        }

    fake_areas = [
        {"id": 1, "name": "Fridge", "created_at": "01.01.2026", "is_shared": False},
        {
            # shared, but owned by someone else
            "id": 2, "name": "Pantry", "created_at": "01.01.2026", "is_shared": True,
            **shared_block(2, user_stub("Gacek"), [
                user_stub("Kasia"), user_stub("Marek"), user_stub(display_name, user_avatar),
            ]),
        },
        {"id": 3, "name": "Freezer", "created_at": "12.02.2026", "is_shared": False},
        {"id": 4, "name": "Attic", "created_at": "08.03.2026", "is_shared": False},
        {
            # shared, you're the owner
            "id": 5, "name": "Room fridge", "created_at": "20.04.2026", "is_shared": True,
            **shared_block(5, user_stub(display_name, user_avatar), [
                user_stub("Kasia"), user_stub("Marek"),
            ]),
        },
        {
            # shared, you're the owner
            "id": 6, "name": "Kitchen cabinet", "created_at": "23.04.2026", "is_shared": True,
            **shared_block(6, user_stub(display_name, user_avatar), [
                user_stub("Kasia"), user_stub("Marek"), user_stub("Ola"),
                user_stub("Tomek"), user_stub("Zosia"), user_stub("Piotr"),
                user_stub("Ania"), user_stub("Wiktor"), user_stub("Bartek"),
            ]),
        },
    ]

    context = {
        'user_areas': fake_areas
    }

    return render(request, 'areas/areas.html', context)

def shopping_list_view(request):
    mock_shopping_list = {
        "id": 1,
        "name": "Shopping list #1"
    }

    mock_items = [
        {
            "id": 1,
            "name": "Milk",
            "quantity": 1.0,
            "unit": "L",
            "is_done": True
        },
        {
            "id": 2,
            "name": "Cottage cheese",
            "quantity": 2.0,
            "unit": "PCK",
            "is_done": False
        },
        {
            "id": 3,
            "name": "Pasta",
            "quantity": 400.0,
            "unit": "g",
            "is_done": False
        },
    ]

    context = {
        'shopping_list': mock_shopping_list,
        'shopping_items': mock_items
    }

    return render(request, 'shopping_list/shopping_list.html', context)


def expenses(request):
    return render(request, 'expense-tracker/expense-tracker.html')


def expense_details(request):
    return render(request, 'expense-tracker/expense-details.html')


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


def recipes(request):
    # recipes = Recipe.objects.all()
    return render(request, 'recipes/recipes.html')


def recipe_detail(request, recipe_id):
    # recipe = get_object_or_404(Recipe, id=recipe_id)

    # Mock danych - symulacja obiektu przepisu z bazy
    recipe = {
        "title": 'The "Midnight in Seville"<br>Oranges',
        "est_time": "10 h",
        "status": "private",
        "image_url": "https://i.imgur.com/2SjgpvQ.jpeg",
        "description_short": "An elegant recipe for scrumptious oranges with or without leaves.",
        "description_long": "This isn't just a fruit plate; it's a masterclass in citrus minimalism. By stripping away the mundane \"peel and pith,\" you transform a common supermarket staple into a glistening, jewel-toned centerpiece. Whether you've managed to find oranges with their pristine leaves attached or you're working with \"naked\" fruit, the secret lies in the contrast between the cold, sharp citrus and the warm, aromatic syrup.",
        "ingredients": [
            {"name": "Sicilian Blood Oranges", "quantity": "67", "unit": "pcs."},
            {"name": "Oranges with Stems and Leaves", "quantity": "21", "unit": "pcs."},
            {"name": "Orange Blossom Honey", "quantity": "37", "unit": "L"},
            {"name": "Grand Marnier or Cointreau", "quantity": "42", "unit": "L"},
            {"name": "Rose Water", "quantity": "2", "unit": "L"},
            {"name": "Pistachios (Bright Green)", "quantity": "300", "unit": "g"},
            {"name": "Micro-Basil", "quantity": "2", "unit": "pinch"},
            {"name": "Pomegranate Arils", "quantity": "30", "unit": "g"}
        ]
    }

    recipe_steps = [
        {
            "title": 'The "Orange Surgery"',
            "subtitle": "(The Supreme Cut)",
            "description": 'Forget peeling; we\'re performing an extraction. To achieve "scrumptious" status, you must transform the fruit into Supremes - naked, glowing wedges free from all bitter white pith and membranes.',
            "instructions": [
                'Behead & Base: Slice off the top and bottom until you see the vibrant flesh.',
                'The Shave: Curve your knife from top to bottom, stripping away the peel and all white pith. You want a bald, glistening sphere.',
                'The Extraction: Slide your knife between the membranes to pop out individual wedges.',
                'Save the Gold: Squeeze the leftover "carcass" over your wedges for a natural bath of juice.'
            ],
            "image_url": "https://i.imgur.com/2SjgpvQ.jpeg"
        },
        {
            "title": "The Sweet Bath",
            "subtitle": None,
            "description": "Now it's time for the magic. Pour the orange blossom honey and Grand Marnier mixture over your freshly cut supremes. Cover with cling film and let it rest in the fridge for at least 2 hours so the flavors intertwine perfectly.",
            "instructions": [],  # Pusta lista, jeśli krok nie ma wypunktowań
            "image_url": "https://i.imgur.com/2SjgpvQ.jpeg"
        }
    ]

    context = {
        'recipe': recipe,
        'recipe_steps': recipe_steps
    }

    return render(request, 'recipes/recipe_detail.html', context)


def admin_panel_view(request):

    all_users = User.objects.all().exclude(role='ADMIN')

    mock_pending_recipes = [
        {'id': 1, 'name': 'Recipe 1'},
        {'id': 2, 'name': 'Recipe 2'},
        {'id': 3, 'name': 'Spicy Tomato Soup'},
    ]

    mock_public_recipes = [
        {'id': 101, 'name': 'Classic Caesar Salad'},
        {'id': 102, 'name': 'The "Midnight in Seville" Oranges'},
        {'id': 103, 'name': 'The "Vampire\'s Orchard" Oranges'},
    ]

    mock_global_units = [
        {'id': 1, 'name': 'Kilogram (kg)'},
        {'id': 2, 'name': 'Liter (L)'},
        {'id': 3, 'name': 'Piece (pcs)'},
        {'id': 4, 'name': 'Gram (g)'},
        {'id': 5, 'name': 'Milliliter (ml)'},
    ]

    context = {
        'db_users': all_users,
        'pending_recipes': mock_pending_recipes,
        'public_recipes': mock_public_recipes,
        'global_units': mock_global_units,
    }

    return render(request, 'admin/admin_panel.html', context)
