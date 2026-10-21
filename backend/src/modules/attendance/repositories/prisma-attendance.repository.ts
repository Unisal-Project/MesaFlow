import { PrismaConnector } from "../../../database/prisma.js";
import type { Attendance } from "../../../generated/prisma/client.js";

import { AttendanceEntity } from "../entity/attendance.entity.js";
import type { AttendanceRepository } from "./attendance.repository.js";

import type { AttendanceStatus } from "../entity/attendance.entity.js";
import type { AttendanceTotal } from "../entity/attendance-total.entity.js";
import type { AttendanceListItem } from "../types/ttendance-list-item.type.js";

export class PrismaAttendanceRepository implements AttendanceRepository {
  constructor(
    private readonly prismaClient: typeof PrismaConnector = PrismaConnector,
  ) {}

  async findById(id: bigint): Promise<AttendanceEntity | null> {
    const attendance = await this.prismaClient.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      return null;
    }

    return this.toEntity(attendance);
  }

  async findOpenByTableId(tableId: bigint): Promise<AttendanceEntity | null> {
    const attendance = await this.prismaClient.attendance.findFirst({
      where: {
        tableId,
        status: "OPEN",
      },
    });

    if (!attendance) {
      return null;
    }

    return this.toEntity(attendance);
  }

  async create(tableId: bigint): Promise<AttendanceEntity> {
    const attendance = await this.prismaClient.attendance.create({
      data: {
        tableId,
      },
    });

    return this.toEntity(attendance);
  }

  async findTotalByAttendanceId(
    attendanceId: bigint,
  ): Promise<AttendanceTotal | null> {
    const total = await this.prismaClient.attendanceTotal.findUnique({
      where: { attendanceId },
    });

    if (!total) {
      return null;
    }

    return {
      attendanceId: total.attendanceId,
      tableId: total.tableId,
      status: total.status,
      total: total.total.toString(),
    };
  }

  async requestClosing(
    attendanceId: bigint,
    requestedAt: Date,
  ): Promise<AttendanceEntity> {
    const attendance = await this.prismaClient.$transaction(async (tx) => {
      const updatedAttendance = await tx.attendance.update({
        where: {
          id: attendanceId,
        },
        data: {
          status: "CLOSING_REQUESTED",
          closingRequestedAt: requestedAt,
        },
      });

      await tx.printJob.create({
        data: {
          attendanceId,
          type: "BILL",
        },
      });

      return updatedAttendance;
    });

    return this.toEntity(attendance);
  }

  async requestCancelled(attendanceId: bigint): Promise<AttendanceEntity> {
    const attendance = await this.prismaClient.attendance.update({
      where: {
        id: attendanceId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    return this.toEntity(attendance);
  }

  async findAllByStatus(
    status: AttendanceStatus,
  ): Promise<AttendanceListItem[]> {
    const attendances = await this.prismaClient.attendance.findMany({
      where: {
        status,
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            name: true,
          },
        },
      },
      orderBy: {
        closingRequestedAt: "asc",
      },
    });

    return attendances.map((attendance) => this.toListItem(attendance));
  }

  private toListItem(
    attendance: Attendance & { table: AttendanceListItem["table"] },
  ): AttendanceListItem {
    return {
      ...this.toEntity(attendance),
      activeTableId: attendance.activeTableId,
      table: {
        id: attendance.table.id,
        number: attendance.table.number,
        name: attendance.table.name,
      },
    };
  }

  private toEntity(attendance: Attendance): AttendanceEntity {
    return new AttendanceEntity(
      attendance.id,
      attendance.tableId,
      attendance.status,
      attendance.openedAt,
      attendance.closingRequestedAt,
      attendance.closedAt,
      attendance.closedById,
      attendance.createdAt,
      attendance.updatedAt,
    );
  }
}
