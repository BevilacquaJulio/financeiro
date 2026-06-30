from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..constants import PAYMENT_METHODS
from ..database import get_db
from ..models import Category, Item, User
from ..schemas import CategoryIn, CategoryOut
from ..security import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _category_counts(db: Session, user_id: int) -> dict[int, int]:
    rows = (
        db.query(Item.category_id, func.count(Item.id))
        .filter(Item.user_id == user_id, Item.category_id.isnot(None))
        .group_by(Item.category_id)
        .all()
    )
    return {cat_id: count for cat_id, count in rows}


def _to_category_out(cat: Category, item_count: int = 0) -> CategoryOut:
    return CategoryOut(
        id=cat.id,
        name=cat.name,
        item_count=item_count,
    )


@router.get("", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cats = (
        db.query(Category)
        .filter(Category.user_id == current_user.id)
        .order_by(Category.name.asc())
        .all()
    )
    counts = _category_counts(db, current_user.id)
    return [_to_category_out(c, counts.get(c.id, 0)) for c in cats]


@router.get("/payment-methods", response_model=list[str])
def payment_methods(current_user: User = Depends(get_current_user)):
    return PAYMENT_METHODS


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Informe o nome da categoria.")
    exists = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.name == name)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Categoria ja existe.")
    cat = Category(user_id=current_user.id, name=name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _to_category_out(cat, 0)


def _get_owned_category(db: Session, user: User, category_id: int) -> Category:
    cat = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user.id)
        .first()
    )
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria nao encontrada.")
    return cat


def _ensure_unique_name(db: Session, user: User, name: str, exclude_id: int | None = None) -> None:
    query = db.query(Category).filter(Category.user_id == user.id, Category.name == name)
    if exclude_id is not None:
        query = query.filter(Category.id != exclude_id)
    if query.first():
        raise HTTPException(status_code=409, detail="Ja existe uma categoria com este nome.")


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = _get_owned_category(db, current_user, category_id)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Informe o nome da categoria.")
    _ensure_unique_name(db, current_user, name, exclude_id=cat.id)
    cat.name = name
    db.commit()
    db.refresh(cat)
    counts = _category_counts(db, current_user.id)
    return _to_category_out(cat, counts.get(cat.id, 0))


@router.delete("/{category_id}", status_code=200)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat = _get_owned_category(db, current_user, category_id)
    linked = (
        db.query(Item)
        .filter(Item.user_id == current_user.id, Item.category_id == category_id)
        .count()
    )
    if linked > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Categoria em uso por {linked} item(ns). Altere ou remova os itens antes de excluir.",
        )
    db.delete(cat)
    db.commit()
    return {"message": "Categoria excluida.", "id": category_id}
