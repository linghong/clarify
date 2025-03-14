import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Chat } from "./Lesson";

@Entity({ name: 'Message' })
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  chatId!: number;

  @Column('text')
  content!: string;

  @Column({ type: 'varchar', length: 10 })
  role!: 'user' | 'assistant';

  @ManyToOne('Chat', 'messages')
  @JoinColumn({ name: 'chatId' })
  chat!: Chat;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}