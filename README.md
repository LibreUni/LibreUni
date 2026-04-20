# LibreUni

LibreUni is a free and now open source education platform dedicated to democratizing high-quality, university-level learning. No sign-in, no ads, no paywalls.

## Philosophy

Equality of opportunity — serious content for serious learners, with clean, minimalistic, and professional design.

## Project Structure

- `src/content/lessons/` — MDX lesson files organized by course
- `src/content/courses/` — JSON course metadata
- `src/components/` — Interactive React components (`<Quiz />`, `<CodeRunner />`, etc.)
- `scripts/` — Utility scripts (`course_stats.py` for content validation)
- `docs/` — Technical references (UX vision, PlantUML guide)

## Technical Stack

- **Framework**: [Astro](https://astro.build/)
- **Components**: React + Tailwind CSS
- **Content**: MDX with KaTeX (math) and PlantUML (diagrams)

## Getting Started

```bash
npm install
npm run dev
python3 scripts/course_stats.py   # content validation
npm run build
```

## Contributing

Read [RULES.md](docs/RULES.md) before contributing. It contains the complete rules for lesson structure, writing style, and quality standards.
