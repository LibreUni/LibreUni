import { getCollection } from 'astro:content';

export async function getCourseLessons(courseId: string) {
  const allLessons = await getCollection('lessons');
  return allLessons
    .filter(l => l.data.course === courseId)
    .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
}

export async function getLessonNavigation(courseId: string, currentSlug: string) {
  const lessons = await getCourseLessons(courseId);
  const currentIndex = lessons.findIndex(l => l.slug === currentSlug);
  
  return {
    prev: lessons[currentIndex - 1],
    next: lessons[currentIndex + 1],
    lessons
  };
}
