import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";
import { Chat } from "./Chat";

//Add explicit entity names to prevent minification conflicts cuased by nextjs  
@Entity({ name: 'VideoResource' })
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

  @ManyToOne('Course', 'videoResources')
  @JoinColumn({ name: "courseId" })
  course!: Course;

  @ManyToOne('Lesson', 'videoResources')
  @JoinColumn({ name: "lessonId" })
  lesson!: Lesson;

  @OneToMany('Chat', 'videoResource')
  chats!: Chat[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}