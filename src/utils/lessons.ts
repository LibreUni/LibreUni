import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { loadCourseStructure } from '../lib/courseStructure.mjs';

export type PageKind = 'lesson' | 'lab' | 'problems' | 'recap' | 'practice';
export type ModuleKind = 'chapter' | 'practice' | 'reference';

type LessonEntry = CollectionEntry<'lessons'>;

export type OrderedLessonMetadata = {
  module?: string;
  label: string;
  number?: string | null;
  moduleKind: ModuleKind;
  moduleIndex: number | null;
};

export type OrderedLesson = LessonEntry & {
  data: LessonEntry['data'] & OrderedLessonMetadata;
};

type CourseStructurePage = {
  slug: string;
  kind: PageKind;
  label: string;
  number: string | null;
  moduleTitle?: string;
  moduleKind: ModuleKind;
  moduleIndex: number | null;
};

function attachOrderMetadata(lesson: LessonEntry, meta: OrderedLessonMetadata): OrderedLesson {
  return {
    ...lesson,
    data: {
      ...lesson.data,
      ...meta,
    },
  };
}

function lessonStem(lesson: LessonEntry) {
  return lesson.id.split('/').pop() ?? lesson.id;
}

export async function getCourseLessons(courseId: string, lessonEntries?: LessonEntry[]): Promise<OrderedLesson[]> {
  const allLessons = lessonEntries ?? (await getCollection('lessons'));
  const courseLessons = allLessons.filter((l) => l.data.course === courseId);
  const remainingLessons = new Map(courseLessons.map((lesson) => [lessonStem(lesson), lesson]));

  let structure: { modules: unknown[]; pages: CourseStructurePage[] };
  try {
    structure = loadCourseStructure(courseId) as { modules: unknown[]; pages: CourseStructurePage[] };
  } catch {
    structure = { modules: [], pages: [] };
  }

  const orderedLessons: OrderedLesson[] = [];

  for (const page of structure.pages) {
    const lesson = remainingLessons.get(page.slug);
    if (!lesson) continue;

    orderedLessons.push(
      attachOrderMetadata(lesson, {
        module: page.moduleTitle || 'Overview',
        label: page.label,
        number: page.number,
        moduleKind: page.moduleKind,
        moduleIndex: page.moduleIndex,
      }),
    );
    remainingLessons.delete(page.slug);
  }

  const fallbackLessons = [...remainingLessons.values()]
    .sort((a, b) => lessonStem(a).localeCompare(lessonStem(b)))
    .map((lesson) =>
      attachOrderMetadata(lesson, {
        module: 'Overview',
        label: '',
        number: null,
        moduleKind: 'chapter',
        moduleIndex: null,
      }),
    );

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
