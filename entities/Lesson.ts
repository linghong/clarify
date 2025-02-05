import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  courseId!: number;

  @ManyToOne("Course", "lessons")
  @JoinColumn({ name: "courseId" })
  course!: any;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  order!: number;

  @OneToMany("Resource", "lesson")
  resources!: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}