import "reflect-metadata";
import { DataSource } from "typeorm";
import { User, Course, Lesson, PdfResource, VideoResource, Chat, Message } from "@/entities";

class AppDataSourceSingleton {
  private static instance: DataSource;

  private constructor() { }

  public static async getInstance(): Promise<DataSource> {
    if (!AppDataSourceSingleton.instance) {
      AppDataSourceSingleton.instance = new DataSource({
        type: "sqlite",
        database: "database.sqlite",
        synchronize: true, // WARNING: Only for debugging!
        logging: false,
        entities: [User, Course, Lesson, PdfResource, VideoResource, Chat, Message],
        subscribers: [],
        migrations: ['migrations/*.ts'],
        migrationsTableName: 'migrations',
        migrationsRun: false,
        extra: {
          connectionLimit: 5,
          acquireTimeout: 30000
        }
      });
    }
    if (!AppDataSourceSingleton.instance.isInitialized) {
      try {
        await AppDataSourceSingleton.instance.initialize();
      } catch (e) {
        console.error('Connection error:', e);
        throw e;
      }
    }

    return AppDataSourceSingleton.instance;
  }
}

export const initializeDatabase = () => AppDataSourceSingleton.getInstance();