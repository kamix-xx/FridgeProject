from datetime import date

from django.db.models import Q

from .models import Area, Unit, UserProduct


def global_modal_context(request):
    if not request.user.is_authenticated:
        return {
            'all_user_areas': [],
            'all_units': [],
            'expired_products_summary': [],
            'first_expired_area_id': None,
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

    # Expired products for the notification banner
    expired_qs = (
        UserProduct.objects
        .filter(
            Q(area__owner=request.user) | Q(area__users=request.user),
            expiration_date__lt=date.today(),
        )
        .select_related('product', 'area')
        .distinct()
        .order_by('expiration_date')
    )
    expired_list = list(expired_qs)
    first_expired_area_id = expired_list[0].area_id if expired_list else None

    return {
        'all_user_areas': user_areas,
        'all_units': units,
        'expired_products_summary': expired_list,
        'first_expired_area_id': first_expired_area_id,
    }

