import { AttendanceService } from "./attendance.service.js";
import { PrismaAttendanceRepository } from "./repositories/prisma-attendance.repository.js";
import { PrismaTableRepository } from "../tables/repositories/prisma-table.repository.js";

export function makeAttendanceService(): AttendanceService{
    const attendanceRepository = new PrismaAttendanceRepository;

    const tableRepository= new PrismaTableRepository;

    return new AttendanceService(
        attendanceRepository, tableRepository
    );
}