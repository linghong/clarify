import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [User],
  subscribers: [],
  migrations: [],
});

let initialized = false;

export async function initializeDatabase() {
  if (!initialized && !AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
      initialized = true;
    } catch (error) {
      throw error;
    }
  }
  return AppDataSource;
}