import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Course } from "./Course";
import { PdfResource } from "./PDFResource";
import { VideoResource } from "./VideoResource";

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  courseId!: number;

  @ManyToOne(() => Course, course => course.lessons)
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column()
  order!: number;

  @Column({ type: "text", nullable: true })
  summary?: string;

  @OneToMany('PdfResource', 'lesson')
  pdfResources!: PdfResource[];

  @OneToMany('VideoResource', 'lesson')
  videoResources!: VideoResource[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}