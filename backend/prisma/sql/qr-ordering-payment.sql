-- Atualização incremental do MVP de pedidos por QR e pagamento consolidado.
SET @has_customer_name := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'customer_name'
);
SET @add_customer_name := IF(
    @has_customer_name = 0,
    'ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100) NULL AFTER notes',
    'SELECT 1'
);
PREPARE add_customer_name FROM @add_customer_name;
EXECUTE add_customer_name;
DEALLOCATE PREPARE add_customer_name;
