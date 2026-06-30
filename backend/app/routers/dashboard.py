from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Item, User
from ..schemas import CategoryTotal, DashboardOut, MetricCards
from ..security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _period_start(period: Optional[str]) -> Optional[datetime]:
    if not period or period == "all":
        return None
    now = datetime.utcnow()
    mapping = {
        "week": timedelta(days=7),
        "month": timedelta(days=30),
        "quarter": timedelta(days=90),
        "year": timedelta(days=365),
    }
    delta = mapping.get(period)
    return now - delta if delta else None


@router.get("", response_model=DashboardOut)
def dashboard(
    period: Optional[str] = Query(default="all"),
    category_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(Item).filter(Item.user_id == current_user.id)

    total_a_gastar = (
        db.query(func.coalesce(func.sum(Item.estimated_price), 0.0))
        .filter(Item.user_id == current_user.id, Item.state == "lista")
        .scalar()
    )

    expense_q = base.filter(Item.state == "gasto")

    period_start = start or _period_start(period)
    if period_start:
        expense_q = expense_q.filter(Item.paid_at >= period_start)
    if end:
        expense_q = expense_q.filter(Item.paid_at <= end)
    if category_id:
        expense_q = expense_q.filter(Item.category_id == category_id)
    if payment_method:
        expense_q = expense_q.filter(Item.payment_method == payment_method)

    expenses = expense_q.all()
    total_gasto = sum((e.paid_value or 0.0) for e in expenses)

    itens_planejados = (
        base.filter(Item.state == "lista").count()
    )
    itens_backlog = base.filter(Item.state == "backlog").count()
    itens_lixeira = base.filter(Item.state == "lixeira").count()

    by_cat: dict[str, float] = {}
    for e in expenses:
        name = e.category.name if e.category else "Sem categoria"
        by_cat[name] = by_cat.get(name, 0.0) + (e.paid_value or 0.0)

    by_category = [
        CategoryTotal(category=k, total=round(v, 2))
        for k, v in sorted(by_cat.items(), key=lambda x: x[1], reverse=True)
    ]

    metrics = MetricCards(
        total_a_gastar=round(total_a_gastar or 0.0, 2),
        total_gasto=round(total_gasto, 2),
        itens_planejados=itens_planejados,
        itens_backlog=itens_backlog,
        itens_lixeira=itens_lixeira,
    )
    return DashboardOut(metrics=metrics, by_category=by_category)
