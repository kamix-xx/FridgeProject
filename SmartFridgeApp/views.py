from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import CustomUserCreationForm
from django.contrib import messages


# Create your views here.
def home(request):
    if not request.user.is_authenticated:
        return redirect('landing')
    return render(request, "dashboard/dashboard.html")

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


@login_required(login_url='login')
# If a user is logged-in, Django automatically passes 'request.user' object to every template as 'user'
def profile(request):
    return render(request, 'user/profile.html')