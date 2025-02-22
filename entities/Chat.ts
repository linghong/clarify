import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { PdfResource } from "./PDFResource";
import { VideoResource } from "./VideoResource";

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  userId!: number;

  @Column('text')
  message!: string;

  @Column({ type: 'int', nullable: true })
  resourceId?: number;

  @Column({ type: 'varchar', nullable: true })
  resourceType?: 'pdf' | 'video';

  @ManyToOne(() => PdfResource, (pdfResource) => pdfResource.chats, { cascade: true })
  @JoinColumn({ name: "resourceId" })
  pdfResource?: PdfResource;

  @ManyToOne(() => VideoResource, (videoResource) => videoResource.chats, { cascade: true })
  @JoinColumn({ name: "resourceId" })
  videoResource?: VideoResource;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
