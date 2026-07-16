# LibreUni Course Repair Skill

Always follow these rules when repairing or editing course content:

1. Read `docs/agent-rules/GENERAL.md` and `COURSE_WORK.md`.
2. Read `docs/agent-rules/RESEARCH.md` when adding or checking sources.
3. Read `docs/agent-rules/UI.md` only when the repair changes layout, styling, interaction, or accessibility.
4. Never mass-rewrite lessons with scripts.
5. Work file by file and preserve existing course intent.
6. Validate with the narrowest relevant command from `docs/agent-rules/VALIDATION.md`.
7. Use `scripts/course_stats.py` for course-content smoke tests.

## Task Guidelines

- Make sure that the course has everything needed to be able to solve all exercises (for example - if a calculation is needed, formula must be somewhere preceding this exercise and ideally there should be an example calculation also somewhere before).
- All interactive labs, diagrams and similar must have a context - it does not make sense to merely give code without any explanation of what it is demonstrating.
- Everything must be sourced. There should be no reason for a piece of information to be in any text if we cannot pinpoint directly where it comes from.
- Course structure is sometimes outdated - there used to be more or less subsections, suddenly it's different. It must be all corrected, so that it looks and is structured properly now.
- Subsections with 1 module are a huge red flag, subsections with 2-3 modules are a bit of a red flag. Reorganize subsections if needed to improve this.
- If an exercise is about completing code, it should not ask the question as a comment to be completed. The thing to be completed must be some command or something similar and again, user is not expected to search it elsewhere, it must have been mentioned before in the course.
- Make sure a module does not just restate the title of its subcategory in its title.

## Common Issues and Solutions

- Fill-in code exercises should not be testing coding abilities in non-code courses (and even in code courses, only test what was shown to the user prior)
- Do not lay the structure in front of the suer - when following a methodology, you can structure everything in comments, but don't make the structure so obvious in front of the user (like labelling every heading with the phase and intent or some methodology terms)
- Use tex where possible in mathematics.
- Use diagrams and other ways of visual presentation. Visual stimulus is incredibly important for showing complex concepts.
- Try to avoid doing everything inline - use lists and other available features.
- With collapsible elements, try to present solutions over several lines instead of squeezing everything into one.
- Try to provide some visual navigation, so each same kind of elemet can be easily recognized. For example, all theorems having an icon next to them, or all lemmas being a callout and so on...
- Try to prevent monotonic large blobls of text. Even if a long text, explanation, proof, or calculation is needed, try to utilize either html or other ways of making visual sense of the process and the flow.

## Abstracting

If you believe a problem can occur at other places too, and if there is a way the solution can be abstracted, go for it. DRY principle should always be followed, so you are welcome to create a new component and such to solve a common recurring problem. Keep in mind that perhaps other courses might sometimes need to adjust when such changes are made, so if there is a need for change, and it cannot be performed automatically, you shold consider whether you also apply the change globally, or at least you have to notify if it needs to be done.
