from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Item, User
from ..schemas import ItemCreate, ItemOut, ItemUpdate, PayItemIn
from ..security import get_current_user
from ..serializers import item_to_out

router = APIRouter(prefix="/api/items", tags=["items"])

VALID_PRIORITIES = {"baixa", "media", "alta"}


def get_owned_item(db: Session, user: User, item_id: int) -> Item:
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado.")
    return item


def _validate_priority(priority):
    if priority is not None and priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail="Prioridade invalida.")


@router.get("", response_model=list[ItemOut])
def list_items(
    state: str = "lista",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if state not in {"lista", "backlog"}:
        raise HTTPException(status_code=400, detail="Estado invalido para este endpoint.")
    items = (
        db.query(Item)
        .filter(Item.user_id == current_user.id, Item.state == state)
        .order_by(Item.included_at.desc())
        .all()
    )
    return [item_to_out(i) for i in items]


@router.post("", response_model=ItemOut, status_code=201)
def create_item(
    payload: ItemCreate,
    state: str = "lista",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if state not in {"lista", "backlog"}:
        raise HTTPException(status_code=400, detail="Estado invalido.")
    _validate_priority(payload.priority)
    item = Item(
        user_id=current_user.id,
        name=payload.name.strip(),
        category_id=payload.category_id,
        estimated_price=payload.estimated_price or 0.0,
        priority=payload.priority,
        notes=payload.notes,
        state=state,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.put("/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state not in {"lista", "backlog"}:
        raise HTTPException(status_code=400, detail="Apenas itens da lista ou backlog aqui.")
    data = payload.model_dump(exclude_unset=True)
    _validate_priority(data.get("priority"))
    for field, value in data.items():
        setattr(item, field, value.strip() if field == "name" and value else value)
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.post("/{item_id}/pay", response_model=ItemOut)
def pay_item(
    item_id: int,
    payload: PayItemIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "lista":
        raise HTTPException(status_code=400, detail="Apenas itens da lista podem ser pagos.")
    item.previous_state = item.state
    item.state = "gasto"
    item.origin = "planejado"
    item.paid_value = payload.paid_value if payload.paid_value is not None else item.estimated_price
    item.payment_method = payload.payment_method
    item.paid_at = payload.paid_at or datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.post("/{item_id}/move-backlog", response_model=ItemOut)
def move_to_backlog(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "lista":
        raise HTTPException(status_code=400, detail="Apenas itens da lista vao para o backlog.")
    item.previous_state = item.state
    item.state = "backlog"
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.post("/{item_id}/promote", response_model=ItemOut)
def promote_to_list(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "backlog":
        raise HTTPException(status_code=400, detail="Apenas itens do backlog podem ser promovidos.")
    item.previous_state = item.state
    item.state = "lista"
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.delete("/{item_id}", response_model=ItemOut)
def soft_delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state == "lixeira":
        raise HTTPException(status_code=400, detail="Item ja esta na lixeira.")
    item.previous_state = item.state
    item.state = "lixeira"
    item.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item_to_out(item)
