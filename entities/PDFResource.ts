import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Chat } from "./Chat";
import { Course } from "./Course";
import { Lesson } from "./Lesson";

export enum StorageType {
  LOCAL = 'local',
  GOOGLE_DRIVE = 'google_drive',
  DROPBOX = 'dropbox'
}

export enum ResourceType {
  PDF = 'pdf',
  VIDEO = 'video'
}

@Entity()
export class PdfResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  courseId!: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @Column()
  lessonId!: number;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @Column()
  name!: string;

  @Column({
    type: "varchar",
    enum: ResourceType
  })
  type!: ResourceType;

  @Column({
    type: "simple-json",
    nullable: true
  })
  locations!: {
    type: StorageType;
    path: string;
    lastSynced?: Date;
  }[];

  @Column("int")
  size!: number;

  @Column({ type: "datetime", nullable: true })
  lastModified!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany('Chat', 'pdfResource')
  chats!: Chat[];
}