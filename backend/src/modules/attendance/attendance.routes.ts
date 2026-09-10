import type { FastifyInstance } from "fastify";
import { createAttendanceController, findOpenAttendanceController, findAttendanceTotalController } from "./attendance.controller.js";

export async function attendanceRoutes(app: FastifyInstance){
   app.post("/attendances", createAttendanceController);
   app.get("/attendances/open", findOpenAttendanceController);
   app.get("/attendances/:attendanceId/total", findAttendanceTotalController);
}
