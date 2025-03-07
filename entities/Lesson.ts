import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Course } from "./Course";
import { Message } from "./Message";

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

//Add explicit entity names to prevent minification conflicts cuased by nextjs  
@Entity({ name: 'PdfResource' })
export class PdfResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  lessonId!: number;

  @Column('varchar')
  name!: string;

  @Column('varchar', { length: 2048 })
  url!: string;


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

//Add explicit entity names to prevent minification conflicts cuased by nextjs  
@Entity({ name: 'VideoResource' })
export class VideoResource {
  @PrimaryGeneratedColumn()
  id!: number;

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

//Add explicit entity names to prevent minification conflicts caused by nextjs
@Entity({ name: 'Chat' })
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'int' })
  lessonId!: number;

  @Column({ type: 'int', nullable: true })
  resourceId!: number;

  @Column({
    type: 'varchar',
    default: 'lesson'
  })
  resourceType!: 'pdf' | 'video' | 'lesson';

  @ManyToOne('Lesson', 'chats')
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;

  @OneToMany('Message', 'chat')
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export interface Chat {
  id: number;
  title: string;
  lessonId: number;
  resourceType: 'lesson' | 'pdf' | 'video';
  resourceId: number;
  createdAt: Date;
  updatedAt: Date;
  lesson: Lesson;
  messages: Message[];
}

// This type is referenced in VideoBookmark.ts
export interface VideoResource {
  id: number;
  lessonId: number;
  url: string;
  title: string;
  // other relevant fields
}
