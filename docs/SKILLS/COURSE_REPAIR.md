# LibreUni Course Repair Skill

Always follow these rules when repairing or editing course content:

1. Read `docs/RULES.md`.
2. Read `docs/SKILLS/SOURCING.md`.
3. Read `docs/UX.md`.
4. Never mass-rewrite lessons with scripts.
5. Work file by file.
6. Preserve existing course intent.
7. Validate with the narrowest relevant command.
8. Utilize `scripts/course_stats.py`

## Task Guidelines

- Make sure that the course has everything needed to be able to solve all exercises (for example - if a calculation is needed, formula must be somewhere preceding this exercise and ideally there should be an example calculation also somewhere before).
- All interactive labs, diagrams and similar must have a context - it does not make sense to merely give code without any explanation of what it is demonstrating.
- Everything must be sourced. There should be no reason for a piece of information to be in any text if we cannot pinpoint directly where it comes from.
- Course structure is sometimes outdated - there used to be more or less subsections, suddenly it's different. It must be all corrected, so that it looks and is structured properly now.
- Subsections with 1 module are a huge red flag, subsections with 2-3 modules are a bit of a red flag. Reorganize subsections if needed to improve this.
- If an exercise is about completing code, it should not ask the question as a comment to be completed. The thing to be completed must be some command or something similar and again, user is not expected to search it elsewhere, it must have been mentioned before in the course.
- Make sure a module does not just restate the title of its subcategory in its title.