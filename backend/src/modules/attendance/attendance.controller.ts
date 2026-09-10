import {createAttendanceSchema, findOpenAttendanceSchema, findAttendanceTotalSchema} from "./attendance.schema.js";
import { createAttendance, findOpenAttendance, findAttendanceTotal } from "./attendance.service.js";
import { AppError } from "../../shared/errors/app-errors.js";
import { FastifyRequest, FastifyReply } from "fastify";



export async function createAttendanceController(request: FastifyRequest, reply: FastifyReply) {
    const data = createAttendanceSchema.parse(request.body);
    const attendance = await createAttendance(data);
    return reply.status(201).send(serializeBigInt(attendance));
}

export async function findOpenAttendanceController(request: FastifyRequest, reply: FastifyReply) {
    const {tableId}= findOpenAttendanceSchema.parse(request.query);
    const attendance = await findOpenAttendance(BigInt(tableId));

    if(!attendance){
        throw new AppError ("nenhum atendimento aberto nessa mesa", 404);
    }

    return reply.status(200).send(serializeBigInt(attendance));
    
}
function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function findAttendanceTotalController(request: FastifyRequest, reply: FastifyReply) {
    const {attendanceId}= findAttendanceTotalSchema.parse(request.params);
    const total = await findAttendanceTotal(BigInt(attendanceId));

    return reply.status(200).send(serializeBigInt(total));
}

