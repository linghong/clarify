import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lesson } from './Lesson';
import { Course } from './Course';
import { User } from './User';

@Entity()
export class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column()
  resourceType!: 'pdf' | 'video' | 'lesson';

  @Column()
  resourceId!: number;

  @Column()
  lessonId!: number;

  @Column()
  courseId!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 