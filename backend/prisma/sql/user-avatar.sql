-- Foto opcional de cada conta. Não altera credenciais nem sessões existentes.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL AFTER name;
