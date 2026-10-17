import { OrderService } from "./order.service.js";
import { PrismaOrderRepository } from "./repositories/prisma-order.repository.js";
import { PrismaAttendanceRepository } from "../attendance/repositories/prisma-attendance.repository.js";
import { PrismaProductRepository } from "../products/repositories/prisma-products.repository.js";

export function makeOrderService(): OrderService {

    const orderRepository = new PrismaOrderRepository();

    const attendanceRepository = new PrismaAttendanceRepository();

    const productRepository = new PrismaProductRepository();

    return new OrderService(
        orderRepository,
        attendanceRepository,
        productRepository
    );
}