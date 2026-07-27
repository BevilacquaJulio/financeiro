# Financeiro

Sistema de controle financeiro pessoal. **NestJS + Prisma + MySQL** no backend,
**React + Vite + TypeScript** no frontend, servidos por um container só.

O sistema Python (FastAPI + HTML/JS puro) foi substituído em 25/07/2026 e
removido do repositório — continua recuperável no histórico do git:

```bash
git log --oneline           # ache o commit anterior ao cutover
git checkout <commit> -- backend frontend
```

O que valia a pena guardar dele está em `docs/legado/`: o DDL original, as
migrações SQL históricas e o `DESIGN_SYSTEM.md`.

---

## Começar

Um comando:

```bash
bash setup.sh
```

Ele confere o `.env`, **faz backup do banco**, instala tudo, lê a estrutura real
do banco, faz o baseline do Prisma sem executar DDL nenhum, confere sozinho se
nada quebrou e builda os dois projetos.

O `.env` é **único e fica na raiz** — é dele que leem o Nest
(`envFilePath: ['.env', '../.env']`), a CLI do Prisma (via `dotenv -e ../.env`
nos scripts npm) e o `docker compose` (`env_file`). Se ele não existir, o
`setup.sh` cria a partir do `.env.example` e para, pedindo que você preencha
`MYSQL_*` e `JWT_SECRET` **com os mesmos valores do sistema que está no ar**.
Salve com quebra de linha LF: com CRLF o compose injeta um `\r` no fim de cada
valor e o `JWT_SECRET` deixa de bater.

Se o `mysqldump` não estiver instalado, ele para e explica. Faça o dump por
outro meio e rode `bash setup.sh --skip-backup`.

Depois:

```bash
# desenvolvimento — dois terminais
cd backend  && npm run start:dev     # http://localhost:8000  · docs em /api/docs
cd frontend && npm run dev           # http://localhost:5173

# produção — imagem única, Nest servindo API + SPA
docker compose up -d --build
```

**A primeira coisa a testar é logar com um usuário real.** Se a senha
funcionar, a parte irreversível deu certo: os hashes bcrypt do Python
continuam válidos e os tokens JWT já emitidos seguem aceitos (mesmo segredo,
mesmo algoritmo, mesmo payload).

---

## Estrutura

```
financeiro/
├─ setup.sh                    # instalação completa em um comando
├─ Dockerfile                  # multi-stage: builda SPA + API, roda os dois
├─ docker-compose.yml          # rede mysql_shared + Traefik (igual ao antigo)
├─ backend/                    # NestJS + Prisma
│  ├─ prisma/schema.prisma     # sobrescrito pelo db pull no setup
│  ├─ scripts/                 # backup e gerador de fixtures
│  ├─ src/
│  │  ├─ common/               # guards, filtro {detail}, serializers, pyRound
│  │  ├─ config/               # settings (mesmas variáveis de ambiente)
│  │  ├─ prisma/               # PrismaService (driver adapter mariadb)
│  │  ├─ iam/                  # auth · users · admin · preferences · mailer
│  │  └─ finance/              # items · expenses · trash · categories · dashboard
│  └─ test/                    # paridade bcrypt / JWT / arredondamento / regras
├─ frontend/                   # React + Vite
│  └─ src/
│     ├─ styles/               # tokens.css (primitivos) + theme.css (semântico)
│     ├─ lib/                  # cliente HTTP, sessão, formatação, ícones
│     ├─ theme/                # accent dinâmico + preferences
│     ├─ components/           # UiProvider (toast/modal/drawer), shell, primitivos
│     └─ features/             # auth · finance · admin
└─ docs/
   ├─ preview-redesign.html    # preview do visual, abre direto no navegador
   └─ legado/                  # DDL, migrações e design system do sistema Python
```

---

## Como o dado foi preservado

O banco **não foi recriado**. O `setup.sh` usa o procedimento de baseline do
Prisma sobre um banco já populado:

1. `prisma db pull` — leitura pura; a estrutura real do banco vira o
   `schema.prisma`. Onde o banco divergir de qualquer coisa escrita à mão,
   o banco vence.
2. `prisma migrate diff --from-empty` — gera o SQL da migração inicial **sem
   executar nada** e sem precisar de shadow database (o usuário MySQL de
   produção normalmente não pode criar bancos).
3. `prisma migrate resolve --applied <baseline>` — registra "essa migração já
   está aplicada". Nenhum DDL roda no seu banco. O `<baseline>` é a primeira
   pasta de `backend/prisma/migrations` (hoje `20260727184137_initr`); o
   `setup.sh` descobre o nome sozinho.

`prisma migrate dev` **nunca** deve ser usado aqui: contra um banco com dados
ele pode dropar tabelas. O `Dockerfile` roda `migrate deploy`, que só aplica
migrações já criadas e revisadas.

---

