# Sistema de Controle Financeiro

Backend em FastAPI + MySQL (SQLAlchemy) com frontend em HTML/CSS/JS puro servido
estaticamente pelo proprio FastAPI. Tema dark, metricas animadas, fluxo de aprovacao
de contas e painel administrativo.

> **Desenvolvimento local (sem Docker):** veja o [README na raiz](../README.md).

## Requisitos

- Python 3.10+
- MySQL 8 (ou compativel)

## Instalacao

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
```

## Configuracao

1. Copie `.env.example` para `.env` e ajuste os valores:

```bash
cp .env.example .env
```

2. Variaveis principais:

| Variavel | Descricao |
|---|---|
| `MYSQL_*` | Credenciais do banco |
| `JWT_SECRET` | Chave para assinar tokens (troque em producao) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin unico criado no primeiro startup |
| `EMAIL_DOMAIN` | Sufixo obrigatorio dos e-mails (`@financeiro.com.br`) |
| `SMTP_*` | Envio de e-mail (opcional) |

> O e-mail do admin tambem deve terminar com `EMAIL_DOMAIN`.

## Banco de dados

O backend cria as tabelas automaticamente no startup via SQLAlchemy.
Caso prefira criar manualmente, execute o script `schema.sql` no seu cliente
(phpMyAdmin, DBeaver, MySQL CLI). O script usa `CREATE ... IF NOT EXISTS`.

## Executar

A partir da pasta `backend/`:

```bash
uvicorn app.main:app --reload
```

- Frontend: http://localhost:8000/
- API/docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Docker (VPS com Traefik + MySQL compartilhado)

Na raiz do repositorio:

```bash
cp .env.example .env
# Ajuste DOMAIN, MYSQL_* (host = nome do container mysql_shared), JWT_SECRET e ADMIN_*

docker compose build
docker compose up -d
```

Premissas do ambiente:

- Redes externas `traefik` e `mysql_shared` ja existem na VPS.
- `MYSQL_HOST` deve ser o **nome do container** MySQL (ex.: `mysql_shared`), nunca `localhost`.
- O banco `MYSQL_DATABASE` e o usuario devem existir no MySQL compartilhado antes do primeiro deploy.
- Container exposto internamente na porta **8000**; Traefik roteia pelo `DOMAIN` do `.env`.

## Acesso inicial

- Admin: e-mail e senha definidos em `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- Usuarios comuns: cadastram-se pela tela inicial e ficam `pendentes` ate aprovacao do admin.

## Recuperacao de senha

O fluxo passa pelo admin. Sem SMTP configurado (`SMTP_ENABLED=false`), o link de
redefinicao aparece no painel admin (e no log) apos a aprovacao.

## Estrutura

```
backend/
  app/
    main.py        # app + static + routers
    config.py      # settings (.env)
    database.py    # engine (quote_plus) + Base
    models.py      # User, AccessLog, PasswordResetRequest, Category, Item
    schemas.py     # Pydantic
    security.py    # bcrypt + JWT + deps
    seed.py        # admin unico + categorias padrao
    emailer.py     # SMTP opcional
    routers/       # auth, users, items, expenses, trash, categories, dashboard, admin
  schema.sql       # DDL manual
  requirements.txt
frontend/
  index.html, status.html, forgot.html, reset.html, dashboard.html, admin.html
  css/ (tokens.css, styles.css)
  js/  (api, ui, animate, icons, auth, dashboard, admin)
```
