from django.contrib.auth import login
from django.shortcuts import render, redirect
from .forms import CustomUserCreationForm
from django.contrib import messages


# Create your views here.
def home(request):
    return render(request, "base.html")


def register(request):
    # Przekieruj zalogowanego użytkownika
    if request.user.is_authenticated:
        return redirect('home')  # Zmień na nazwę swojej strony głównej

    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # Automatyczne zalogowanie po rejestracji
            messages.success(request, 'Konto zostało pomyślnie utworzone!')
            return redirect('home')  # Zmień na docelowy URL
    else:
        form = CustomUserCreationForm()

    return render(request, 'registration/register.html', {'form': form})