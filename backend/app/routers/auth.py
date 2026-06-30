import re
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..emailer import send_reset_email
from ..models import AccessLog, PasswordResetRequest, User
from ..schemas import (
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
)
from ..security import create_access_token, hash_password, verify_password
from ..serializers import user_to_out

router = APIRouter(prefix="/api/auth", tags=["auth"])

PASSWORD_RULE = re.compile(r"^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?\":{}|<>_\-+=\[\]/\\;'`~]).{8,}$")
EMAIL_LOCAL_RULE = re.compile(r"^[a-z0-9][a-z0-9._-]*$")


def normalize_email(email: str) -> str:
    """Aceita so a parte local ou e-mail completo; sempre retorna user@financeiro.com.br."""
    email = email.lower().strip()
    domain = settings.email_domain.lower()

    if "@" not in email:
        if not email:
            raise HTTPException(status_code=400, detail="Informe o nome do e-mail.")
        email = f"{email}{domain}"
    elif not email.endswith(domain):
        raise HTTPException(
            status_code=400,
            detail=f"O e-mail deve usar o dominio {settings.email_domain}.",
        )

    local = email[: -len(domain)]
    if not local or not EMAIL_LOCAL_RULE.match(local):
        raise HTTPException(status_code=400, detail="Nome de e-mail invalido.")

    return email


def validate_email_domain(email: str) -> str:
    return normalize_email(email)


def validate_password(password: str) -> None:
    if not PASSWORD_RULE.match(password):
        raise HTTPException(
            status_code=400,
            detail="A senha deve ter ao menos 8 caracteres, 1 maiuscula e 1 caractere especial.",
        )


@router.post("/register", status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = validate_email_domain(payload.email)
    validate_password(payload.password)

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="E-mail ja cadastrado no sistema.")

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="user",
        status="pending",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Cadastro recebido. Aguarde a aprovacao do administrador.", "status": "pending"}


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha invalidos.")

    if user.status == "pending":
        raise HTTPException(status_code=403, detail="Conta pendente de aprovacao do administrador.")
    if user.status == "suspended":
        raise HTTPException(status_code=403, detail="Conta suspensa. Contate o administrador.")

    db.add(AccessLog(user_id=user.id))
    db.commit()

    token = create_access_token(user.id, remember_me=payload.remember_me)
    return TokenOut(access_token=token, user=user_to_out(user))


@router.post("/password/forgot")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="E-mail nao encontrado no sistema.")

    active = (
        db.query(PasswordResetRequest)
        .filter(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.status.in_(["pending", "sent"]),
        )
        .first()
    )
    if active:
        raise HTTPException(
            status_code=409,
            detail="Ja existe uma solicitacao ativa. Aguarde a analise do administrador.",
        )

    db.add(PasswordResetRequest(user_id=user.id, status="pending"))
    db.commit()
    return {"message": "Solicitacao registrada. Aguardando aprovacao do administrador."}


@router.post("/password/reset")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    validate_password(payload.password)
    req = (
        db.query(PasswordResetRequest)
        .filter(PasswordResetRequest.token == payload.token)
        .first()
    )
    if not req or req.status != "sent":
        raise HTTPException(status_code=400, detail="Link invalido ou ja utilizado.")
    if not req.token_expires_at or req.token_expires_at < datetime.utcnow():
        req.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Link expirado. Solicite uma nova recuperacao.")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")

    user.password_hash = hash_password(payload.password)
    req.status = "used"
    req.used_at = datetime.utcnow()
    req.token = None
    db.commit()
    return {"message": "Senha redefinida com sucesso. Faca login novamente."}


def generate_reset_link(db: Session, req: PasswordResetRequest) -> str:
    token = secrets.token_urlsafe(32)
    req.token = token
    req.token_expires_at = datetime.utcnow() + timedelta(
        minutes=settings.password_reset_expire_minutes
    )
    req.status = "sent"
    db.commit()
    link = f"{settings.app_base_url.rstrip('/')}/reset.html?token={token}"
    send_reset_email(req.user.email, link)
    return link
