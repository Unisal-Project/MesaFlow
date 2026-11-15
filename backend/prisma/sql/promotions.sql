-- Promoções de produto e de categoria.
-- Idempotente e aditivo: tudo nasce desligado e a versão anterior do backend
-- ignora as colunas novas.
-- Promoção opcional (regra 8): desligada por padrão; datas nulas = sem limite.
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS promo_type ENUM('PERCENT', 'AMOUNT') NULL AFTER description,
    ADD COLUMN IF NOT EXISTS promo_value DECIMAL(10,2) NULL AFTER promo_type,
    ADD COLUMN IF NOT EXISTS promo_active BOOLEAN NOT NULL DEFAULT FALSE AFTER promo_value,
    ADD COLUMN IF NOT EXISTS promo_starts_at DATETIME NULL AFTER promo_active,
    ADD COLUMN IF NOT EXISTS promo_ends_at DATETIME NULL AFTER promo_starts_at;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS promo_type ENUM('PERCENT', 'AMOUNT') NULL AFTER price,
    ADD COLUMN IF NOT EXISTS promo_value DECIMAL(10,2) NULL AFTER promo_type,
    ADD COLUMN IF NOT EXISTS promo_active BOOLEAN NOT NULL DEFAULT FALSE AFTER promo_value,
    ADD COLUMN IF NOT EXISTS promo_starts_at DATETIME NULL AFTER promo_active,
    ADD COLUMN IF NOT EXISTS promo_ends_at DATETIME NULL AFTER promo_starts_at;
