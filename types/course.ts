export interface Course {
  id: number;
  name: string;
  description: string;
  status: string;
  lessonsCount: number;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  status: string;
  resourcesCount: number;
  createdAt: string;
  updatedAt: string;
  course: Course;
  pdfResources: PdfResource[];
  videoResources: VideoResource[];
  chats?: Chat[];
}

export interface PdfResource {
  id: number;
  name: string;
  filename: string;
  createdAt: string;
  url: string;
  lesson: Lesson;
  course: Course;
  chats?: Chat[];
  status?: 'not_started' | 'in_progress' | 'completed';
}

export interface VideoResource {
  id: number;
  name: string;
  createdAt: string;
  url: string;
  lesson: Lesson;
  course: Course;
  chats?: Chat[];
  status?: 'not_started' | 'in_progress' | 'completed';
}

export interface Chat {
  id: number;
  title: string;
  resourceType: string;
  resourceId: number;
  lessonId: number;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  chatId: number;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  resourceType: 'pdf' | 'video' | 'lesson';
  resourceId: number;
  lessonId: number;
  courseId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
} 