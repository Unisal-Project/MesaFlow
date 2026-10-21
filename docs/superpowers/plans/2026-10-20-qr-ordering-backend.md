# QR Ordering Backend Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with tests first. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support public QR orders, customer-named orders, account requests, consolidated payment confirmation, and dashboard totals in the backend.

**Architecture:** Keep the existing `restaurant_tables`/`attendances` state model. Add a small QR-facing service that resolves a table token and creates or reuses its active attendance transactionally, while the existing order module remains the owner of order validation and persistence. Add an internal settlement service that records one full payment and closes an attendance atomically.

**Tech Stack:** TypeScript, Fastify, Zod, Prisma 7, MariaDB, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-20-qr-order-payment-mvp-design.md`

## Global Constraints

- Implement backend files only; do not change frontend files.
- Do not create a Git commit.
- QR token endpoints are public in this phase because the existing backend has no JWT route guards.
- The payment confirmation route is temporarily public/internal-by-convention; document its required JWT/role protection after implementation.
- A QR scan alone must not create an attendance.
- The first confirmed QR order atomically creates/reuses the sole active attendance for its table.
- New QR orders are accepted only while the attendance is `OPEN`.
- A payment confirmation records the full unpaid attendance total as one `PAID` payment and closes the attendance.
- Do not add payment-splitting, item allocation, acquirer, Pix, or frontend behavior.

---

## File structure

- `backend/prisma/schema.prisma`: adds `customerName` to orders and removes payment method storage.
- `mesaflow_schema_v1.sql`: makes new installations match the Prisma schema.
- `backend/prisma/sql/qr-ordering-payment.sql`: idempotent upgrade for existing databases.
- `backend/src/modules/orders/*`: carries the customer name through DTO, entity, repository and normal order responses.
- `backend/src/modules/tables/qr-order.service.ts`: owns public QR-token order/account-request orchestration.
- `backend/src/modules/tables/qr-order.controller.ts`: validates public QR request payloads and serializes responses.
- `backend/src/modules/tables/dto/qr-order.dto.ts`: validates name, notes and items submitted from the cardápio.
- `backend/src/modules/tables/table.routers.ts`: registers QR order and account-request endpoints before `/:id` routes.
- `backend/src/modules/payments/*`: owns total lookup, single-payment creation, payment confirmation and dashboard aggregation.
- `backend/tests/qr-ordering.test.ts`: service and HTTP contracts for QR ordering and account request.
- `backend/tests/payments.test.ts`: settlement and dashboard contracts.
- `docs/JWT-BACKEND-CHECKLIST.md`: post-MVP route-protection checklist.

## Tasks

### Task 1: Persist the customer name and neutral payment method

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `mesaflow_schema_v1.sql`
- Create: `backend/prisma/sql/qr-ordering-payment.sql`

**Interfaces:**
- Produces `Order.customerName: string | null` mapped to `customer_name`.
- Removes the unused payment method column from new and existing databases.

- [ ] Add `customerName String? @map("customer_name") @db.VarChar(100)` to `Order` and remove `Payment.method`.
- [ ] Add `customer_name VARCHAR(100) NULL` to the base `orders` table and omit a payment method column from the base `payments` table.
- [ ] Create an idempotent upgrade SQL file using `information_schema.COLUMNS` to add `orders.customer_name` only when absent and drop `payments.method` when present.
- [ ] Run `npm --prefix backend run prisma:generate` after the schema change.

### Task 2: Carry a customer name through orders without breaking existing internal orders

**Files:**
- Modify: `backend/src/modules/orders/dto/create-order.dto.ts`
- Modify: `backend/src/modules/orders/entity/orders.entity.ts`
- Modify: `backend/src/modules/orders/repositories/order.repository.ts`
- Modify: `backend/src/modules/orders/repositories/prisma-order.repository.ts`
- Test: `backend/tests/qr-ordering.test.ts`

**Interfaces:**
- Existing `POST /orders` accepts optional `customerName?: string`.
- `CreateOrderData` accepts `customerName?: string`.
- `OrderEntity` exposes `customerName: string | null`.

- [ ] Write a failing repository test asserting that `customerName: 'Ana'` is stored and returned with an order.
- [ ] Run `node --import tsx --test backend/tests/qr-ordering.test.ts`; expect the missing property assertion to fail.
- [ ] Add only the optional field and map it in Prisma create/read conversion.
- [ ] Re-run the test; expect pass.

### Task 3: Create/reuse an active attendance safely for a public QR order

**Files:**
- Create: `backend/src/modules/tables/qr-order.service.ts`
- Create: `backend/src/modules/tables/dto/qr-order.dto.ts`
- Test: `backend/tests/qr-ordering.test.ts`

**Interfaces:**
- `QrOrderService.submit(token, data)` returns `{ attendanceId: string, order: OrderWithItems }`.
- Input is `{ customerName: string; notes?: string; items: Array<{ productId: string; quantity: number; notes?: string }> }`.

- [ ] Write a failing service test with an in-memory Prisma-shaped transaction double: an active table and no active attendance must result in one `OPEN` attendance and one customer-named order.
- [ ] Run the test and verify it fails because `QrOrderService` does not exist.
- [ ] Implement the minimal transactional service: lock `restaurant_tables`, reject missing/inactive token with 404, find the active attendance in `OPEN`, create one only when absent, validate active/available products, snapshot prices and create the order/items.
- [ ] Re-run the service test; expect pass.
- [ ] Add failing tests for inactive token (404), closing-requested attendance (409), unavailable product (409), and a reused `OPEN` attendance; implement each smallest guard and rerun.

### Task 4: Expose public QR order and account-request routes

**Files:**
- Create: `backend/src/modules/tables/qr-order.controller.ts`
- Modify: `backend/src/modules/tables/table.routers.ts`
- Test: `backend/tests/qr-ordering.test.ts`

**Interfaces:**
- `POST /tables/by-token/:token/orders` accepts `customerName`, optional `notes`, and nonempty `items`.
- `POST /tables/by-token/:token/request-closing` moves only an `OPEN` attendance to `CLOSING_REQUESTED`, sets `closingRequestedAt`, and creates one `BILL` print job.

- [ ] Write failing Fastify-inject tests for a 201 QR order response containing serializable IDs and `customerName`, a 400 malformed payload, and a 409 order after account request.
- [ ] Run the tests and verify registration/handler failures.
- [ ] Add controller schemas/routes and route ordering so `by-token` wins over dynamic table ID paths.
- [ ] Add `QrOrderService.requestClosing(token)`, using one transaction to update `OPEN` to `CLOSING_REQUESTED` and create the `BILL` job.
- [ ] Re-run the HTTP tests; expect pass.

### Task 5: Confirm one consolidated payment and close the attendance

**Files:**
- Create: `backend/src/modules/payments/payment.service.ts`
- Create: `backend/src/modules/payments/payment.controller.ts`
- Create: `backend/src/modules/payments/payment.routes.ts`
- Create: `backend/src/modules/payments/dto/confirm-attendance-payment.dto.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/tests/payments.test.ts`

**Interfaces:**
- `POST /attendances/:attendanceId/confirm-payment` returns `{ attendanceId, amount, status: 'PAID', paidAt }`.
- It accepts no amount: the server derives the amount from `vw_attendance_totals`.

- [ ] Write a failing service test where a `CLOSING_REQUESTED` attendance has total `180.00`; confirmation must create `{ attendanceId, amount: '180.00', method: 'NOT_INFORMED', status: 'PAID', paidAt }` and set attendance to `CLOSED` with `closedAt`.
- [ ] Run the test and verify `PaymentService` is missing.
- [ ] Implement one transaction: lock the attendance, require `CLOSING_REQUESTED`, read `attendanceTotal`, reject zero total with 409, create the payment without payment method, update to `CLOSED`, and return decimal values as strings.
- [ ] Add failing tests for missing attendance (404), `OPEN` attendance (409), and duplicate confirmation (409); add exact guards and rerun.
- [ ] Add a controller/route with Zod ID validation and register it from `server.ts`; write and pass a Fastify HTTP contract test.

### Task 6: Add minimal dashboard aggregation

**Files:**
- Modify: `backend/src/modules/payments/payment.service.ts`
- Modify: `backend/src/modules/payments/payment.controller.ts`
- Modify: `backend/src/modules/payments/payment.routes.ts`
- Test: `backend/tests/payments.test.ts`

**Interfaces:**
- `GET /dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` returns `{ revenue: string, paidAttendances: number, averageTicket: string, occupiedTables: number, closingRequestedTables: number }`.

- [ ] Write a failing test with two paid records totaling `300.00`, two paid attendances, three occupied tables and one closing request; expect revenue `300.00` and average ticket `150.00`.
- [ ] Run the test and verify it fails due to the absent summary operation.
- [ ] Implement a single service method using Prisma aggregates/counts and format monetary values as fixed decimal strings; default the date range to the current calendar day when query fields are absent.
- [ ] Add query validation and route registration, then rerun the test.

### Task 7: Document the deferred JWT protection

**Files:**
- Create: `docs/JWT-BACKEND-CHECKLIST.md`

- [ ] Record the routes that must become protected: table CRUD/status, attendance management, internal order listing/creation, payment confirmation, dashboard summary and static operational views.
- [ ] Record the routes that remain public: QR token lookup, QR order submission, QR account request and product/menu reads needed by the cardápio.
- [ ] Specify the required implementation sequence: login/refresh, Fastify `authenticate` hook, staff roles, route-level guards, audit actor (`createdById`/`closedById`), 401/403 tests, and rate limits for QR endpoints.

### Task 8: Generate client and verify backend contracts

**Files:**
- Modify: generated Prisma client only through `prisma generate`
- Test: `backend/tests/tables.test.ts`, `backend/tests/attendance.test.ts`, `backend/tests/qr-ordering.test.ts`, `backend/tests/payments.test.ts`

- [ ] Run `npm --prefix backend run prisma:generate`.
- [ ] Run `node --import tsx --test backend/tests/tables.test.ts backend/tests/attendance.test.ts backend/tests/qr-ordering.test.ts backend/tests/payments.test.ts`.
- [ ] Run `npm --prefix backend run build`.
- [ ] Run `git diff --check` and `git status --short`; do not commit.
