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

  @Column({ type: 'varchar', length: 10 })
  resourceType!: 'pdf' | 'video' | 'lesson';

  @Column({ type: 'int' })
  resourceId!: number;

  @Column({ type: 'int' })
  lessonId!: number;

  @Column({ type: 'int' })
  courseId!: number;

  @Column({ type: 'int' })
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