import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";
import { Chat } from "./Chat";

//Add explicit entity names to prevent minification conflicts cuased by nextjs  
@Entity({ name: 'PdfResource' })
export class PdfResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  courseId!: number;

  @Column('int')
  lessonId!: number;

  @Column('varchar')
  name!: string;

  @Column('varchar', { length: 2048 })
  url!: string;

  @ManyToOne('Course', 'pdfResources')
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne('Lesson', 'pdfResources')
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @OneToMany('Chat', 'pdfResource')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}