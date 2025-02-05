import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";

export enum StorageType {
  LOCAL = 'local',
  GOOGLE_DRIVE = 'google_drive',
  DROPBOX = 'dropbox'
}

export enum ResourceType {
  PDF = 'pdf',
  VIDEO = 'video'
}

@Entity()
export class Resource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  lessonId!: number;

  @ManyToOne("Lesson", "resources")
  @JoinColumn({ name: "lessonId" })
  lesson!: any;

  @Column()
  name!: string;

  @Column({
    type: "varchar",
    enum: ResourceType
  })
  type!: ResourceType;

  @Column({
    type: "simple-json",
    nullable: true
  })
  locations!: {
    type: StorageType;
    path: string;
    lastSynced?: Date;
  }[];

  @Column("int")
  size!: number;

  @Column({ type: "datetime", nullable: true })
  lastModified!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}