import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";

import { hash, compare } from "bcryptjs";
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

  @Column({ type: "int", nullable: true })
  age?: number | null;

  @Column({ type: "varchar", nullable: true })
  jobTitle?: string | null;

  @Column({ type: "int", nullable: true })
  yearsOfExperience?: number | null;

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

  @Column({ type: "boolean", default: false })
  firstLogin!: boolean;

  @Column({ type: "varchar", nullable: true })
  resetToken!: string | null;

  @Column({ type: "datetime", nullable: true })
  resetTokenExpiry!: Date | null;

  async hashPassword() {
    this.password = await hash(this.password, 10);
  }

  async comparePassword(password: string): Promise<boolean> {
    return compare(password, this.password);
  }
}