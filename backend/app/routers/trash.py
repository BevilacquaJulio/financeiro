from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Item, User
from ..schemas import ItemOut
from ..security import get_current_user
from ..serializers import item_to_out
from .items import get_owned_item

router = APIRouter(prefix="/api/trash", tags=["trash"])


@router.get("", response_model=list[ItemOut])
def list_trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Item)
        .filter(Item.user_id == current_user.id, Item.state == "lixeira")
        .order_by(Item.deleted_at.desc())
        .all()
    )
    return [item_to_out(i) for i in items]


@router.post("/{item_id}/restore", response_model=ItemOut)
def restore_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "lixeira":
        raise HTTPException(status_code=400, detail="Item nao esta na lixeira.")
    item.state = item.previous_state or "lista"
    item.previous_state = None
    item.deleted_at = None
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.delete("/{item_id}")
def delete_permanent(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = get_owned_item(db, current_user, item_id)
    if item.state != "lixeira":
        raise HTTPException(status_code=400, detail="Item precisa estar na lixeira.")
    db.delete(item)
    db.commit()
    return {"message": "Item removido definitivamente."}
