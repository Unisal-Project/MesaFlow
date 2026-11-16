-- Destaque escolhido pelo admin; produtos existentes começam sem destaque.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
