# PlantUML Troubleshooting

Quick reference for fixing PlantUML diagrams. Update this file when new error patterns are discovered.

## Common Errors

- **Named color tokens** (`LightBlue`, `LightRed`, `LightGreen`, `LightYellow`, `Gold`, `White`) — some PlantUML versions reject these. Replace with hex codes: `#ADD8E6`, `#FFCCCC`, `#90EE90`, `#FFF7AA`, `#FFD700`, `#FFFFFF`.
- **State/package syntax misuse** — mixing `state { ... }` or `package { [a] }` with bracket notation causes errors. Prefer `rectangle`/`component` or plain `state` declarations without bracket lists.
- **Bracketed labels with commas** (`[1, 2, 3]`) are invalid component identifiers. Use `component "1, 2, 3" as M1` or `note` elements instead.
- **Pseudo-commands** (`draw x, y axes`, `draw circles for neurons`, `line "..." as DB`) are not valid syntax. Convert to `note` or `rectangle`/`component` shapes.
- **Multi-line strings inside component names**: avoid literal newlines inside quotes; use `\n` or split into `note` blocks.
- **Sequence-only constructs** (`group ... end`) fail outside sequence diagrams. Replace with `package` or `rectangle`.
- **Stray templating tokens** (`@endif`, leftover placeholders) must be removed from PlantUML blocks.

## Fix Workflow

1. Run `npm run build` — populates `puml-errors.log` with failing snippets.
2. For each failure: `grep` for a unique substring from the code block to locate the source MDX.
3. Apply minimal edits: replace named colors with hex, remove unsupported pseudo-commands, convert bracketed IDs to `component` or `note`, ensure valid block boundaries (`@startuml` / `@enduml`).
4. Re-run build and iterate until `puml-errors.log` is empty.

## Tips

- Prefer simple shapes (`rectangle`, `component`, `note`) over complex `state`/`activity` syntax unless necessary.
- When in doubt, convert visual elements to `rectangle` + `note` text — these are robust across PlantUML versions.
- Keep generated SVGs cached under `src/puml-cache/`; failures should be logged, not cached.

## Examples

```
# Invalid
state "X" as X <<Tag>> #LightBlue { ... }

# Valid
rectangle "X" as X
note right of X: details

# Valid (hex color on state)
state "X" as X #ADD8E6
```
