from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Item, User
from ..schemas import ExpenseCreate, ExpenseUpdate, ItemOut
from ..security import get_current_user
from ..serializers import item_to_out
from .items import get_owned_item

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=list[ItemOut])
def list_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Item)
        .filter(Item.user_id == current_user.id, Item.state == "gasto")
        .order_by(Item.paid_at.desc())
        .all()
    )
    return [item_to_out(i) for i in items]


@router.post("", response_model=ItemOut, status_code=201)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = Item(
        user_id=current_user.id,
        name=payload.name.strip(),
        category_id=payload.category_id,
        estimated_price=payload.paid_value,
        paid_value=payload.paid_value,
        payment_method=payload.payment_method,
        notes=payload.notes,
        origin="avulso",
        state="gasto",
        paid_at=payload.paid_at or datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.put("/{item_id}", response_model=ItemOut)
def update_expense(
    item_id: int,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "gasto":
        raise HTTPException(status_code=400, detail="Item nao e um gasto realizado.")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value.strip() if field == "name" and value else value)
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.post("/{item_id}/reopen", response_model=ItemOut)
def reopen_expense(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "gasto":
        raise HTTPException(status_code=400, detail="Apenas gastos podem ser reabertos.")
    item.previous_state = item.state
    item.state = "lista"
    item.paid_value = None
    item.paid_at = None
    item.payment_method = None
    item.origin = None
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.delete("/{item_id}", response_model=ItemOut)
def soft_delete_expense(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "gasto":
        raise HTTPException(status_code=400, detail="Item nao e um gasto realizado.")
    item.previous_state = item.state
    item.state = "lixeira"
    item.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item_to_out(item)
