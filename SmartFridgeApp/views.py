from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import CustomUserCreationForm
from django.contrib import messages
from datetime import date

# Create your views here.

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

def home(request):

    if not request.user.is_authenticated:
        return redirect('landing')

    """
    Dashboard / "Fridge" view. Shows a carousel of the areas the current
    user belongs to, each with the products currently stored in it.
    """
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