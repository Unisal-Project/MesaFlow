import { AttendanceService } from "./attendance.service.js";
import { PrismaAttendanceRepository } from "./repository/prisma-attendance.repository.js";
import { PrismaTableRepository } from "./repository/prisma-attendance.repository.js";

export function makeAttendanceService(): AttendanceService{
    const attendanceRepository = new PrismaAttendanceRepository;

    const tableRepository= new PrismaTableRepository;

    return new AttendanceService(
        attendanceRepository, tableRepository
    );
}