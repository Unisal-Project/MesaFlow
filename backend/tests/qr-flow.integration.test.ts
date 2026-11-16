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
    try {
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
      await qr.requestClosing(token);
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
        null,
      );
      assert.equal(Number(paid.total), 20);
      assert.equal(
        (await tables.getTableById({ id: tableId })).status,
        "available",
      );
      assert.deepEqual((await qr.findBill(token)).items, []);
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
      await rm(uploadDirectory, { recursive: true, force: true });
      await db.$disconnect();
    }
  },
);
