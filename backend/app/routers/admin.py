from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import AccessLog, PasswordResetRequest, User
from ..schemas import (
    AdminCountsOut,
    AdminResetLogOut,
    AdminUserDetailOut,
    AdminUserOut,
    AdminUserUpdate,
    ResetRequestOut,
)
from ..security import hash_password, require_admin
from .auth import generate_reset_link, validate_email_domain, validate_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _user_to_admin_out(db: Session, user: User) -> AdminUserOut:
    last = (
        db.query(func.max(AccessLog.created_at))
        .filter(AccessLog.user_id == user.id)
        .scalar()
    )
    return AdminUserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        last_access=last,
    )


@router.get("/counts", response_model=AdminCountsOut)
def counts(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    pending_reg = db.query(User).filter(User.status == "pending").count()
    pending_reset = (
        db.query(PasswordResetRequest)
        .filter(PasswordResetRequest.status == "pending")
        .count()
    )
    return AdminCountsOut(
        pending_registrations=pending_reg,
        pending_resets=pending_reset,
        total_pending=pending_reg + pending_reset,
    )


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    status: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(User)
    if status:
        query = query.filter(User.status == status)
    users = query.order_by(
        case((User.role == "admin", 0), else_=1),
        User.created_at.desc(),
    ).all()
    return [_user_to_admin_out(db, u) for u in users]


def _find_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")
    return user


def _get_managed_user(db: Session, user_id: int) -> User:
    user = _find_user(db, user_id)
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Acao nao permitida sobre o administrador.")
    return user


@router.put("/users/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = _find_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    if user.role == "admin":
        if "name" in data or "email" in data:
            raise HTTPException(
                status_code=400,
                detail="Nome e e-mail do administrador nao podem ser alterados.",
            )
        if not data.get("password"):
            raise HTTPException(status_code=400, detail="Informe a nova senha.")
        validate_password(data["password"])
        user.password_hash = hash_password(data["password"])
    else:
        if "email" in data and data["email"]:
            new_email = validate_email_domain(data["email"])
            exists = (
                db.query(User)
                .filter(User.email == new_email, User.id != user.id)
                .first()
            )
            if exists:
                raise HTTPException(status_code=409, detail="E-mail ja em uso.")
            user.email = new_email
        if "name" in data and data["name"]:
            user.name = data["name"].strip()
        if "password" in data and data["password"]:
            validate_password(data["password"])
            user.password_hash = hash_password(data["password"])
    db.commit()
    db.refresh(user)
    return _user_to_admin_out(db, user)


@router.post("/users/{user_id}/approve", response_model=AdminUserOut)
def approve_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = _get_managed_user(db, user_id)
    if user.status != "pending":
        raise HTTPException(status_code=400, detail="Conta nao esta pendente.")
    user.status = "active"
    db.commit()
    db.refresh(user)
    return _user_to_admin_out(db, user)


@router.post("/users/{user_id}/reject")
def reject_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = _get_managed_user(db, user_id)
    if user.status != "pending":
        raise HTTPException(status_code=400, detail="Conta nao esta pendente.")
    db.delete(user)
    db.commit()
    return {"message": "Cadastro rejeitado e removido."}


@router.post("/users/{user_id}/suspend", response_model=AdminUserOut)
def suspend_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = _get_managed_user(db, user_id)
    user.status = "suspended" if user.status != "suspended" else "active"
    db.commit()
    db.refresh(user)
    return _user_to_admin_out(db, user)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = _get_managed_user(db, user_id)
    db.delete(user)
    db.commit()
    return {"message": "Conta e dados financeiros removidos."}


@router.get("/users/{user_id}", response_model=AdminUserDetailOut)
def get_user_detail(
    user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    user = _find_user(db, user_id)
    base = _user_to_admin_out(db, user)
    access_logs = (
        db.query(AccessLog)
        .filter(AccessLog.user_id == user.id)
        .order_by(AccessLog.created_at.desc())
        .limit(20)
        .all()
    )
    reset_requests = (
        db.query(PasswordResetRequest)
        .filter(PasswordResetRequest.user_id == user.id)
        .order_by(PasswordResetRequest.created_at.desc())
        .limit(10)
        .all()
    )
    return AdminUserDetailOut(
        **base.model_dump(),
        access_logs=access_logs,
        reset_requests=[
            AdminResetLogOut(id=r.id, status=r.status, created_at=r.created_at)
            for r in reset_requests
        ],
    )


def _reset_to_out(req: PasswordResetRequest, include_link: bool = False) -> ResetRequestOut:
    link = None
    if include_link and req.token:
        link = f"{settings.app_base_url.rstrip('/')}/reset.html?token={req.token}"
    return ResetRequestOut(
        id=req.id,
        user_id=req.user_id,
        user_name=req.user.name if req.user else None,
        user_email=req.user.email if req.user else None,
        status=req.status,
        created_at=req.created_at,
        token_expires_at=req.token_expires_at,
        reset_link=link,
    )


@router.get("/password-resets", response_model=list[ResetRequestOut])
def list_resets(
    only_pending: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(PasswordResetRequest)
    if only_pending:
        query = query.filter(PasswordResetRequest.status == "pending")
    reqs = query.order_by(PasswordResetRequest.created_at.desc()).all()
    return [_reset_to_out(r, include_link=(r.status == "sent")) for r in reqs]


@router.get("/password-resets/{user_id}/history", response_model=list[ResetRequestOut])
def reset_history(
    user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    reqs = (
        db.query(PasswordResetRequest)
        .filter(PasswordResetRequest.user_id == user_id)
        .order_by(PasswordResetRequest.created_at.desc())
        .all()
    )
    return [_reset_to_out(r) for r in reqs]


@router.post("/password-resets/{req_id}/approve", response_model=ResetRequestOut)
def approve_reset(req_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    req = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada.")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Solicitacao nao esta pendente.")
    generate_reset_link(db, req)
    db.refresh(req)
    return _reset_to_out(req, include_link=True)


@router.post("/password-resets/{req_id}/reject", response_model=ResetRequestOut)
def reject_reset(req_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    req = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada.")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Solicitacao nao esta pendente.")
    req.status = "rejected"
    db.commit()
    db.refresh(req)
    return _reset_to_out(req)
