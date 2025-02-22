import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Course } from "./Course";
import { PdfResource } from "./PDFResource";
import { VideoResource } from "./VideoResource";

@Entity('lessons')
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

  @ManyToOne(() => Course, (course) => course.lessons, { cascade: true })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @OneToMany("PdfResource", "lesson")
  pdfResources!: PdfResource[];

  @OneToMany("VideoResource", "lesson")
  videoResources!: VideoResource[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}