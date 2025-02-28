import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Chat } from "./Lesson";

@Entity({ name: 'Message' })
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  chatId!: number;

  @Column('text')
  content!: string;

  @Column()
  role!: 'user' | 'assistant';

  @ManyToOne('Chat', 'messages')
  @JoinColumn({ name: 'chatId' })
  chat!: Chat;

  @CreateDateColumn()
  createdAt!: Date;
}