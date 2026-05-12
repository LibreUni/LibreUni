import { defineCollection, z } from 'astro:content';

const coursesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    color: z.string(),
    image: z.string().optional(),
  }),
});

const lessonsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    course: z.string(),
    description: z.string().optional(),
  }),
});

const careersCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    color: z.string(),
    details: z.object({
      importance: z.string().optional(),
      rolesAndResponsibilities: z.string().optional(),
      aiImpact: z.string().optional(),
      salary: z.array(z.object({
        region: z.string(),
        period: z.string(),
        junior: z.string(),
        mid: z.string(),
        senior: z.string(),
      })).optional(),
      marketDemand: z.string().optional(),
      peopleCount: z.string().optional(),
      topCompanies: z.array(z.string()).optional(),
      prominentFigures: z.array(z.string()).optional(),
      expectations: z.object({
        junior: z.string(),
        mid: z.string(),
        senior: z.string(),
      }).optional(),
    }).optional(),
    steps: z.array(z.object({
      title: z.string(),
      courses: z.array(z.object({
        id: z.string().optional(),
        title: z.string(),
        type: z.enum(['internal', 'external']),
        description: z.string().optional(),
        link: z.string().optional(),
      })),
    })),
  }),
});

export const collections = {
  'courses': coursesCollection,
  'lessons': lessonsCollection,
  'careers': careersCollection,
};
