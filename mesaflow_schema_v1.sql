-- ============================================================
-- MesaFlow - Schema do Banco de Dados MariaDB
-- Versão inicial (V1)
-- ============================================================
--
-- O banco deve ser selecionado por quem executa este arquivo. No Docker
-- Compose, MARIADB_DATABASE cria o banco e o script é executado nele.
-- Isso evita criar as tabelas em um banco diferente do DATABASE_URL da API.

-- ============================================================
-- 1. Usuários
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;


-- ============================================================
-- 2. Categorias
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;


-- ============================================================
-- 3. Produtos
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_products_price
        CHECK (price >= 0),

    CONSTRAINT chk_products_stock
        CHECK (stock_quantity >= 0),

    KEY idx_products_category_id (category_id),
    KEY idx_products_active_available (active, available)
) ENGINE=InnoDB;


-- ============================================================
-- 4. Mesas
-- ============================================================

CREATE TABLE IF NOT EXISTS restaurant_tables (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    number INT UNSIGNED NOT NULL,
    name VARCHAR(100) NULL,
    qr_token VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_restaurant_tables_number (number),
    UNIQUE KEY uq_restaurant_tables_qr_token (qr_token)
) ENGINE=InnoDB;


-- ============================================================
-- 5. Atendimentos / Comandas
-- ============================================================

