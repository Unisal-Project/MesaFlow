-- Configuração do restaurante único. Aditivo, idempotente e sem sobrescrever valores salvos.
CREATE TABLE IF NOT EXISTS restaurant_settings (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    service_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    name VARCHAR(120) NULL,
    address VARCHAR(255) NULL,
    opening_hours VARCHAR(255) NULL,
    contact VARCHAR(120) NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_restaurant_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_restaurant_settings_rate CHECK (service_fee_rate BETWEEN 0 AND 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO restaurant_settings (id, service_fee_rate) VALUES (1, 10.00);