## Decisões que divergem do óbvio

Cada uma está comentada no código, no ponto em que importa.

| # | Onde | Decisão | Por quê |
|---|---|---|---|
| 1 | `security.service.ts` | **Não** pré-truncar a senha em 72 bytes | O plano mandava replicar o `[:72]` do Python. Em Node isso **quebra** senhas multibyte: reconstruir a string a partir de 72 bytes cortados no meio de um caractere gera `U+FFFD` e muda o hash. O bcryptjs já consome no máximo 72 bytes. Verificado contra hashes reais do Python. |
| 2 | `common/serialize.ts` | `pyRound` em vez de `toFixed` | `(2.675).toFixed(2)` devolve `"2.68"` no V8; o `round()` do Python devolve `2.67`. Sem isso o dashboard divergiria em centavos. Validado contra 412 casos gerados pelo Python. |
| 3 | `common/serialize.ts` | Datas serializadas sem o sufixo `Z` | O pydantic devolvia `datetime` naive. Um `Date` do JS viraria `...Z` e deslocaria o fuso no cliente. |
| 4 | `admin.service.ts` | "admin primeiro" ordenado na aplicação | `orderBy: {role:'asc'}` daria a ordem **inversa**: MySQL ordena ENUM por índice, e `user` vem antes de `admin`. |
| 5 | `main.ts` | CORS com origem explícita | O sistema antigo usava `allow_origins=["*"]` + `allow_credentials=True`, combinação que os navegadores rejeitam. |
| 6 | `seed.service.ts` | Sem criação de schema no boot | O Python rodava `create_all()` no startup. Fazer isso em app com dados reais é como se perde banco. Schema é responsabilidade do Prisma Migrate, executado explicitamente. |
| 7 | `frontend/` | CSS próprio em vez de Tailwind | O accent é **definido pelo usuário em runtime** (`preferences.accent_color`) e repinta a interface inteira. Utilitário estático de cor não faz isso; variável CSS faz. O resto da regra da casa (TS estrito, React Query, RHF+Zod, feature folders, três estados de dados) foi seguido. |

**Divergência entre o plano e o código antigo:** o plano afirmava que a regra
forte de senha era aplicada na troca de senha (`PUT /api/users/me/password`).
O código Python **não aplicava** — só exigia 8 caracteres. Mantive o
comportamento real e registrei abaixo.

---

## Pendências conhecidas

Nenhuma delas impede o uso. Estão aqui para não virarem surpresa.

1. **Dinheiro em ponto flutuante.** As colunas são `DOUBLE`. Migrar para
   `DECIMAL(12,2)` elimina erro de arredondamento acumulado, mas é `ALTER`
   não-aditivo — faça com backup e migração dedicada.
2. **JWT em `localStorage`.** Vulnerável a XSS. Trocar por cookie httpOnly +
   refresh token é a melhoria de segurança mais relevante.
3. **Auto-limpeza da lixeira não existe.** `trash_autoclean_days` é salvo e
   editável, mas nenhum job consome esse valor. A interface **não promete** o
   que o sistema não faz (ver o texto em Configurações › Conta).
4. **`PUT /items` aceita `estimated_price: null`** e a coluna é `NOT NULL`:
   devolve 500. Era assim no Python também; foi preservado, não corrigido.
5. Sem paginação nas listas, sem rate limit em login/forgot, sem limite de
   tamanho para o `avatar` (base64 numa coluna TEXT).
6. **Troca de senha não exige senha forte** (ver divergência acima).

---

## Testes

```bash
cd backend && npm test
```

46 testes. Os que importam: hashes gerados pelo `bcrypt` do Python validam no
`bcryptjs`, tokens do `python-jose` são aceitos pelo Node, e o arredondamento
bate com o do Python caso a caso.

Os testes de JWT verificam a assinatura com um relógio fixo
(`clockTimestamp`), derivado do `exp` da própria fixture. As fixtures têm `exp`
absoluto: verificar contra o relógio real faria o teste passar no dia em que
foi escrito e falhar em todos os outros.

As fixtures em `test/fixtures/` foram geradas com as bibliotecas reais do
Python. Os hashes bcrypt são autocontidos e continuam válidos mesmo sem o
Python instalado. Para regerar (precisa de `bcrypt` e `python-jose`):

```bash
JWT_SECRET="<o segredo real>" python backend/scripts/gen-fixtures.py
```

---

## Referências

- `plano_migracao_c.md` — o plano que guiou a migração. Documento **histórico**:
  descreve uma estrutura `financeiro-node/{api,web}` que não existe mais, já que
  o cutover foi feito.
- `.cursor/skills/roteiro-sistema/SKILL.md` — especificação funcional, continua
  válida.
- `.cursor/skills/python-fastapi-mysql/SKILL.md` — **obsoleta**, descreve o
  stack removido. Apague quando quiser.
