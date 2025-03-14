import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Course } from "@/entities/Course";
import { Lesson, PdfResource, VideoResource, Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";
import { VideoBookmark } from '@/entities/VideoBookmark';
import { Note } from '@/entities/Note';

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
          logging: ['error'], //['query', 'error', 'schema', 'info', 'log'],
          entities: [
            User,
            Course,
            Lesson,
            PdfResource,
            VideoResource,
            Chat,
            Message,
            VideoBookmark,
            Note
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
