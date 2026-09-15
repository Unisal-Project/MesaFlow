import {prisma} from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-errors.js";
import type { CreateAttendanceInput } from "./attendance.schema.js";

export async function findOpenAttendance(tableId: bigint) {
    return prisma.attendance.findFirst({
        where:{
            tableId, status:"OPEN"
        }
    })
    
}

export async function createAttendance(data: CreateAttendanceInput) {
    const tableId = BigInt(data.tableId);

    const table= await prisma.restaurantTable.findUnique({
        where:{id:tableId}
    })
    if(!table){
        throw new AppError("Mesa não encontrada",404);
    }
    const existingOpenAttendance = await findOpenAttendance(tableId); 

    if(existingOpenAttendance){
        throw new AppError("atendimento já aberto",409);
    }
    const attendance = await prisma.attendance.create({
        data: {
            tableId
        }
    })
    return attendance;
}

export async function findAttendanceTotal(attendanceId: bigint) {
    const total = await prisma.attendanceTotal.findUnique({
        where: { attendanceId }
    });
    if(!total){
        throw new AppError("Total do atendimento não encontrado",404);
    }
    return total;
}

export async function requestClosing(attendanceId: bigint) {
    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId }
    });

    if (!attendance) {
        throw new AppError("Atendimento não encontrado", 404);
    }

    if (attendance.status !== "OPEN") {
        throw new AppError("Apenas atendimentos abertos podem solicitar fechamento", 409);
    }
    const updatedAttendance = await prisma.$transaction(async(tx)=> {
        const update = await tx.attendance.update({
            where: { id: attendanceId },
            data: { status: "CLOSING_REQUESTED", closingRequestedAt: new Date() }
        });

        await tx.printJob.create({
            data:{attendanceId, type: "BILL"}
        });

        return update;
    });
    return updatedAttendance;
}

export async function findClosingRequestedAttendances() {
    return prisma.attendance.findMany({
        where: { status: "CLOSING_REQUESTED" },
        include: { table: {
            select: { id: true,number: true, name: true }
        }},
        orderBy: { closingRequestedAt: "asc" }
    });
}