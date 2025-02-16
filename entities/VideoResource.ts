import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";

@Entity()
export class VideoResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  url!: string;

  @Column()
  lessonId!: number;

  @Column()
  courseId!: number;

  @Column({ type: 'text', nullable: true })
  summary!: string;

  @Column({ nullable: true })
  duration!: number;  // Video-specific field

  @Column({ nullable: true })
  thumbnailUrl!: string;  // Video-specific field

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Course, course => course.videos)
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne(() => Lesson, lesson => lesson.videoResources)
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;
}