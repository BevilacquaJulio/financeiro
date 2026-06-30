-- Migracao: remover colunas is_default e archived da tabela categories
-- Execute manualmente no phpMyAdmin, DBeaver ou cliente MySQL.
-- Faca backup antes de executar.

USE financeiro;

-- MySQL 8.0.29+ suporta IF EXISTS em DROP COLUMN.
-- Se sua versao for mais antiga, remova "IF EXISTS" e execute uma coluna por vez.

ALTER TABLE categories DROP COLUMN IF EXISTS archived;
ALTER TABLE categories DROP COLUMN IF EXISTS is_default;
