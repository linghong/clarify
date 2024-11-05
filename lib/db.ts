import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "database.sqlite",
  synchronize: true,
  logging: true,
  entities: [User],
  subscribers: [],
  migrations: [],
});

// Initialize the DataSource on app startup
let initialized = false;

export async function initializeDatabase() {
  if (!initialized) {
    try {
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");
      initialized = true;
    } catch (error) {
      console.error("Error during Data Source initialization:", error);
      throw error;
    }
  }
  return AppDataSource;
}