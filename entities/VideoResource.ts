import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";
import { Chat } from "./Chat";

@Entity('video_resources')
export class VideoResource {
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

  @Column({ type: 'text', nullable: true })
  summary!: string;

  @Column({ type: 'float', nullable: true })
  duration!: number;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl!: string;

  @ManyToOne(() => Course, (course) => course.videoResources, { cascade: true })
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne(() => Lesson, (lesson) => lesson.videoResources, { cascade: true })
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @OneToMany('Chat', 'videoResource')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}