-- Até 3 fotos por produto: image_url continua sendo a capa (cards, carrinho).
-- Idempotente e aditivo: a versão anterior do backend ignora as colunas novas.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image_url_2 VARCHAR(2048) NULL AFTER image_url,
    ADD COLUMN IF NOT EXISTS image_url_3 VARCHAR(2048) NULL AFTER image_url_2;
