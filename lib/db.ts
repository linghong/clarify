import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { PdfResource } from "@/entities/PDFResource";
import { VideoResource } from "@/entities/VideoResource";
import { Chat } from "@/entities/Chat";

class AppDataSourceSingleton {
  private static instance: DataSource;

  private constructor() { }

  public static async getInstance(): Promise<DataSource> {
    if (!AppDataSourceSingleton.instance) {
      AppDataSourceSingleton.instance = new DataSource({
        type: "sqlite",
        database: "database.sqlite",
        synchronize: true,
        logging: false,
        entities: [User, Course, Lesson, PdfResource, VideoResource, Chat],
        subscribers: [],
        migrations: []
      });
    }

    if (!AppDataSourceSingleton.instance.isInitialized) {
      try {
        await AppDataSourceSingleton.instance.initialize();
      } catch (e) {
        console.error('Error during data source initialization', e);
        throw e;
      }
    }

    return AppDataSourceSingleton.instance;
  }
}

export const initializeDatabase = () => AppDataSourceSingleton.getInstance();