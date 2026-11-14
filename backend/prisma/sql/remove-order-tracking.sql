-- Execute antes de publicar a versão sem acompanhamento de preparo.
-- Preserva pedidos e cancelamentos; normaliza somente os estados removidos.
UPDATE orders SET status = 'PENDING'
WHERE status NOT IN ('PENDING', 'CANCELLED');

ALTER TABLE orders
    MODIFY COLUMN status ENUM('PENDING', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
