-- Adiciona preferencias de personalizacao por usuario.
-- Execute manualmente se o banco ja existir (phpMyAdmin, DBeaver, etc.).

USE financeiro;

ALTER TABLE users
    ADD COLUMN preferences JSON NULL AFTER trash_autoclean_days;
