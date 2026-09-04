from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import CustomUserCreationForm
from django.contrib import messages
from datetime import date, datetime, timedelta
from types import SimpleNamespace

# Create your views here.

# ---------------------------------------------------------------------------
# DEV/DESIGN TOGGLE — set to False (or delete this + _fake_dashboard_areas)
# once you're done eyeballing the carousel/product-list styling. When True,
# home() shows made-up areas/products instead of the logged-in user's real
# data, so you can see the carousel with several areas and every freshness
# state without needing real DB rows.
# ---------------------------------------------------------------------------
USE_FAKE_DASHBOARD_DATA = True

def _with_freshness(user_product):
    """
    Attaches two convenience attributes to a UserProduct instance so the
    template stays free of date arithmetic:

      - freshness_percent: 0-100, how much of the shelf life is left
        (None if the product has no expiration date)
      - freshness_level: 'fresh' | 'warning' | 'critical' | 'expired' | 'unknown'
    """
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


def _fake_dashboard_areas():
    """
    TEMPORARY demo data for the dashboard (see USE_FAKE_DASHBOARD_DATA above).

    Names deliberately match the fake_areas list in areas() below, so the
    "click an area card -> land on it in the dashboard carousel" link
    (see areaCardLink.js / dashboardAreaJump.js) actually finds a match.
    In production both pages read the same real Area rows, so this
    matching happens naturally — this is only needed because these are
    two independent, hand-written mock datasets.

    Reuses _with_freshness so the freshness bars/colors are computed
    exactly like production. Covers:
      - every freshness state (fresh, warning, critical, expired, unknown)
      - an empty area (tests the "No products in this area yet." state)
      - enough products per area to reliably need scrolling
      - enough areas to test the carousel's prev/next arrows
    """
    today = date.today()

    def fake_product(name, days_left=None, added_days_ago=14):
        up = SimpleNamespace(
            product=SimpleNamespace(name=name),
            expiration_date=(today + timedelta(days=days_left)) if days_left is not None else None,
            added_date=datetime.combine(today - timedelta(days=added_days_ago), datetime.min.time()),
        )
        return _with_freshness(up)

    fridge = SimpleNamespace(
        name="Fridge",
        products=[
            fake_product("Whole Milk", days_left=2, added_days_ago=10),       # critical
            fake_product("Free-range Eggs", days_left=18, added_days_ago=4),  # fresh
            fake_product("Leftover Soup", days_left=-1, added_days_ago=6),    # expired
            fake_product("Greek Yogurt", days_left=9, added_days_ago=6),      # warning
            fake_product("Cheddar Block", days_left=25, added_days_ago=5),    # fresh
            fake_product("Mystery Jar", days_left=None),                      # unknown
        ],
    )

    pantry = SimpleNamespace(name="Pantry", products=[])

    freezer = SimpleNamespace(
        name="Freezer",
        products=[
            fake_product("Vanilla Ice Cream", days_left=120, added_days_ago=5),
            fake_product("Frozen Peas", days_left=5, added_days_ago=25),
            fake_product("Sourdough Loaf", days_left=45, added_days_ago=3),
            fake_product("Mixed Veg Bag", days_left=9, added_days_ago=20),
            fake_product("Dumplings", days_left=60, added_days_ago=10),
        ],
    )

    attic = SimpleNamespace(
        name="Attic",
        products=[
            fake_product("Canned Tomatoes", days_left=300, added_days_ago=20),
            fake_product("Homemade Jam", days_left=10, added_days_ago=40),
            fake_product("Pickled Cucumbers", days_left=150, added_days_ago=15),
            fake_product("Rice, 5kg bag", days_left=None),
            fake_product("Dried Beans", days_left=200, added_days_ago=30),
        ],
    )

    room_fridge = SimpleNamespace(
        name="Room fridge",
        products=[
            fake_product("Sparkling Water", days_left=180, added_days_ago=10),
            fake_product("Leftover Pizza", days_left=1, added_days_ago=3),
            fake_product("Energy Drinks", days_left=200, added_days_ago=15),
            fake_product("String Cheese", days_left=8, added_days_ago=6),
            fake_product("Hummus", days_left=3, added_days_ago=9),
        ],
    )

    kitchen_cabinet = SimpleNamespace(
        name="Kitchen cabinet",
        products=[
            fake_product(f"Canned Beans #{i}", days_left=200 - i * 15, added_days_ago=30)
            for i in range(1, 9)
        ],
    )

    return [fridge, pantry, freezer, attic, room_fridge, kitchen_cabinet]


def home(request):

    if not request.user.is_authenticated:
        return redirect('landing')

    """
    Dashboard / "Fridge" view. Shows a carousel of the areas the current
    user belongs to, each with the products currently stored in it.
    """
    if USE_FAKE_DASHBOARD_DATA:
        areas = _fake_dashboard_areas()
    else:
        areas = list(
            request.user.areas
            .prefetch_related('userproduct_set__product', 'userproduct_set__unit')
            .order_by('name')
        )

        for area in areas:
            area.products = [_with_freshness(up) for up in area.userproduct_set.all()]

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
    # mock data
    fake_areas = [
        {"id": 1, "name": "Fridge", "created_at": "01.01.2026", "is_shared": False},
        {"id": 2, "name": "Pantry", "created_at": "01.01.2026", "is_shared": True, "shared_with": "Gacek and more ..."},
        {"id": 3, "name": "Freezer", "created_at": "12.02.2026", "is_shared": False},
        {"id": 4, "name": "Attic", "created_at": "08.03.2026", "is_shared": False},
        {"id": 5, "name": "Room fridge", "created_at": "20.04.2026", "is_shared": False},
        {"id": 6, "name": "Kitchen cabinet", "created_at": "23.04.2026", "is_shared": False},
        # {"id": 7, "name": "Kitchen cabinet", "created_at": "23.04.2026", "is_shared": False},
        # {"id": 8, "name": "Kitchen cabinet", "created_at": "23.04.2026", "is_shared": False},
        # {"id": 9, "name": "Kitchen cabinet", "created_at": "23.04.2026", "is_shared": False},
    ]

    context = {
        'user_areas': fake_areas
    }

    return render(request, 'areas/areas.html', context)


from django.shortcuts import render


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