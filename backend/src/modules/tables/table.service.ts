import { prisma } from "../../database/prisma.js";
import { TableDTO , TableIdDTO } from "./table.schema.js"

export class TableService {

    constructor(  private readonly tableRepository : typeof prisma ){}

    async createTable(table : TableDTO ){

        return await this.tableRepository.restaurantTable.create({
            data: {
                number: table.number,
                name: table.name,
                active: table.active
            }
        });
    }

    async deleteTable(id : TableIdDTO){
        return await this.tableRepository.restaurantTable.delete({

            where: {
                id: id.id
            }

        })
    }     

    async editTable(id : TableIdDTO, table : TableDTO){
        return await this.tableRepository.restaurantTable.update({
            where: {
                id: id.id
            },
            data: {
                number: table.number,
                name: table.name,
                active: table.active
            }
        })
    }
     async getTableById(id : TableIdDTO){
        return await this.tableRepository.restaurantTable.findUnique({
            where: {
                id: id.id
            }
        })
    }

    async getAllTables(){
        return await this.tableRepository.restaurantTable.findMany();
    }
    
}


