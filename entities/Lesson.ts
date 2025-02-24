import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Course } from "./Course";
import { PdfResource } from "./PDFResource";
import { VideoResource } from "./VideoResource";
import { Chat } from "./Chat";

//Add explicit entity names to prevent minification conflicts cuased by nextjs  
@Entity({ name: 'Lesson' })
export class Lesson {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  courseId!: number;

  @Column('varchar')
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column('int')
  order!: number;

  @Column({ type: "text", nullable: true })
  summary?: string;

  //use string to avoid circular dependency caused by nextjs
  @ManyToOne('Course', 'lessons')
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @OneToMany("PdfResource", "lesson")
  pdfResources!: PdfResource[];

  @OneToMany("VideoResource", "lesson")
  videoResources!: VideoResource[];

  @OneToMany('Chat', 'lesson')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}