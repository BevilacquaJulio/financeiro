# Financeiro

Sistema de controle financeiro pessoal com backend **FastAPI + MySQL** e frontend **HTML/CSS/JS** servido pelo próprio backend.

Este guia explica como rodar o projeto **localmente, sem Docker**.

---

## Requisitos

- **Python 3.10+**
- **MySQL 8** (ou compatível), rodando na sua máquina ou em um servidor acessível

---

## 1. Banco de dados

Crie o banco no MySQL usando phpMyAdmin, DBeaver ou outro cliente. Exemplo de script:

```sql
CREATE DATABASE IF NOT EXISTS financeiro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

As tabelas são criadas automaticamente na primeira execução do backend. Se preferir criar tudo manualmente, use o arquivo `backend/schema.sql`.

---

## 2. Backend — dependências

Na pasta `backend/`:

```bash
cd backend
python -m venv .venv
```

Ative o ambiente virtual:

**Windows (PowerShell ou CMD)**

```bash
.venv\Scripts\activate
```

**Linux / macOS**

```bash
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

---

## 3. Variáveis de ambiente

Copie o exemplo e ajuste conforme seu MySQL local:

```bash
cd backend
cp .env.example .env
```

Edite `backend/.env`. Variáveis principais:

| Variável | Descrição |
|---|---|
| `MYSQL_HOST` | Em desenvolvimento local, use `localhost` |
| `MYSQL_PORT` | Porta do MySQL (padrão `3306`) |
| `MYSQL_DATABASE` | Nome do banco (ex.: `financeiro`) |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Credenciais do MySQL |
| `JWT_SECRET` | Chave para tokens JWT — troque em produção |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin criado no primeiro startup |
| `EMAIL_DOMAIN` | Sufixo dos e-mails (padrão `@financeiro.com.br`) |
| `APP_BASE_URL` | URL base (local: `http://localhost:8000`). No Docker, omita — o backend monta `https://` + `DOMAIN` |

O e-mail do administrador deve terminar com o valor de `EMAIL_DOMAIN`.

---

## 4. Executar

Com o ambiente virtual ativo, ainda dentro de `backend/`:

```bash
uvicorn app.main:app --reload
```

O `--reload` reinicia o servidor ao salvar alterações no código (útil em desenvolvimento).

---

## 5. Acessar

| Recurso | URL |
|---|---|
| Frontend (login) | http://localhost:8000/ |
| Documentação da API | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |

O frontend não precisa de servidor separado: o FastAPI serve os arquivos de `frontend/`.

---

## 6. Primeiro acesso

- **Administrador:** use o e-mail e a senha definidos em `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`.
- **Usuários comuns:** cadastrem-se pela tela inicial; a conta fica **pendente** até o admin aprovar no painel.

---

## 7. Recuperação de senha

O fluxo passa pela aprovação do administrador. Com `SMTP_ENABLED=false`, o link de redefinição aparece no painel admin (e no log do servidor) após a aprovação.

---

## Estrutura do repositório

```text
financeiro/
├── backend/          # API FastAPI, models, routers
│   ├── app/
│   ├── schema.sql
│   └── .env.example  # Configuração local (sem Docker)
├── frontend/         # HTML, CSS e JS
├── docker-compose.yml
├── Dockerfile
└── .env.example      # Configuração para deploy com Docker
```

---

## Deploy com Docker

Para VPS com Traefik e MySQL compartilhado, use o `docker-compose.yml` na raiz. Detalhes em [backend/README.md](backend/README.md#docker-vps-com-traefik--mysql-compartilhado).

---

## Problemas comuns

**Erro de conexão com MySQL**

- Confirme se o serviço MySQL está rodando.
- Verifique `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD` e `MYSQL_DATABASE` no `backend/.env`.
- Senhas com caracteres especiais (`@`, `#`, `%`, etc.) são suportadas; não altere a URL manualmente no código.

**Porta 8000 em uso**

```bash
uvicorn app.main:app --reload --port 8001
```

Ajuste `APP_BASE_URL` no `.env` se usar outra porta.

**Sessão expirada / 401**

- Faça login novamente em http://localhost:8000/
- Limpe o token no DevTools → Application → Local Storage (`fin_token`), se necessário.
