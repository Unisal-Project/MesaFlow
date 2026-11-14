-- Migração incremental reaplicável, seguindo as demais migrações SQL do projeto.
CREATE TABLE IF NOT EXISTS waiter_calls (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_id BIGINT UNSIGNED NOT NULL,
    status ENUM('PENDING', 'ATTENDED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attended_at DATETIME NULL,
    pending_table_id BIGINT UNSIGNED GENERATED ALWAYS AS
        (CASE WHEN status = 'PENDING' THEN table_id ELSE NULL END) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_waiter_calls_pending_table (pending_table_id),
    KEY idx_waiter_calls_status_created (status, created_at),
    CONSTRAINT fk_waiter_calls_table FOREIGN KEY (table_id)
        REFERENCES restaurant_tables(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;
