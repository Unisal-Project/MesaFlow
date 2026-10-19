import { TableEntity } from "../enity/table.entity.js";
import type { TableWithAttendance } from "./table-with-attendance.repository.js";
import type { TableStatusChangeDTO } from "../dto/table-status-change.dto.js";

export interface TableRepository {
    existsById (id: bigint): Promise<boolean>;

    create(data: CreateTableData): Promise<TableEntity>;

    findById(id: bigint): Promise<TableEntity | null>;

    findAll(): Promise<TableEntity[]>;

    delete(id: bigint): Promise<TableEntity>;

    findByToken(token: string): Promise<TableEntity | null>;

    findByIdWithAttendance(id: bigint): Promise<TableWithAttendance | null>;

    findAllWithAttendance(): Promise<TableWithAttendance[]>;

    updateWithAttendanceCheck(
        id: bigint,
        data: UpdateTableData,
    ): Promise<TableWithAttendance>;

    changeStatusTransaction(
        id: bigint,
        change: TableStatusChangeDTO
    ): Promise<TableWithAttendance>;
}

export interface CreateTableData {
    number: number;
    name: string;
    active: boolean;
    qrToken: string;
}

export interface UpdateTableData {
    number: number;
    name: string;
    active: boolean;
}