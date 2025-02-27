import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { PdfResource } from "@/entities/PDFResource";
import { VideoResource } from "@/entities/VideoResource";
import { Chat } from "@/entities/Chat";
import { Message } from "@/entities/Message";

class AppDataSourceSingleton {
  private static connectionPromise: Promise<DataSource> | null = null;

  private constructor() { }

  public static async getInstance(): Promise<DataSource> {
    if (!this.connectionPromise) {
      this.connectionPromise = (async () => {
        const instance = new DataSource({
          type: "sqlite",
          database: "database.sqlite",
          synchronize: true, //use false in production
          logging: ['query', 'error', 'schema'], //use ['error'] in production
          entities: [
            User,
            Course,
            Lesson,
            PdfResource,
            VideoResource,
            Chat,
            Message
          ],
          extra: {
            connectionLimit: 1,
            acquireTimeout: 30000,
            enableWAL: true
          },
          migrationsRun: process.env.NODE_ENV === 'production',
          migrations: ['migrations/*.ts'],
        });
        await instance.initialize();
        return instance;
      })();
    }
    return this.connectionPromise;
  }
}

export const initializeDatabase = () => AppDataSourceSingleton.getInstance();
