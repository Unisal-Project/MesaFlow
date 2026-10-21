import { AppError } from "../../shared/errors/app-errors.js";

import type { CreateOrderDTO } from "./dto/create-order.dto.js";
import type { OrderRepository } from "./repositories/order.repository.js";
import type { AttendanceRepository } from "../attendance/repositories/attendance.repository.js";
import type { ProductRepository } from "./repositories/product.repository.js";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async createOrder(data: CreateOrderDTO) {
    // Validar atendimento
    const attendance = await this.attendanceRepository.findById(
      BigInt(data.attendanceId),
    );

    if (!attendance) {
      throw new AppError("Atendimento não encontrado.", 404);
    }
    if (!attendance.canReceiveOrders()) {
      throw new AppError("Atendimento não está aberto para pedidos.", 409);
    }

    // Buscar produtos disponíveis
    const productIds = data.items.map((item) => {
      return BigInt(item.productId);
    });

    const products =
      await this.productRepository.findAvailableByIds(productIds);

    // Montar itens
    const orderItems = data.items.map((item) => {
      const product = products.find(
        (product) => product.id === BigInt(item.productId),
      );

      if (!product) {
        throw new AppError("Produto não encontrado ou indisponível.", 409);
      }

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        notes: item.notes,
      };
    });

    // Criar pedido pelo OrderRepository
    return this.orderRepository.create({
      attendanceId: attendance.id,
      customerName: data.customerName,
      notes: data.notes,
      items: orderItems,
    });
  }

  async findOrdersByAttendanceId(attendanceId: bigint) {
    // Validar atendimento
    const attendance = await this.attendanceRepository.findById(attendanceId);

    if (!attendance) {
      throw new AppError("Atendimento não encontrado.", 404);
    }

    // Buscar pedidos pelo OrderRepository
    return this.orderRepository.findByAttendanceId(attendanceId);
  }
}
