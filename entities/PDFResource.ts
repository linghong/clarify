import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";
import { Chat } from "./Chat";

@Entity('pdf_resources')
export class PdfResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  courseId!: number;

  @Column('int')
  lessonId!: number;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  url!: string;

  @ManyToOne(() => Course, (course) => course.pdfResources, { cascade: true })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne(() => Lesson, (lesson) => lesson.pdfResources, { cascade: true })
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @OneToMany('Chat', 'pdfResource')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}