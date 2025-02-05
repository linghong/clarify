import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { User } from "./User";

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({
    type: "varchar",
    enum: CourseStatus,
    default: CourseStatus.DRAFT
  })
  status!: CourseStatus;

  @OneToMany("Lesson", "course")
  lessons!: any[];

  @Column({ default: 0 })
  lessonsCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// Helper types for create/update operations
export interface CreateCourseInput {
  name: string;
  description: string;
  status?: CourseStatus;
}

export interface UpdateCourseInput {
  name?: string;
  description?: string;
  status?: CourseStatus;
}