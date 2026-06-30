-- ============================================================
-- Sistema de Controle Financeiro - Schema MySQL
-- Execute manualmente (phpMyAdmin, DBeaver, MySQL CLI).
-- O backend tambem cria as tabelas automaticamente via SQLAlchemy.
-- ============================================================

CREATE DATABASE IF NOT EXISTS financeiro
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE financeiro;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    status ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
    avatar TEXT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'R$',
    trash_autoclean_days INT NOT NULL DEFAULT 30,
    preferences JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_access_user (user_id),
    CONSTRAINT fk_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('pending','sent','rejected','used','expired') NOT NULL DEFAULT 'pending',
    token VARCHAR(255) NULL,
    token_expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME NULL,
    INDEX idx_reset_user (user_id),
    INDEX idx_reset_token (token),
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(80) NOT NULL,
    INDEX idx_categories_user (user_id),
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NULL,
    name VARCHAR(160) NOT NULL,
    estimated_price DOUBLE NOT NULL DEFAULT 0,
    paid_value DOUBLE NULL,
    priority ENUM('baixa','media','alta') NULL,
    notes TEXT NULL,
    payment_method VARCHAR(40) NULL,
    origin ENUM('planejado','avulso') NULL,
    state ENUM('lista','backlog','gasto','lixeira') NOT NULL DEFAULT 'lista',
    previous_state ENUM('lista','backlog','gasto','lixeira') NULL,
    included_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME NULL,
    deleted_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_items_user (user_id),
    INDEX idx_items_state (state),
    INDEX idx_items_category (category_id),
    CONSTRAINT fk_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
