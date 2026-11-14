-- Colunas do painel administrativo para bancos criados antes desta versão.
-- Idempotente e aditivo: a versão anterior do backend ignora as colunas novas.

-- Bancos criados antes da capacidade da mesa recebem a coluna sem perder dados.
ALTER TABLE restaurant_tables
    ADD COLUMN IF NOT EXISTS seats SMALLINT UNSIGNED NOT NULL DEFAULT 4 AFTER qr_token;

-- Taxa de serviço cobrada no fechamento (0 quando isentada).
ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER closed_by;

-- Forma de pagamento e detalhes do recebimento; um registro por forma usada.
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS method ENUM('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD') NULL AFTER amount,
    ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10,2) NULL AFTER method,
    ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2) NULL AFTER received_amount,
    ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(10,2) NULL AFTER change_amount;
