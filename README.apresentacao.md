# Financeiro — Controle Financeiro Pessoal

Aplicação web completa para organizar gastos, planejar compras e acompanhar métricas financeiras com isolamento total de dados por usuário.

---

## Visão geral

O **Financeiro** nasceu como uma solução prática para quem quer enxergar para onde vai o dinheiro — do item na lista de desejos até o gasto efetivado — sem planilhas soltas ou apps genéricos demais.

Cada usuário opera em seu próprio ambiente: categorias, itens planejados, backlog, histórico de gastos e lixeira com auto-limpeza configurável. Um painel administrativo centraliza aprovação de contas, gestão de usuários e solicitações de redefinição de senha.

A interface adota **dark mode** como padrão, com cor de destaque personalizável, animações leves e layout responsivo para desktop e mobile.

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| ORM / banco | SQLAlchemy, MySQL 8 |
| Autenticação | JWT + bcrypt |
| Frontend | HTML, CSS e JavaScript (vanilla) |
| Deploy | Docker, Traefik, Let's Encrypt |

O FastAPI serve tanto a API REST quanto os arquivos estáticos do frontend — sem build step, sem servidor Node separado.

---

## Funcionalidades em destaque

**Para o usuário**

- Dashboard com métricas animadas (total a gastar, total gasto, itens por estado)
- Fluxo completo de itens: lista → backlog → gasto → lixeira
- Categorias personalizadas e filtros por período, categoria e forma de pagamento
- Gastos avulsos e planejados com registro de valor pago e data
- Preferências visuais (cor de destaque, ícones, ordem da sidebar)
- Recuperação de senha com aprovação do administrador

**Para o administrador**

- Painel com contadores de pendências
- Aprovação e suspensão de contas
- Visualização de último acesso por usuário
- Gestão de solicitações de redefinição de senha

---

## Acesso rápido

Com o servidor rodando em `http://localhost:8000`:

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Administrador | `admin@financeiro.com.br` | `Admin@123` |
| Maria Silva | `maria@financeiro.com.br` | `Demo@123` |
| Carlos Oliveira | `carlos@financeiro.com.br` | `Demo@123` |
| Ana Souza | `ana@financeiro.com.br` | `Demo@123` |

**O que explorar em cada conta**

- **Maria** — finanças domésticas: mercado, casa e transporte, com itens na lista e gastos recentes
- **Carlos** — perfil freelancer: assinaturas de ferramentas, equipamentos e escritório
- **Ana** — gastos pessoais: saúde, lazer e viagens, com preferências visuais distintas
- **Admin** — acesse `/admin.html` após login; há uma solicitação de redefinição de senha pendente do Carlos

---

## Como rodar com dados de demonstração

### 1. Subir o ambiente

Siga o [README principal](README.md) para configurar Python, MySQL e o arquivo `backend/.env`.

Inicie o backend uma vez para criar as tabelas:

```bash
cd backend
uvicorn app.main:app --reload
```

### 2. Popular o banco

Execute o script `backend/seed_demo.sql` no MySQL (phpMyAdmin, DBeaver ou similar).

> **Atenção:** o script remove todos os registros existentes nas tabelas do sistema antes de inserir os dados de demonstração. Faça backup se necessário.

### 3. Reiniciar o backend

Após executar o script, reinicie o servidor. O seed automático do backend **não** recria o admin porque o registro já existirá no banco.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────┐
│                     Navegador                       │
│         HTML / CSS / JS  (frontend/)                │
└──────────────────────┬──────────────────────────────┘
                       │ REST + arquivos estáticos
┌──────────────────────▼──────────────────────────────┐
│              FastAPI  (backend/app/)                │
│   auth · users · items · expenses · dashboard       │
│   categories · trash · admin                        │
└──────────────────────┬──────────────────────────────┘
                       │ SQLAlchemy
┌──────────────────────▼──────────────────────────────┐
│                    MySQL 8                          │
└─────────────────────────────────────────────────────┘
```

---

## Estrutura do repositório

```text
financeiro/
├── backend/
│   ├── app/              # API, models, routers, segurança
│   ├── schema.sql        # DDL completo
│   ├── seed_demo.sql     # Dados de demonstração
│   └── migrations/       # Evoluções incrementais
├── frontend/
│   ├── *.html            # Telas da aplicação
│   ├── js/               # Lógica client-side
│   └── css/              # Design system e estilos
├── Dockerfile
└── docker-compose.yml
```

---

## Endpoints úteis

| Recurso | URL |
|---------|-----|
| Login / frontend | http://localhost:8000/ |
| Painel admin | http://localhost:8000/admin.html |
| Documentação OpenAPI | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |

---

## Segurança

- Senhas armazenadas com **bcrypt**
- Tokens **JWT** com expiração configurável
- Isolamento de dados por `user_id` em todas as consultas
- Domínio de e-mail restrito (`@financeiro.com.br`)
- Contas novas exigem aprovação antes do primeiro acesso

---

## Deploy

Para ambiente de produção com Docker, Traefik e MySQL compartilhado, consulte [backend/README.md](backend/README.md).

---

## Licença

Projeto de código aberto para fins educacionais e demonstrativos.
