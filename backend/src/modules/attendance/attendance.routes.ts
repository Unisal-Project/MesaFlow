import type { FastifyInstance } from "fastify";
import { 
   createAttendanceController, 
   findOpenAttendanceController, 
   findAttendanceTotalController, 
   requestClosingController, 
   findClosingRequestedAttendancesController,
   requestCancelledController,
   findCancelledAttendancesController,
} from "./attendance.controller.js";

export async function attendanceRoutes(app: FastifyInstance){
   app.get("/attendances/open", findOpenAttendanceController);
   app.get("/attendances/:attendanceId/total", findAttendanceTotalController);
   app.get("/attendances/closing-requested", findClosingRequestedAttendancesController);
   app.get("/attendances/cancelled", findCancelledAttendancesController);

   app.post("/attendances", createAttendanceController);

   app.patch("/attendances/:attendanceId/request-closing", requestClosingController);
   app.patch("/attendances/:attendanceId/request-cancelled", requestCancelledController);
}