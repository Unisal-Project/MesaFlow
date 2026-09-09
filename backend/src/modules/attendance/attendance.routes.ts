import type { FastifyInstance } from "fastify";
import { createAttendanceController, findOpenAttendanceController } from "./Attendance.controller.js";

export async function attendanceRoutes(app: FastifyInstance){
   app.post("/attendances", createAttendanceController);
    app.get("/attendances/open", findOpenAttendanceController);
}