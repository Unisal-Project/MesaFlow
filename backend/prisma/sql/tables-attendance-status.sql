-- Migração incremental para bancos criados pelo mesaflow_schema_v1.sql.
-- Pode ser reaplicada e preserva dados e o índice único de atendimento ativo.
ALTER TABLE attendances
    MODIFY COLUMN status ENUM('OPEN', 'CLOSING_REQUESTED', 'CLOSED', 'CANCELLED', 'AWAITING_PAYMENT') NOT NULL DEFAULT 'OPEN',
    MODIFY COLUMN active_table_id BIGINT UNSIGNED
        AS (CASE WHEN status IN ('OPEN', 'CLOSING_REQUESTED', 'AWAITING_PAYMENT')
            THEN table_id ELSE NULL END) STORED;
