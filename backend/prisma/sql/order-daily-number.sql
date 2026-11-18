-- Número do pedido por dia de operação (#1, #2… zera na virada do dia).
-- Idempotente: só cria o que falta e só numera pedidos ainda sem número.
-- orders.id continua sendo o identificador interno.

-- Dia de operação: fuso do restaurante + hora de virada (03:40 ainda é o dia anterior).
ALTER TABLE restaurant_settings
    ADD COLUMN IF NOT EXISTS day_cutoff_hour TINYINT UNSIGNED NOT NULL DEFAULT 5 AFTER contact,
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo' AFTER day_cutoff_hour,
    ADD CONSTRAINT IF NOT EXISTS chk_restaurant_settings_cutoff CHECK (day_cutoff_hour BETWEEN 0 AND 23);

-- Último número usado em cada dia (V2: ganha restaurant_id na chave).
CREATE TABLE IF NOT EXISTS order_daily_counters (
    business_date DATE NOT NULL,
    last_number INT UNSIGNED NOT NULL,
    PRIMARY KEY (business_date)
) ENGINE=InnoDB;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS business_date DATE NULL AFTER attendance_id,
    ADD COLUMN IF NOT EXISTS daily_number INT UNSIGNED NULL AFTER business_date;

-- Backfill: created_at está em UTC. Sem as tabelas de fuso do MariaDB,
-- CONVERT_TZ com nome devolve NULL e cai no -03:00 (São Paulo, sem horário de verão).
SET @mf_tz = COALESCE((SELECT timezone FROM restaurant_settings WHERE id = 1), 'America/Sao_Paulo');
SET @mf_cutoff = COALESCE((SELECT day_cutoff_hour FROM restaurant_settings WHERE id = 1), 5);

UPDATE orders
SET business_date = DATE(
        COALESCE(CONVERT_TZ(created_at, '+00:00', @mf_tz), CONVERT_TZ(created_at, '+00:00', '-03:00'))
        - INTERVAL @mf_cutoff HOUR)
WHERE business_date IS NULL;

-- Numera por dia em ordem de created_at, id, continuando depois do maior número já usado no dia.
UPDATE orders o
JOIN (
    SELECT pending.id,
           ROW_NUMBER() OVER (PARTITION BY pending.business_date ORDER BY pending.created_at, pending.id)
           + COALESCE(used.max_number, 0) AS number
    FROM orders pending
    LEFT JOIN (
        SELECT business_date, MAX(daily_number) AS max_number
        FROM orders
        WHERE daily_number IS NOT NULL
        GROUP BY business_date
    ) used ON used.business_date = pending.business_date
    WHERE pending.daily_number IS NULL
) numbered ON numbered.id = o.id
SET o.daily_number = numbered.number;

-- Contadores coerentes com os números já usados (nunca diminuem).
INSERT INTO order_daily_counters (business_date, last_number)
SELECT business_date, MAX(daily_number) FROM orders GROUP BY business_date
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, VALUES(last_number));

-- Todo pedido tem número a partir daqui. Pare o backend antigo antes de rodar:
-- ele não preenche estas colunas e os pedidos dele falhariam.
ALTER TABLE orders
    MODIFY COLUMN business_date DATE NOT NULL,
    MODIFY COLUMN daily_number INT UNSIGNED NOT NULL,
    ADD UNIQUE KEY IF NOT EXISTS uq_orders_business_date_daily_number (business_date, daily_number);
