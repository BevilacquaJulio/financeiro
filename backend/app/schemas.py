from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ORMModel(BaseModel):
    class Config:
        from_attributes = True


# ----- Auth -----
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=1, max_length=190)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(min_length=1, max_length=190)
    password: str
    remember_me: bool = False


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class ForgotPasswordIn(BaseModel):
    email: str = Field(min_length=1, max_length=190)


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class UserPreferencesOut(BaseModel):
    sidebar_title: str
    accent_color: str
    brand_icon: str
    nav_icon_style: str
    nav_order: list[str]
    nav_icons: dict[str, str]


class UserPreferencesUpdate(BaseModel):
    sidebar_title: Optional[str] = Field(default=None, min_length=1, max_length=40)
    accent_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    brand_icon: Optional[str] = None
    nav_icon_style: Optional[str] = None
    nav_order: Optional[list[str]] = None
    nav_icons: Optional[dict[str, str]] = None


# ----- User -----
class UserOut(ORMModel):
    id: int
    name: str
    email: EmailStr
    role: str
    status: str
    avatar: Optional[str] = None
    currency: str
    trash_autoclean_days: int
    preferences: UserPreferencesOut
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    avatar: Optional[str] = None
    currency: Optional[str] = None
    trash_autoclean_days: Optional[int] = Field(default=None, ge=1, le=365)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class AccessLogOut(ORMModel):
    id: int
    created_at: datetime


# ----- Category -----
class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class CategoryOut(ORMModel):
    id: int
    name: str
    item_count: int = 0


# ----- Item -----
class ItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category_id: Optional[int] = None
    estimated_price: float = 0.0
    priority: Optional[str] = None
    notes: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    category_id: Optional[int] = None
    estimated_price: Optional[float] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category_id: Optional[int] = None
    paid_value: float = Field(ge=0)
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None


class ExpenseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    category_id: Optional[int] = None
    paid_value: Optional[float] = Field(default=None, ge=0)
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None


class PayItemIn(BaseModel):
    paid_value: Optional[float] = None
    payment_method: Optional[str] = None
    paid_at: Optional[datetime] = None


class ItemOut(ORMModel):
    id: int
    name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    estimated_price: float
    paid_value: Optional[float] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Optional[str] = None
    origin: Optional[str] = None
    state: str
    previous_state: Optional[str] = None
    included_at: datetime
    paid_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


# ----- Dashboard -----
class MetricCards(BaseModel):
    total_a_gastar: float
    total_gasto: float
    itens_planejados: int
    itens_backlog: int
    itens_lixeira: int


class CategoryTotal(BaseModel):
    category: str
    total: float


class DashboardOut(BaseModel):
    metrics: MetricCards
    by_category: list[CategoryTotal]


# ----- Admin -----
class AdminUserOut(ORMModel):
    id: int
    name: str
    email: EmailStr
    role: str
    status: str
    created_at: datetime
    last_access: Optional[datetime] = None


class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[str] = Field(default=None, min_length=1, max_length=190)
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class AdminResetLogOut(ORMModel):
    id: int
    status: str
    created_at: datetime


class AdminUserDetailOut(AdminUserOut):
    access_logs: list[AccessLogOut] = []
    reset_requests: list[AdminResetLogOut] = []


class ResetRequestOut(ORMModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    status: str
    created_at: datetime
    token_expires_at: Optional[datetime] = None
    reset_link: Optional[str] = None


class AdminCountsOut(BaseModel):
    pending_registrations: int
    pending_resets: int
    total_pending: int


TokenOut.model_rebuild()
