from .models import Area, Unit
from django.db.models import Q


def global_modal_context(request):
    if not request.user.is_authenticated:
        return {
            'all_user_areas': [],
            'all_units': [],
        }

    user_areas = list(
        Area.objects.filter(Q(owner=request.user) | Q(users=request.user))
        .distinct()
        .order_by('name')
    )

    # Ensure the user has at least one default area
    if not user_areas:
        import uuid
        fridge = Area.objects.create(
            name="Fridge",
            key=uuid.uuid4().hex[:12],
            owner=request.user,
        )
        fridge.users.add(request.user)
        user_areas = [fridge]

    units = list(
        Unit.objects.filter(Q(is_global=True) | Q(user=request.user))
        .distinct()
        .order_by('symbol')
    )

    return {
        'all_user_areas': user_areas,
        'all_units': units,
    }
