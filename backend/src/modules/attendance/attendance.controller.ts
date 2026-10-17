import { createAttendanceSchema } from "./dto/create-attendance.dto.js";
import { findOpenAttendanceSchema } from "./dto/find-open-attendance.dto.js";
import { attendanceIdParamSchema } from "./dto/attendance-id-param.dto.js";

import { makeAttendanceService } from "./attendance.factory.js"; 

import { serializeBigInt } from "../../shared/utils/serialize-bigint.js";

import type { FastifyRequest, FastifyReply } from "fastify";

const attendanceService = makeAttendanceService();

export async function createAttendanceController(
    request: FastifyRequest, 
    reply: FastifyReply
) {
    const data = createAttendanceSchema.parse(request.body);

    const attendance = await attendanceService.createAttendance(data);

    return reply.status(201).send(serializeBigInt(attendance));
}

export async function findOpenAttendanceController(
    request: FastifyRequest, 
    reply: FastifyReply
) {
    
    const {tableId} = findOpenAttendanceSchema.parse(request.params);

    const attendance = await attendanceService.findOpenAttendance(BigInt(tableId));

    return reply.status(200).send(serializeBigInt(attendance));
    
}

export async function findAttendanceTotalController(
    request: FastifyRequest, 
    reply: FastifyReply
) {
    const {attendanceId}= attendanceIdParamSchema.parse(request.params);

    const total = await attendanceService.findAttendanceTotal(BigInt(attendanceId));

    return reply.status(200).send(serializeBigInt(total));
}

export async function requestClosingController(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const {attendanceId}= attendanceIdParamSchema.parse(request.params);

    const attendance = await attendanceService.requestClosing(BigInt(attendanceId));

    return reply.status(200).send(serializeBigInt(attendance));
}

export async function findClosingRequestedAttendancesController(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const attendances = await attendanceService.findClosingRequestedAttendances();

    return reply.status(200).send(serializeBigInt(attendances));
}

export async function requestCancelledController(
    request: FastifyRequest, 
    reply: FastifyReply
) {
    const {attendanceId}= attendanceIdParamSchema.parse(request.params);

    const attendance = await attendanceService.requestCancelled(BigInt(attendanceId));

    return reply.status(200).send(serializeBigInt(attendance));
}

export async function findCancelledAttendancesController(
    request: FastifyRequest, 
    reply: FastifyReply
) {
    const attendances = await attendanceService.findCancelledAttendances();

    return reply.status(200).send(serializeBigInt(attendances));
}
