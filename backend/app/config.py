from functools import lru_cache
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_database: str = "financeiro"
    mysql_user: str = "root"
    mysql_password: str = ""

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    remember_me_expire_minutes: int = 43200

    admin_name: str = "Administrador"
    admin_email: str = "admin@financeiro.com.br"
    admin_password: str = "Admin@123"

    email_domain: str = "@financeiro.com.br"
    password_reset_expire_minutes: int = 30

    smtp_enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "nao-responda@financeiro.com.br"
    smtp_tls: bool = True

    domain: str = ""
    app_base_url: str | None = None

    @model_validator(mode="after")
    def resolve_app_base_url(self) -> Self:
        if self.app_base_url:
            self.app_base_url = self.app_base_url.rstrip("/")
        elif self.domain.strip():
            self.app_base_url = f"https://{self.domain.strip().rstrip('/')}"
        else:
            self.app_base_url = "http://localhost:8000"
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
