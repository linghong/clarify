import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { Resource } from "@/entities/Resource";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [User, Course, Lesson, Resource],
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