import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test(
  "QR flow: product image, table, consumption, print queue and payment",
  {
    skip: process.env.RUN_TABLES_DB_TESTS !== "1",
  },
  async () => {
    const { PrismaConnector: db } = await import("../src/database/prisma.js");
    const { TableService } =
      await import("../src/modules/tables/table.service.js");
    const { PrismaTableRepository } =
      await import("../src/modules/tables/repositories/prisma-table.repository.js");
    const { QrOrderService } =
      await import("../src/modules/tables/qr-order.service.js");
    const { PrismaPaymentRepository } =
      await import("../src/modules/payments/repositories/prisma-payment.repository.js");
    const { PrismaProductRepository } =
      await import("../src/modules/products/repositories/prisma-products.repository.js");
    const { default: ProductService } =
      await import("../src/modules/products/products.service.js");
    const { LocalStorageService } =
      await import("../src/shared/storage/local-storage.service.js");
    const { readPaymentConfirmation } =
      await import("../src/modules/payments/payment-confirmation.js");
    const sharp = (await import("sharp")).default;
    const uploadDirectory = await mkdtemp(
      path.join(tmpdir(), "mesaflow-flow-"),
    );
    const catalog = new ProductService(
      new PrismaProductRepository(db),
      new LocalStorageService(uploadDirectory),
    );
    const tables = new TableService(
      new PrismaTableRepository(db),
      "http://localhost:5173",
    );
    const qr = new QrOrderService(db);
    let categoryId: bigint | undefined;
    let productId: bigint | undefined;
    let tableId: bigint | undefined;
    let employeeId: bigint | undefined;
    try {
      const employee = await db.user.create({
        data: {
          name: "Funcionário Teste QR",
          email: `qr-test-${randomUUID()}@example.com`,
          passwordHash: "test-only-not-a-real-password-hash",
          role: "EMPLOYEE",
        },
      });

      employeeId = employee.id;
      const category = await db.category.create({
        data: { name: `QR test ${randomUUID()}` },
      });
      categoryId = category.id;
      let product = await catalog.createProduct({
        name: "Produto de teste QR",
        categoryId,
        price: 10,
        stockQuantity: 5,
        trackStock: true,
        featured: false,
        available: true,
        active: true,
      });
      productId = product.id;
      product = await catalog.uploadProductImage(product.id, {
        buffer: await sharp({
          create: { width: 4, height: 4, channels: 3, background: "red" },
        })
          .png()
          .toBuffer(),
        originalName: "produto.png",
        mimeType: "image/png",
      });
      assert.match(product.imageUrl!, /^\/uploads\/products\/.+\.webp$/);
      assert.equal(
        (await catalog.getAllProducts()).find((item) => item.id === productId)
          ?.imageUrl,
        product.imageUrl,
      );
      const table = await tables.createTable({
        number: randomInt(1_000_000_000, 2_000_000_000),
        name: "Teste QR",
        seats: 4,
        active: true,
      });
      tableId = BigInt(table.id);
      const token = new URL(table.menuUrl).searchParams.get("mesa")!;
      assert.equal((await tables.getTableByToken(token)).id, table.id);
      const created = await qr.submit(token, {
        customerName: "Teste automatizado",
        items: [{ productId: productId.toString(), quantity: 2 }],
      });
      const attendanceId = BigInt(created.attendanceId);
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: productId } }))
          .stockQuantity,
        3,
      );
      assert.equal(
        await db.printJob.count({
          where: { orderId: BigInt(created.order.id), type: "ORDER" },
        }),
        1,
      );
      const bill = await qr.findBill(token);
      assert.equal(bill.items.length, 1);
      assert.equal(bill.items[0].quantity, 2);
      assert.equal(Number(bill.items[0].unitPrice), 10);
      assert.equal("orders" in bill, false);
      assert.deepEqual(await readPaymentConfirmation(attendanceId), {
        status: "pending",
      });
      await qr.requestClosing(token, created.attendanceId);
      assert.deepEqual(await readPaymentConfirmation(attendanceId), {
        status: "pending",
      });
      await assert.rejects(
        qr.submit(token, {
          customerName: "Teste",
          items: [{ productId: productId.toString(), quantity: 1 }],
        }),
        { statusCode: 409 },
      );
      await tables.changeStatus(
        { id: tableId },
        { attendanceId, status: "awaiting_payment" },
      );
      await assert.rejects(
        tables.changeStatus(
          { id: tableId },
          { attendanceId, status: "available" },
        ),
        { statusCode: 409 },
      );
      const paid = await new PrismaPaymentRepository(db).closeWithPayments(
        attendanceId,
        { serviceFeeWaived: true, payments: [{ method: "PIX", amount: 20 }] },
        employee.id,
      );
      assert.equal(Number(paid.total), 20);
      const confirmation = await readPaymentConfirmation(attendanceId);
      assert.equal(confirmation.status, "confirmed");
      assert.equal(confirmation.event?.attendanceId, created.attendanceId);
      assert.equal(confirmation.event?.receipt.totalInCents, 2000);
      assert.equal(
        confirmation.event?.receipt.tableNumber,
        String(table.number),
      );
      const closedAttendance = await db.attendance.findUniqueOrThrow({
        where: { id: attendanceId },
      });

      assert.equal(closedAttendance.status, "CLOSED");
      assert.equal(closedAttendance.closedById, employee.id);

      const payments = await db.payment.findMany({
        where: { attendanceId },
      });

      assert.equal(payments.length, 1);
      assert.equal(payments[0].status, "PAID");
      assert.equal(payments[0].createdById, employee.id);
      assert.equal(
        (await tables.getTableById({ id: tableId })).status,
        "available",
      );
      assert.deepEqual((await qr.findBill(token)).items, []);

      // MF-27: reutilizar a mesa após o fechamento.
      const tableAfterClosing = await tables.getTableByToken(token);

      assert.equal(tableAfterClosing.id, table.id);

      const productBeforeSecondOrder = await db.product.findUniqueOrThrow({
        where: { id: productId },
        select: {
          id: true,
          active: true,
          available: true,
          stockQuantity: true,
        },
      });

      assert.equal(productBeforeSecondOrder.active, true);
      assert.equal(productBeforeSecondOrder.available, true);
      assert.equal(productBeforeSecondOrder.stockQuantity, 3);

      // Cliente B utiliza o mesmo QR Code.
      const secondOrder = await qr.submit(token, {
        customerName: "Cliente B",
        items: [
          {
            productId: productId.toString(),
            quantity: 1,
          },
        ],
      });

      const secondAttendanceId = BigInt(secondOrder.attendanceId);

      // O novo atendimento deve ser diferente do anterior.
      assert.notEqual(secondAttendanceId, attendanceId);
      assert.equal(secondOrder.order.attendanceId, secondOrder.attendanceId);

      // A nova conta deve conter somente o pedido do Cliente B.
      const secondBill = await qr.findBill(token);

      assert.equal(secondBill.attendanceId, secondOrder.attendanceId);
      assert.equal(secondBill.items.length, 1);
      assert.equal(secondBill.items[0].quantity, 1);

      // O primeiro atendimento continua encerrado.
      const previousAttendance = await db.attendance.findUniqueOrThrow({
        where: { id: attendanceId },
      });

      assert.equal(previousAttendance.status, "CLOSED");
      assert.equal(previousAttendance.closedById, employee.id);

      // Os pedidos dos dois clientes permanecem separados.
      const firstOrders = await db.order.findMany({
        where: { attendanceId },
      });

      const secondOrders = await db.order.findMany({
        where: { attendanceId: secondAttendanceId },
      });

      assert.equal(firstOrders.length, 1);
      assert.equal(secondOrders.length, 1);
      assert.equal(firstOrders[0].customerName, "Teste automatizado");
      assert.equal(secondOrders[0].customerName, "Cliente B");

      // O primeiro pagamento permanece vinculado à conta anterior.
      const previousPayments = await db.payment.findMany({
        where: { attendanceId },
      });

      assert.equal(previousPayments.length, 1);
      assert.equal(previousPayments[0].status, "PAID");

      // O segundo atendimento permanece aberto e ainda não possui pagamentos.
      const currentAttendance = await db.attendance.findUniqueOrThrow({
        where: { id: secondAttendanceId },
      });

      assert.equal(currentAttendance.status, "OPEN");
      assert.equal(
        await db.payment.count({
          where: { attendanceId: secondAttendanceId },
        }),
        0,
      );

      assert.deepEqual(
        await readPaymentConfirmation(attendanceId),
        confirmation,
      );
      assert.deepEqual(await readPaymentConfirmation(secondAttendanceId), {
        status: "pending",
      });
      await assert.rejects(qr.requestClosing(token, created.attendanceId), {
        statusCode: 409,
      });

      const paymentRepository = new PrismaPaymentRepository(db);
      await paymentRepository.reopen(
        (
          await paymentRepository.closeWithPayments(
            secondAttendanceId,
            {
              serviceFeeWaived: true,
              payments: [{ method: "PIX", amount: 10 }],
            },
            employee.id,
          )
        ).attendanceId,
      );
      assert.deepEqual(await readPaymentConfirmation(secondAttendanceId), {
        status: "pending",
      });

      await db.attendance.update({
        where: { id: secondAttendanceId },
        data: { status: "CANCELLED" },
      });
      assert.deepEqual(await readPaymentConfirmation(secondAttendanceId), {
        status: "unavailable",
      });

      await catalog.deleteProduct(productId);

      assert.equal(
        (await catalog.getAllProducts()).some((item) => item.id === productId),
        false,
      );
    } finally {
      if (tableId) {
        const attendanceIds = (
          await db.attendance.findMany({
            where: { tableId },
            select: { id: true },
          })
        ).map((item) => item.id);
        const orderIds = (
          await db.order.findMany({
            where: { attendanceId: { in: attendanceIds } },
            select: { id: true },
          })
        ).map((item) => item.id);
        await db.printJob.deleteMany({
          where: {
            OR: [
              { attendanceId: { in: attendanceIds } },
              { orderId: { in: orderIds } },
            ],
          },
        });
        await db.stockMovement.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await db.payment.deleteMany({
          where: { attendanceId: { in: attendanceIds } },
        });
        await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await db.order.deleteMany({ where: { id: { in: orderIds } } });
        await db.attendance.deleteMany({ where: { tableId } });
        await db.restaurantTable.delete({ where: { id: tableId } });
      }
      if (productId) await db.product.delete({ where: { id: productId } });
      if (categoryId) await db.category.delete({ where: { id: categoryId } });

      if (employeeId) {
        await db.user.delete({
          where: { id: employeeId },
        });
      }

      await rm(uploadDirectory, { recursive: true, force: true });
      await db.$disconnect();
    }
  },
);
