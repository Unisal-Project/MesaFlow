-- Controle de estoque opcional por produto (regras 7 e 10).
-- Idempotente e aditivo: produtos existentes continuam controlados (DEFAULT TRUE)
-- e a versão anterior do backend ignora a coluna.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT TRUE AFTER stock_quantity;
