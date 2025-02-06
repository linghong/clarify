import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";
import { PdfResource } from "./PDFResource";
import { VideoResource } from "./VideoResource";

@Entity()
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  resourceId!: number;

  @Column({ type: 'text' })
  message!: string;

  @Column()
  role!: 'user' | 'assistant';

  @Column({ nullable: true })
  resourceType!: 'pdf' | 'video';

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => PdfResource, pdfResource => pdfResource.chats, { nullable: true })
  @JoinColumn({ name: "resourceId" })
  pdfResource?: PdfResource;

  @ManyToOne(() => VideoResource, videoResource => videoResource.chats, { nullable: true })
  @JoinColumn({ name: "resourceId" })
  videoResource?: VideoResource;
}
