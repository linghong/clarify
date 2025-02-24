import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Lesson } from "./Lesson";

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}

//Add explicit entity names to prevent minification conflicts caused by nextjs
@Entity({ name: 'Chat' })
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  lessonId!: number;

  @Column()
  resourceId!: number;

  @Column()
  role!: 'user' | 'assistant';

  @Column('text')
  message!: string;

  @Column({
    type: 'varchar',
    default: 'none'
  })
  resourceType!: 'pdf' | 'video' | 'lesson';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne('Lesson', 'chats')
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;
}
