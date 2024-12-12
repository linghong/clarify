import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { hash } from "bcryptjs";

export enum EducationLevel {
  HIGH_SCHOOL = "high_school",
  COLLEGE = "college",
  MASTERS = "masters",
  PHD = "phd",
  OTHER = "other"
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  name?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  educationLevel?: EducationLevel | '';

  @Column({ nullable: true })
  major?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

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