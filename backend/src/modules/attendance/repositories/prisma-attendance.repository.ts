import { prisma } from "../../../database/prisma.js";
import type { Attendance } from "../../../generated/prisma/client.js";

import { AttendanceEntity } from "../entity/attendance.entity.js";
import type { AttendanceRepository } from "./attendance.repository.js";

import type { AttendanceStatus } from "../entity/attendance.entity.js";
import type { AttendanceTotal } from "../entity/attendance-total.entity.js";
import type { AttendanceListItem } from "../types/ttendance-list-item.type.js";

export class PrismaAttendanceRepository implements AttendanceRepository{
    async findById(id: bigint): Promise<AttendanceEntity | null> {
        const attendance = await prisma.attendance.findUnique({
            where:{id},
        });

        if (!attendance) {
            return null;
        }

        return this.toEntity(attendance);
    }

    async findOpenByTableId(tableId: bigint): Promise<AttendanceEntity | null> {
        const attendance = await prisma.attendance.findFirst({
            where: {
                tableId,
                status: "OPEN",
            },
        });

        if (!attendance){
            return null;
        }

        return this.toEntity(attendance);
    }

    async create(tableId: bigint): Promise<AttendanceEntity> {
        const attendance = await prisma.attendance.create({
            data: {
                tableId,
            },
        });

        return this.toEntity(attendance);
    }

    async findTotalByAttendanceId(attendanceId: bigint): Promise<AttendanceTotal | null> {
        const total = await prisma.attendanceTotal.findUnique({
            where: { attendanceId }
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

    async requestClosing(attendanceId: bigint, requestedAt: Date): Promise<AttendanceEntity> {

        const attendance = await prisma.$transaction(async (tx) => {

            const updatedAttendance = await tx.attendance.update({
                where: {
                    id: attendanceId
                },
                data: {
                    status: "CLOSING_REQUESTED",
                    closingRequestedAt: requestedAt
                }
            });

            await tx.printJob.create({
                data: {
                    attendanceId,
                    type: "BILL"
                }
            });

            return updatedAttendance;
        });

        return this.toEntity(attendance);
    }

    async requestCancelled(attendanceId: bigint): Promise<AttendanceEntity> {
        
        const attendance = await prisma.attendance.update({
            where: {
                id: attendanceId,
            },
            data: {
                status: "CANCELLED",
            }
        });

        return this.toEntity(attendance);
    }

    async findAllByStatus(status: AttendanceStatus): Promise<AttendanceListItem[]> {

        return prisma.attendance.findMany({
            where: {
                status
            },
            include: {
                table: {
                    select: {
                        id: true,
                        number: true,
                        name: true
                    }
                }
            },
            orderBy: {
                closingRequestedAt: "asc"
            }
        });
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
            attendance.updatedAt
        );
    }
}
