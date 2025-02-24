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
}

export interface VideoResource {
  id: number;
  name: string;
  createdAt: string;
  url: string;
  lesson: Lesson;
  course: Course;
  chats?: Chat[];
}

export interface Chat {
  id: number;
  lessonId: number;
  resourceId?: number;
  role: 'user' | 'assistant';
  message: string;
  resourceType: 'pdf' | 'video' | 'none';
  createdAt: string;
  updatedAt: string;
}