import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import type { Relation } from "typeorm";

import { hash } from "bcryptjs";
import { Course } from "./Course";

export enum EducationLevel {
  HIGH_SCHOOL = "high_school",
  COLLEGE = "college",
  MASTERS = "masters",
  PHD = "phd",
  OTHER = "other"
}
//Add explicit entity names to prevent minification conflicts cuased by nextjs
@Entity({ name: 'User' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  password!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  educationLevel?: EducationLevel | '';

  @Column({ type: "varchar", nullable: true })
  major?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  gender?: string;

  @OneToMany("Course", "user")
  courses!: Course[];

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  async hashPassword() {
    if (this.password) {
      this.password = await hash(this.password, 12);
    }
  }
}