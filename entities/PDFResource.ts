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
  name!: string;

  @Column()
  courseId!: number;

  @Column()
  lessonId!: number;

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

  @ManyToOne(() => Course)
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne(() => Lesson, lesson => lesson.pdfResources)
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @OneToMany('Chat', 'pdfResource')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}