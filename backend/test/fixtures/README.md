Hashes e tokens gerados pelo backend Python (bcrypt + python-jose), usados nos
testes de interoperabilidade.

Regenere com o venv do backend atual:

    JWT_SECRET="<o mesmo do .env>" python backend/scripts/gen-fixtures.py

Os arquivos versionados aqui foram gerados com um segredo de exemplo. Antes do
go-live, REGENERE com o segredo real e rode `npm test` — se algum caso falhar,
nao suba a migracao (ver plano, secoes 3.2 e 6.2).
