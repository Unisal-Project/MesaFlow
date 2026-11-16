-- Produtos inativos podem ficar sem categoria; a FK e o histórico são mantidos.
-- Reexecutável. A aplicação exige categoria válida ao criar, editar ou reativar.
ALTER TABLE products MODIFY category_id BIGINT UNSIGNED NULL;
