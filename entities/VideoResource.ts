import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, OneToMany } from "typeorm";
import { Chat } from "./Chat";
import { Course } from "./Course";
import { Lesson } from "./Lesson";

@Entity()
export class VideoResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  courseId!: number;

  @Column()
  lessonId!: number;

  @Column()
  url!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string;

  @Column({ nullable: true })
  duration!: number;  // Video-specific field

  @Column({ nullable: true })
  thumbnailUrl!: string;  // Video-specific field

  @ManyToOne(() => Course)
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne(() => Lesson, lesson => lesson.videoResources)
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @OneToMany('Chat', 'videoResource')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}