import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { loadCourseStructure } from '../lib/courseStructure.mjs';

export type PageKind = 'lesson' | 'lab' | 'problems' | 'recap' | 'practice' | 'exam';
export type ModuleKind = 'chapter' | 'practice' | 'exam' | 'reference';

type LessonEntry = CollectionEntry<'lessons'>;

export type OrderedLesson = LessonEntry & {
  data: LessonEntry['data'] & {
    module?: string;
    kind: PageKind;
    label: string;
    number?: string | null;
    moduleKind: ModuleKind;
    moduleIndex: number | null;
  };
};

function lessonStem(lesson: LessonEntry) {
  return lesson.id.split('/').pop() ?? lesson.id;
}

export async function getCourseLessons(courseId: string, lessonEntries?: LessonEntry[]): Promise<OrderedLesson[]> {
  const allLessons = lessonEntries ?? (await getCollection('lessons'));
  const courseLessons = allLessons.filter((l) => l.data.course === courseId);
  const remainingLessons = new Map(courseLessons.map((lesson) => [lessonStem(lesson), lesson]));

  let structure: { modules: any[]; pages: any[] };
  try {
    structure = loadCourseStructure(courseId);
  } catch {
    structure = { modules: [], pages: [] };
  }

  const orderedLessons: OrderedLesson[] = [];

  for (const page of structure.pages) {
    const lesson = remainingLessons.get(page.slug);
    if (!lesson) continue;

    orderedLessons.push({
      ...lesson,
      data: {
        ...lesson.data,
        module: page.moduleTitle || 'Overview',
        kind: page.kind as PageKind,
        label: page.label,
        number: page.number,
        moduleKind: page.moduleKind as ModuleKind,
        moduleIndex: page.moduleIndex,
      },
    });
    remainingLessons.delete(page.slug);
  }

  const fallbackLessons = [...remainingLessons.values()]
    .sort((a, b) => lessonStem(a).localeCompare(lessonStem(b)))
    .map((lesson) => ({
      ...lesson,
      data: {
        ...lesson.data,
        module: 'Overview',
        kind: ((lesson.data as any).kind || 'lesson') as PageKind,
        label: '',
        number: null,
        moduleKind: 'chapter' as ModuleKind,
        moduleIndex: null,
      },
    }));

  return [...orderedLessons, ...fallbackLessons];
}

export async function getLessonsByCourse(lessonEntries?: LessonEntry[]) {
  const allLessons = lessonEntries ?? (await getCollection('lessons'));
  const courseIds = [...new Set(allLessons.map((lesson) => lesson.data.course))];
  const entries = await Promise.all(
    courseIds.map(async (courseId) => [courseId, await getCourseLessons(courseId, allLessons)] as const),
  );

  return Object.fromEntries(entries);
}

export async function getLessonNavigation(courseId: string, currentSlug: string) {
  const lessons = await getCourseLessons(courseId);
  const currentIndex = lessons.findIndex((l) => lessonStem(l) === currentSlug || l.id === currentSlug);

  return {
    prev: lessons[currentIndex - 1],
    next: lessons[currentIndex + 1],
    lessons,
  };
}
