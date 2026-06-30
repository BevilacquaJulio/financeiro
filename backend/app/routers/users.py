from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AccessLog, User
from ..preferences import normalize_preferences, validate_preferences
from ..schemas import AccessLogOut, ChangePasswordIn, UserOut, UserPreferencesOut, UserPreferencesUpdate, UserUpdate
from ..security import get_current_user, hash_password, verify_password
from ..serializers import user_to_out

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return user_to_out(current_user)


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return user_to_out(current_user)


@router.get("/me/preferences", response_model=UserPreferencesOut)
def get_preferences(current_user: User = Depends(get_current_user)):
    return UserPreferencesOut(**normalize_preferences(current_user.preferences))


@router.put("/me/preferences", response_model=UserPreferencesOut)
def update_preferences(
    payload: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patch = payload.model_dump(exclude_unset=True)
    if not patch:
        return UserPreferencesOut(**normalize_preferences(current_user.preferences))
    try:
        merged = validate_preferences({**normalize_preferences(current_user.preferences), **patch})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    current_user.preferences = merged
    db.commit()
    db.refresh(current_user)
    return UserPreferencesOut(**merged)


@router.put("/me/password")
def change_password(
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Senha alterada com sucesso."}


@router.get("/me/access-logs", response_model=list[AccessLogOut])
def access_logs(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AccessLog)
        .filter(AccessLog.user_id == current_user.id)
        .order_by(AccessLog.created_at.desc())
        .limit(min(limit, 50))
        .all()
    )