CREATE TABLE IF NOT EXISTS attendances (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_id BIGINT UNSIGNED NOT NULL,

    status ENUM(
        'OPEN',
        'CLOSING_REQUESTED',
        'CLOSED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'OPEN',

    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closing_requested_at DATETIME NULL,
    closed_at DATETIME NULL,
    closed_by BIGINT UNSIGNED NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Garante no banco que uma mesa não possua dois atendimentos
    -- OPEN/CLOSING_REQUESTED ao mesmo tempo.
    active_table_id BIGINT UNSIGNED
        AS (
            CASE
                WHEN status IN ('OPEN', 'CLOSING_REQUESTED')
                THEN table_id
                ELSE NULL
            END
        ) STORED,

    PRIMARY KEY (id),

    CONSTRAINT fk_attendances_table
        FOREIGN KEY (table_id)
        REFERENCES restaurant_tables(id)
        -- MariaDB não permite ON UPDATE CASCADE aqui porque table_id também
        -- alimenta a coluna gerada/indexada active_table_id (erro 1901).
        -- IDs de mesa são imutáveis, portanto RESTRICT é a regra adequada.
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CONSTRAINT fk_attendances_closed_by
        FOREIGN KEY (closed_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    UNIQUE KEY uq_attendances_one_active_per_table (active_table_id),

    KEY idx_attendances_table_id (table_id),
    KEY idx_attendances_status (status),
    KEY idx_attendances_opened_at (opened_at),
    KEY idx_attendances_closed_at (closed_at)
) ENGINE=InnoDB;


-- ============================================================
-- 6. Pedidos
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attendance_id BIGINT UNSIGNED NOT NULL,

    status ENUM(
        'PENDING',
        'PREPARING',
        'READY',
        'DELIVERED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    notes TEXT NULL,

    -- NULL quando o pedido for realizado diretamente pelo cliente.
    created_by BIGINT UNSIGNED NULL,

    -- Dados de cancelamento.
    cancelled_at DATETIME NULL,
    cancelled_by BIGINT UNSIGNED NULL,
    cancellation_source ENUM('CUSTOMER', 'EMPLOYEE', 'ADMIN') NULL,
    cancellation_reason VARCHAR(500) NULL,
    restore_stock BOOLEAN NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_orders_attendance
        FOREIGN KEY (attendance_id)
        REFERENCES attendances(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_orders_cancelled_by
        FOREIGN KEY (cancelled_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    KEY idx_orders_attendance_id (attendance_id),
    KEY idx_orders_status (status),
    KEY idx_orders_created_at (created_at),
    KEY idx_orders_cancelled_at (cancelled_at)
) ENGINE=InnoDB;


-- ============================================================
-- 7. Itens do Pedido
-- ============================================================

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,

    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    notes VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_items_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_order_items_unit_price
        CHECK (unit_price >= 0),

    KEY idx_order_items_order_id (order_id),
    KEY idx_order_items_product_id (product_id)
) ENGINE=InnoDB;


-- ============================================================
-- 8. Movimentações de Estoque
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    order_id BIGINT UNSIGNED NULL,
    order_item_id BIGINT UNSIGNED NULL,

    type ENUM(
        'ENTRY',
        'EXIT',
        'ADJUSTMENT',
        'SALE',
        'CANCELLATION'
    ) NOT NULL,

    -- Pode ser positivo ou negativo.
    -- Exemplo: venda de 2 unidades = -2.
    quantity INT NOT NULL,

    reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_stock_movements_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_stock_movements_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_stock_movements_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_stock_movements_order_item
        FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_stock_movements_quantity
        CHECK (quantity <> 0),

    KEY idx_stock_movements_product_id (product_id),
    KEY idx_stock_movements_order_id (order_id),
    KEY idx_stock_movements_order_item_id (order_item_id),
    KEY idx_stock_movements_created_at (created_at)
) ENGINE=InnoDB;


-- ============================================================
-- 9. Pagamentos
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attendance_id BIGINT UNSIGNED NOT NULL,

    method ENUM(
        'CASH',
        'PIX',
        'CREDIT_CARD',
        'DEBIT_CARD'
    ) NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    status ENUM(
        'PENDING',
        'PAID',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    paid_at DATETIME NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_payments_attendance
        FOREIGN KEY (attendance_id)
        REFERENCES attendances(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_payments_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_payments_amount
        CHECK (amount > 0),

    KEY idx_payments_attendance_id (attendance_id),
    KEY idx_payments_status (status),
    KEY idx_payments_paid_at (paid_at)
) ENGINE=InnoDB;


-- ============================================================
-- 10. Fila de Impressão / Integração com ESP32
-- ============================================================

CREATE TABLE IF NOT EXISTS print_jobs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    order_id BIGINT UNSIGNED NULL,
    attendance_id BIGINT UNSIGNED NULL,

    type ENUM(
        'ORDER',
        'BILL'
    ) NOT NULL,

    status ENUM(
        'PENDING',
        'SENT',
        'PRINTED',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',

    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    last_error TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_print_jobs_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CONSTRAINT fk_print_jobs_attendance
        FOREIGN KEY (attendance_id)
        REFERENCES attendances(id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CONSTRAINT chk_print_jobs_reference
        CHECK (order_id IS NOT NULL OR attendance_id IS NOT NULL),

    KEY idx_print_jobs_status (status),
    KEY idx_print_jobs_order_id (order_id),
    KEY idx_print_jobs_attendance_id (attendance_id),
    KEY idx_print_jobs_created_at (created_at)
) ENGINE=InnoDB;


-- ============================================================
-- Views úteis para a primeira versão
-- ============================================================

-- Total acumulado de cada atendimento, desconsiderando pedidos cancelados.
CREATE OR REPLACE VIEW vw_attendance_totals AS
SELECT
    a.id AS attendance_id,
    a.table_id,
    a.status,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total
FROM attendances a
LEFT JOIN orders o
    ON o.attendance_id = a.id
    AND o.status <> 'CANCELLED'
LEFT JOIN order_items oi
    ON oi.order_id = o.id
GROUP BY
    a.id,
    a.table_id,
    a.status;


-- Total efetivamente pago por atendimento.
CREATE OR REPLACE VIEW vw_attendance_payments AS
SELECT
    attendance_id,
    COALESCE(SUM(amount), 0) AS total_paid
FROM payments
WHERE status = 'PAID'
GROUP BY attendance_id;


-- ============================================================
-- Observações de regra de negócio
-- ============================================================
--
-- 1. O QR Code identifica a mesa através de restaurant_tables.qr_token.
--
-- 2. Uma mesa só pode ter um atendimento OPEN/CLOSING_REQUESTED por vez.
--    Essa regra também é garantida por uq_attendances_one_active_per_table.
--
-- 3. Um atendimento pode possuir vários pedidos.
--
-- 4. order_items.unit_price guarda o preço do produto no momento da venda.
--
-- 5. O estoque é debitado no momento da criação do pedido.
--
-- 6. Alterações de quantidade feitas por funcionário/admin devem movimentar
--    somente a diferença de estoque e registrar ADJUSTMENT.
--
-- 7. O cliente pode cancelar um pedido por até 5 minutos após created_at.
--    Essa regra é validada no backend.
--
-- 8. Funcionário/admin pode cancelar pedidos após esse prazo, registrando
--    responsável e motivo. restore_stock define se o estoque deve ser reposto.
--
-- 9. Cancelamentos que restauram estoque devem registrar CANCELLATION.
--
-- 10. Produtos com estoque igual a zero devem ser tratados pelo backend
--     como indisponíveis para novos pedidos.
--
-- 11. O backend deve impedir novos pedidos em atendimentos CLOSED/CANCELLED.
--
-- 12. Criação, alteração e cancelamento de pedidos devem usar transações
--     para manter pedido, estoque e histórico consistentes.
--
-- 13. Um pedido já CANCELLED não pode ser cancelado novamente.
--
-- 14. Faturamento diário/mensal deve ser calculado a partir de payments
--     com status PAID, evitando duplicação de dados.
--
-- 15. A fila print_jobs permite reprocessar impressões caso o ESP32 ou
--     impressora estejam temporariamente indisponíveis.
--
-- ============================================================
