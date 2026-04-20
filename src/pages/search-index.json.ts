import { getCollection } from 'astro:content';

export async function GET() {
  const allLessons = await getCollection('lessons');
  const searchData = allLessons.map(l => ({
    title: l.data.title,
    slug: l.slug,
    course: l.data.course
  }));
  
  return new Response(JSON.stringify(searchData), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
