import { AppError } from "../../shared/errors/app-errors.js";

import type { AttendanceRepository } from "./repository/attendance.repository.js";
import type { TableRepository } from "../tables/repository/table.repository.js";

import type { CreateAttendanceDTO } from "./dto/create-attendance.dto.js";

export class AttendanceService{
    constructor(
        private readonly attendanceRepository: AttendanceRepository,
        private readonly tableRepository: TableRepository,
    ) {}

    async findOpenAttendance(tableId: bigint) {
        const attendance = await this.attendanceRepository.findOpenByTableId(tableId);
        
        if (!attendance){
            throw new AppError("nenhum atendimento aberto nessa mesa", 404);
        }
    
        return attendance;
    }

    async createAttendance(data: CreateAttendanceDTO) {
        const tableId = BigInt(data.tableId);
    
        const tableExists= await this.tableRepository.existsById(tableId);
    
        if(!tableExists){
            throw new AppError("Mesa não encontrada",404);
        }
    
        const existingOpenAttendance = await this.attendanceRepository.findOpenByTableId(tableId);
        
        if(existingOpenAttendance){
            throw new AppError("atendimento já aberto",409);
        }
        
        const attendance = await this.attendanceRepository.create(tableId);

        return attendance;
    }

    async findAttendanceTotal(attendanceId: bigint) {
        const total = await this.attendanceRepository.findTotalByAttendanceId(attendanceId)
    
        if(!total){
            throw new AppError("Total do atendimento não encontrado",404);
        }
    
        return total;
    }
    
    async requestClosing(attendanceId: bigint) {
        const attendance = await this.attendanceRepository.findById(attendanceId);
    
        if (!attendance) {
            throw new AppError("Atendimento não encontrado", 404);
        }
    
        if (!attendance.canRequestClosing()) {
            throw new AppError("Apenas atendimentos abertos podem solicitar fechamento", 409);
        }
    
        const requestedAt = new Date();
    
        return this.attendanceRepository.requestClosing(attendanceId, requestedAt);
    }

    async requestCancelled(attendanceId: bigint) {
        const attendance = await this.attendanceRepository.findById(attendanceId);
    
        if (!attendance) {
            throw new AppError("Atendimento não encontrado", 404);
        }
    
        if (!attendance.canRequestCancellation()) {
            throw new AppError("Apenas atendimentos abertos podem solicitar cancelamento", 409);
        }
    
        return this.attendanceRepository.requestCancelled(attendanceId);
    }

    async findClosingRequestedAttendances() {
        return this.attendanceRepository.findAllByStatus("CLOSING_REQUESTED");
    }
    
    async findCancelledAttendances() {
        return this.attendanceRepository.findAllByStatus("CANCELLED");
    }
}

