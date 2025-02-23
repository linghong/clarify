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
}

export interface PdfResource {
  id: string;
  name: string;
  filename: string;
  createdAt: string;
  url: string;
  lesson: Lesson;
  course: Course;
}

export interface VideoResource {
  id: number;
  name: string;
  createdAt: string;
  url: string;
  lesson: Lesson;
  course: Course;
}