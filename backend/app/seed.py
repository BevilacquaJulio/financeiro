from sqlalchemy.orm import Session

from .config import settings
from .models import User
from .security import hash_password


def seed_admin(db: Session) -> None:
    admin = db.query(User).filter(User.role == "admin").first()
    if admin:
        return

    admin = User(
        name=settings.admin_name,
        email=settings.admin_email.lower(),
        password_hash=hash_password(settings.admin_password),
        role="admin",
        status="active",
    )
    db.add(admin)
    db.commit()
