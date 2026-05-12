import { getCollection } from 'astro:content';
import { getLessonsByCourse } from '../utils/lessons';

export async function GET() {
  const allLessons = await getCollection('lessons');
  const lessonsByCourse = await getLessonsByCourse(allLessons);
  const orderedLessons = Object.values(lessonsByCourse).flat();
  const courses = await getCollection('courses');
  const courseTitles = Object.fromEntries(courses.map(course => [course.id, course.data.title]));

  const courseData = courses.map(course => ({
    type: 'course',
    title: course.data.title,
    slug: course.id,
    course: course.data.title,
    description: course.data.description,
    url: `courses/${course.id}.html`
  }));

  const lessonData = orderedLessons.map(l => ({
    type: 'lesson',
    title: l.data.title,
    slug: l.slug,
    course: courseTitles[l.data.course] ?? l.data.course,
    module: l.data.module ?? '',
    description: l.data.description ?? '',
    url: `lessons/${l.slug}.html`
  }));

  const searchData = [...courseData, ...lessonData];
  
  return new Response(JSON.stringify(searchData), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
