import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";
import type { Chat } from "./Chat";


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

  @OneToMany('Chat', 'videoResource')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Course)
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;
}