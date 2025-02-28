import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from "typeorm";

import { User } from "./User";
import { Lesson } from "./Lesson";


export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

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

//Add explicit entity names to prevent minification conflicts cuased by nextjs  
@Entity({ name: 'Course' })
export class Course {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: "varchar",
    enum: CourseStatus,
    default: CourseStatus.DRAFT
  })
  status!: CourseStatus;

  @Column({ type: 'int', default: 0 })
  lessonsCount!: number;

  @ManyToOne('User', 'courses')
  @JoinColumn({ name: "userId" })
  user!: User;

  @OneToMany("Lesson", "course")
  lessons!: Lesson[];


  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

