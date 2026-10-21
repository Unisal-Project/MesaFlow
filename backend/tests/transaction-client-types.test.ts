import type { PrismaConnector } from "../src/database/prisma.js";
import { PrismaPaymentRepository } from "../src/modules/payments/repositories/prisma-payment.repository.js";
import { QrOrderService } from "../src/modules/tables/qr-order.service.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;

type Assert<Value extends true> = Value;

type QrOrderClientIsTyped = Assert<
  Equal<
    NonNullable<ConstructorParameters<typeof QrOrderService>[0]>,
    typeof PrismaConnector
  >
>;

type PaymentClientIsTyped = Assert<
  Equal<
    NonNullable<ConstructorParameters<typeof PrismaPaymentRepository>[0]>,
    typeof PrismaConnector
  >
>;
