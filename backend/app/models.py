from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base

USER_ROLES = ("user", "admin")
USER_STATUS = ("pending", "active", "suspended")
RESET_STATUS = ("pending", "sent", "rejected", "used", "expired")
ITEM_STATE = ("lista", "backlog", "gasto", "lixeira")
ITEM_ORIGIN = ("planejado", "avulso")
ITEM_PRIORITY = ("baixa", "media", "alta")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(190), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(*USER_ROLES, name="user_role"), default="user", nullable=False)
    status = Column(Enum(*USER_STATUS, name="user_status"), default="pending", nullable=False)
    avatar = Column(Text, nullable=True)
    currency = Column(String(8), default="R$", nullable=False)
    trash_autoclean_days = Column(Integer, default=30, nullable=False)
    preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    access_logs = relationship("AccessLog", back_populates="user", cascade="all, delete-orphan")
    reset_requests = relationship(
        "PasswordResetRequest", back_populates="user", cascade="all, delete-orphan"
    )
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    items = relationship("Item", back_populates="user", cascade="all, delete-orphan")


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="access_logs")


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(*RESET_STATUS, name="reset_status"), default="pending", nullable=False)
    token = Column(String(255), nullable=True, index=True)
    token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    used_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="reset_requests")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(80), nullable=False)

    user = relationship("User", back_populates="categories")
    items = relationship("Item", back_populates="category")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(
        Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name = Column(String(160), nullable=False)
    estimated_price = Column(Float, default=0.0, nullable=False)
    paid_value = Column(Float, nullable=True)
    priority = Column(Enum(*ITEM_PRIORITY, name="item_priority"), nullable=True)
    notes = Column(Text, nullable=True)
    payment_method = Column(String(40), nullable=True)
    origin = Column(Enum(*ITEM_ORIGIN, name="item_origin"), nullable=True)
    state = Column(Enum(*ITEM_STATE, name="item_state"), default="lista", nullable=False, index=True)
    previous_state = Column(Enum(*ITEM_STATE, name="item_prev_state"), nullable=True)
    included_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="items")
    category = relationship("Category", back_populates="items")
