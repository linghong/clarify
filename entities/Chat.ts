import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Lesson } from "./Lesson";
import { Message } from "./Message";

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
  resourceId?: number;

  @Column({
    type: 'varchar',
    default: 'none'
  })
  resourceType!: 'pdf' | 'video' | 'none';

  @ManyToOne('Lesson', 'chats')
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;

  @OneToMany('Message', 'chat')
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /* @Column({ nullable: true })
   userId?: string; // For user-owned chats
 
   @Column({ nullable: true })
   courseId?: string; // For course-wide chats*/
}
