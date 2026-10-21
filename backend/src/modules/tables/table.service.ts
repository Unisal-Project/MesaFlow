import { randomUUID } from "node:crypto";
import QRCode from "qrcode";

import { AppError } from "../../shared/errors/app-errors.js";

import type { CreateTableDTO } from "./dto/create-table.dto.js";
import type { TableStatusChange } from "./enity/table-status.js";
import type { TableIdDTO } from "./dto/table-id.dto.js";
import type { UpdateTableDTO } from "./dto/update-table.dto.js";

import type { TableRepository } from "./repositories/table.repository.js";
import type { TableWithAttendance } from "./repositories/table-with-attendance.repository.js";

import { resolveTableStatus } from "./utils/resolve-table-status.js";

export class TableService {
  constructor(
    private readonly tableRepository: TableRepository,
    private readonly frontendUrl: string,
  ) {}

  private present({ table, attendance }: TableWithAttendance) {
    const url = new URL("/cardapio", this.frontendUrl);

    url.searchParams.set("mesa", table.qrToken);

    const status = resolveTableStatus(attendance);

    return {
      id: table.id.toString(),
      number: table.number,
      name: table.name,
      active: table.active,
      menuUrl: url.toString(),
      status,
      attendanceId: attendance?.id.toString() ?? null,
    };
  }

  async createTable(data: CreateTableDTO) {
    const table = await this.tableRepository.create({
      number: data.number,
      name: data.name,
      active: data.active,
      qrToken: randomUUID(),
    });

    return this.present({ table, attendance: null });
  }

  async getTableById({ id }: TableIdDTO) {
    const table = await this.tableRepository.findByIdWithAttendance(id);

    if (!table) {
      throw new AppError("Mesa não encontrada", 404);
    }

    return this.present(table);
  }

  async getAllTables() {
    const tables = await this.tableRepository.findAllWithAttendance();

    return tables.map((table) => this.present(table));
  }

  async deleteTable({ id }: TableIdDTO) {
    const table = await this.tableRepository.delete(id);

    return this.present({ table, attendance: null });
  }

  async editTable({ id }: TableIdDTO, data: UpdateTableDTO) {
    const updated = await this.tableRepository.updateWithAttendanceCheck(
      id,
      data,
    );

    return this.present(updated);
  }

  async changeStatus({ id }: TableIdDTO, change: TableStatusChange) {
    const result = await this.tableRepository.changeStatusTransaction(
      id,
      change,
    );

    return this.present(result);
  }

  async getTableByToken(token: string) {
    const table = await this.tableRepository.findByToken(token);

    if (!table || !table.active) {
      throw new AppError("QR Code inválido ou mesa indisponível", 404);
    }

    return {
      id: table.id.toString(),
      number: table.number,
      name: table.name,
    };
  }

  async getQrCode(id: TableIdDTO) {
    const table = await this.getTableById(id);

    return QRCode.toBuffer(table.menuUrl, {
      type: "png",
      width: 512,
      margin: 4,
      errorCorrectionLevel: "M",
    });
  }
}
