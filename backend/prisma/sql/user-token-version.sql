-- Revogação real de sessões: o JWT leva "tv" e só vale enquanto for igual a
-- users.token_version (sobe no logout, troca de senha, desativação e mudança
-- de perfil). Idempotente e aditivo: tokens antigos (sem "tv") valem como 0.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0 AFTER active;
