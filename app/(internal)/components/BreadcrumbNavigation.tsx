import Breadcrumb from '@/components/common/BreadCrumb';
import { useMemo } from 'react';

interface BreadcrumbNavigationProps {
  courseId?: string | null;
  courseName?: string | null;
  lessonId?: string | null;
  lessonName?: string | null;
  resourceName?: string | null;
  resourceType?: 'pdf' | 'video' | 'lesson' | null;
}

export default function BreadcrumbNavigation({
  courseId,
  courseName,
  lessonId,
  lessonName,
  resourceName,
  resourceType
}: BreadcrumbNavigationProps) {
  const items = useMemo(() => {
    const breadcrumbItems = [{ name: 'Course Catalog', href: '/courses' }];

    // Add course if it exists
    if (courseId && courseName) {
      breadcrumbItems.push({
        name: typeof courseName === 'string' ? courseName : 'Course',
        href: `/courses/${courseId}`
      });
    }

    // Add lesson if it exists
    if (courseId && lessonId && lessonName) {
      breadcrumbItems.push({
        name: typeof lessonName === 'string' ? lessonName : 'Lesson',
        href: `/courses/${courseId}/lessons/${lessonId}`
      });
    }

    // Add resource (PDF or video) if it exists
    if (resourceName) {
      const encodedResourceName = encodeURIComponent(resourceName);
      const resourcePath = resourceType === 'pdf'
        ? `/dashboard?pdfName=${encodedResourceName}&courseId=${courseId}&lessonId=${lessonId}`
        : resourceType === 'video'
          ? `/dashboard?videoName=${encodedResourceName}&courseId=${courseId}&lessonId=${lessonId}`
          : typeof resourceType === 'string' && resourceType === 'lesson'
            ? `/dashboard?courseId=${courseId}&lessonId=${lessonId}`
            : '#';

      breadcrumbItems.push({
        name: resourceName,
        href: resourcePath
      });
    }

    return breadcrumbItems;
  }, [courseId, courseName, lessonId, lessonName, resourceName, resourceType]);

  return <Breadcrumb items={items} />;
} 