# Task-pack index

Start with `AGENTS.md` and `BASELINE.md`, then read the packs below for every surface touched. Combining task packs is normal.

| Affected work | Required pack | Add when applicable |
| --- | --- | --- |
| Course, module, lesson, manifest, assessment | `GENERAL.md`, `COURSE_STANDARD.md`, `COURSE_WORK.md` | `COURSE_PEDAGOGY.md` for authoring/audit; `COURSE_INTEGRITY.md` for content review; `COURSE_REPAIR.md` for repairs; `RESEARCH.md`, `UI.md`, or `PLANTUML.md` by surface |
| Interactive course component | Course packs above | `COURSE_COMPONENTS.md`; `UI.md` for behavior, styling, or accessibility |
| New facts, sources, explanations, or citations | `RESEARCH.md` | Course packs when the material belongs in a course |
| UI, layout, styling, theme, interaction, accessibility | `UI.md` | `VALIDATION.md`; run visual capture when required by UI rules |
| PlantUML source or rendering | `PLANTUML.md` | Course packs for lesson diagrams |
| Agent routing, host adapters, roles, durable context | `HOSTS.md` | `VALIDATION.md` for repository edits |
| Scripts, package commands, CI, tests, deployment | `VALIDATION.md` | The rule pack for content, UI, or rendering behavior affected by the tooling |
| Documentation-only work | Subject pack named by the document | `HOSTS.md` for agent-process documentation |

`VALIDATION.md` applies to every edit. This index selects reading; it does not replace the detailed requirements in the referenced files.
