import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const courses = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/courses' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    overview: z.string().optional(),
    icon: z.string(),
    color: z.string(),
    image: z.string().optional(),
    status: z.enum(['public', 'draft']).default('public'),
    // Workload hours are the primary metric. ECTS is optional for reference only.
    ects: z.number().nonnegative().max(30).optional(),
    workloadHours: z.number().positive().optional(),
    prerequisites: z.object({
      required: z.array(z.string()),
      recommended: z.array(z.string()),
    }),
  }),
});

const baseLessonSchema = z.object({
  title: z.string().min(1),
  course: z.string().min(1),
  module: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  description: z.string().min(10),
  estimatedMinutes: z.number().int().positive(),
});

const standardLessonSchema = baseLessonSchema.extend({
  kind: z.literal('lesson').default('lesson'),
  prerequisites: z.array(z.string().min(1)).min(1),
  outcomes: z.array(z.string().min(5)).min(1),
  omissions: z.array(z.string().min(3)).min(1),
  assessment: z.string().min(10),
});

const labLessonSchema = baseLessonSchema.extend({
  kind: z.literal('lab'),
  prerequisites: z.array(z.string().min(1)).min(1),
  outcomes: z.array(z.string().min(5)).min(1),
  omissions: z.array(z.string().min(3)).min(1),
  assessment: z.string().min(10),
});

const problemsLessonSchema = baseLessonSchema.extend({
  kind: z.literal('problems'),
  covers: z.array(z.string().min(1)).min(1),
  outcomes: z.array(z.string().min(5)).min(1),
});

const recapLessonSchema = baseLessonSchema.extend({
  kind: z.literal('recap'),
  covers: z.array(z.string().min(1)).min(1),
  omitStatements: z.array(z.object({ id: z.string(), reason: z.string() })).optional(),
});

const practiceLessonSchema = baseLessonSchema.extend({
  kind: z.literal('practice'),
  covers: z.array(z.string().min(1)).min(1),
  outcomes: z.array(z.string().min(5)).optional(),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lessons' }),
  schema: z.discriminatedUnion('kind', [
    standardLessonSchema,
    labLessonSchema,
    problemsLessonSchema,
    recapLessonSchema,
    practiceLessonSchema,
  ]),
});

const careers = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/careers' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    color: z.string(),
    scope: z.string().min(1),
    preparation: z.array(z.object({ title: z.string(), description: z.string(), link: z.string().url() })).min(1),
    entryChecks: z.array(z.object({ id: z.string(), prompt: z.string(), criteria: z.string() })).min(1),
    steps: z.array(z.object({
      id: z.string(),
      title: z.string(),
      outcome: z.string(),
      courses: z.array(z.object({
        id: z.string(),
        title: z.string(),
        type: z.literal('internal'),
      })).min(1),
      gate: z.object({ lesson: z.string(), prompt: z.string(), criteria: z.array(z.string()).min(1) }),
    })).min(1),
    synthesis: z.object({ title: z.string(), estimatedHours: z.number().positive(), brief: z.string(), artifacts: z.array(z.string()).min(1), criteria: z.array(z.string()).min(1), boundary: z.string() }),
  }),
});

export const collections = { courses, lessons, careers };
