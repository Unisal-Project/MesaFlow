import {prisma} from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-errors.js";
import type { CreateAttendanceInput } from "./attendance.schema.js";
import { attendanceRoutes } from "./attendance.routes.js";

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