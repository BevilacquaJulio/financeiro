from .models import Item, User
from .preferences import normalize_preferences
from .schemas import ItemOut, UserOut, UserPreferencesOut


def item_to_out(item: Item) -> ItemOut:
    return ItemOut(
        id=item.id,
        name=item.name,
        category_id=item.category_id,
        category_name=item.category.name if item.category else None,
        estimated_price=item.estimated_price,
        paid_value=item.paid_value,
        priority=item.priority,
        notes=item.notes,
        payment_method=item.payment_method,
        origin=item.origin,
        state=item.state,
        previous_state=item.previous_state,
        included_at=item.included_at,
        paid_at=item.paid_at,
        deleted_at=item.deleted_at,
    )


def user_to_out(user: User) -> UserOut:
    prefs = normalize_preferences(user.preferences)
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=user.status,
        avatar=user.avatar,
        currency=user.currency,
        trash_autoclean_days=user.trash_autoclean_days,
        preferences=UserPreferencesOut(**prefs),
        created_at=user.created_at,
    )
