import os
import re
import sys

def get_course_stats(course_id):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.join(script_dir, '..', 'src', 'content', 'lessons')
    course_dir = os.path.join(base_dir, course_id)
    
    if not os.path.exists(course_dir):
        print(f"Error: Course directory not found: {course_dir}")
        return

    lessons = []
    files = [f for f in os.listdir(course_dir) if f.endswith('.mdx')]
    
    if not files:
        print(f"No lessons found for course: {course_id}")
        return

    for filename in files:
        filepath = os.path.join(course_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Split frontmatter and body
            parts = re.split(r'^---$', content, flags=re.MULTILINE)
            if len(parts) >= 3:
                body = "---".join(parts[2:]).strip()
            else:
                body = content.strip()
            
            # Statistics
            length = len(body)
            words = len(re.findall(r'\w+', body))
            h1s = len(re.findall(r'^#\s', body, re.MULTILINE))
            h2s = len(re.findall(r'^##\s', body, re.MULTILINE))
            h3s = len(re.findall(r'^###\s', body, re.MULTILINE))
            
            # Components
            quizzes = len(re.findall(r'<Quiz', body))
            math_blocks = len(re.findall(r'<Math|(?<!\\)\$', body)) # Simple check for Math component or $
            plots = len(re.findall(r'<PlantUML', body))

            # Paragraphs: blocks separated by 2+ newlines
            paragraphs = len([p for p in re.split(r'\n\s*\n', body) if p.strip()])
            
            lessons.append({
                'name': filename,
                'length': length,
                'words': words,
                'h1s': h1s,
                'h2s': h2s,
                'h3s': h3s,
                'paragraphs': paragraphs,
                'quizzes': quizzes,
                'math_blocks': math_blocks,
                'plots': plots
            })

    total_lessons = len(lessons)
    if total_lessons == 0:
        return

    avg_len = sum(l['length'] for l in lessons) / total_lessons
    avg_words = sum(l['words'] for l in lessons) / total_lessons
    avg_h1 = sum(l['h1s'] for l in lessons) / total_lessons
    avg_h2 = sum(l['h2s'] for l in lessons) / total_lessons
    avg_h3 = sum(l['h3s'] for l in lessons) / total_lessons
    avg_para = sum(l['paragraphs'] for l in lessons) / total_lessons
    
    total_quizzes = sum(l['quizzes'] for l in lessons)
    total_math = sum(l['math_blocks'] for l in lessons)
    total_plots = sum(l['plots'] for l in lessons)

    longest = max(lessons, key=lambda x: x['length'])
    shortest = min(lessons, key=lambda x: x['length'])

    print(f"Course: {course_id}")
    print(f"-------------------------")
    print(f"Total lessons:  {total_lessons}")
    print(f"Mean length:    {avg_len:.1f} characters")
    print(f"Mean word count:{avg_words:.1f} words")
    print(f"Avg H1 headers: {avg_h1:.2f}")
    print(f"Avg H2 headers: {avg_h2:.2f}")
    print(f"Avg H3 headers: {avg_h3:.2f}")
    print(f"Avg Paragraphs: {avg_para:.2f}")
    print(f"-------------------------")
    print(f"Total Quizzes:  {total_quizzes}")
    print(f"Total Math:     {total_math} (tags/blocks)")
    print(f"Total Diagrams: {total_plots}")
    print(f"-------------------------")
    print(f"Longest lesson: {longest['name']} ({longest['length']} chars)")
    print(f"Shortest lesson:{shortest['name']} ({shortest['length']} chars)")

if __name__ == "__main__":
    # Get the directory of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level to the workspace root and then to the lessons directory
    base_dir = os.path.join(script_dir, '..', 'src', 'content', 'lessons')
    
    if len(sys.argv) < 2:
        if os.path.exists(base_dir):
            courses = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
            print("Usage: python course_stats.py <course_id>")
            print(f"Available courses: {', '.join(courses)}")
        else:
            print(f"Error: Could not find lessons directory at {base_dir}")
    else:
        get_course_stats(sys.argv[1])
