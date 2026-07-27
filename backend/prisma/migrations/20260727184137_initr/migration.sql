-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    `status` ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
    `avatar` TEXT NULL,
    `currency` VARCHAR(8) NOT NULL DEFAULT 'R$',
    `trash_autoclean_days` INTEGER NOT NULL DEFAULT 30,
    `preferences` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_users_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `access_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_access_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('pending', 'sent', 'rejected', 'used', 'expired') NOT NULL DEFAULT 'pending',
    `token` VARCHAR(255) NULL,
    `token_expires_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `used_at` DATETIME(0) NULL,

    INDEX `idx_reset_user`(`user_id`),
    INDEX `idx_reset_token`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,

    INDEX `idx_categories_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `category_id` INTEGER NULL,
    `name` VARCHAR(160) NOT NULL,
    `estimated_price` DOUBLE NOT NULL DEFAULT 0,
    `paid_value` DOUBLE NULL,
    `priority` ENUM('baixa', 'media', 'alta') NULL,
    `notes` TEXT NULL,
    `payment_method` VARCHAR(40) NULL,
    `origin` ENUM('planejado', 'avulso') NULL,
    `state` ENUM('lista', 'backlog', 'gasto', 'lixeira') NOT NULL DEFAULT 'lista',
    `previous_state` ENUM('lista', 'backlog', 'gasto', 'lixeira') NULL,
    `included_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `paid_at` DATETIME(0) NULL,
    `deleted_at` DATETIME(0) NULL,
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `idx_items_user`(`user_id`),
    INDEX `idx_items_state`(`state`),
    INDEX `idx_items_category`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `access_logs` ADD CONSTRAINT `fk_access_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_requests` ADD CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `fk_categories_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `fk_items_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
