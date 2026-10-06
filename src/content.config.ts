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
    ects: z.union([z.literal(0), z.literal(5), z.literal(7.5), z.literal(10)]),
    workloadHours: z.number().positive().optional(),
    prerequisites: z.object({
      required: z.array(z.string()),
      recommended: z.array(z.string()),
    }),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    course: z.string(),
    description: z.string().optional(),
    prerequisites: z.array(z.string()).default([]),
    outcomes: z.array(z.string()).default([]),
    omissions: z.array(z.string()).default([]),
    estimatedMinutes: z.number().int().positive().optional(),
    assessment: z.string().optional(),
  }),
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
    synthesis: z.object({ title: z.string(), estimatedHours: z.number().positive(), brief: z.string(), deliverables: z.array(z.string()).min(1), criteria: z.array(z.string()).min(1), boundary: z.string() }),
  }),
});

export const collections = { courses, lessons, careers };
