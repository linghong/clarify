import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { VideoResource } from "./Lesson";

@Entity({ name: 'VideoBookmark' })
export class VideoBookmark {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  userId!: number;

  @Column('int')
  videoId!: number;

  @Column('float')
  timestamp!: number;

  @Column('text')
  note!: string;

  @Column('varchar', { nullable: true })
  label?: string;

  @ManyToOne('User')
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne('VideoResource')
  @JoinColumn({ name: "videoId" })
  video!: VideoResource;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 