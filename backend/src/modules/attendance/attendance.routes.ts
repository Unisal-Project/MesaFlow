import type { FastifyInstance } from "fastify";
import { createAttendanceController, findOpenAttendanceController, findAttendanceTotalController, requestClosingController, findClosingRequestedAttendancesController} from "./attendance.controller.js";

export async function attendanceRoutes(app: FastifyInstance){
   app.get("/attendances/open", findOpenAttendanceController);
   app.get("/attendances/:attendanceId/total", findAttendanceTotalController);
   app.get("/attendances/closing-requested", findClosingRequestedAttendancesController);

   app.post("/attendances", createAttendanceController);

   app.patch("/attendances/:attendanceId/request-closing", requestClosingController);
}
