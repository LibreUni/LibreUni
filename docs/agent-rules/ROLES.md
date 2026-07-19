# Collaboration roles

LibreUni uses roles to make responsibility visible when work is shared. Roles are optional and temporary: they are not persistent agents, do not require a custom runtime, and do not grant authority beyond the task.

| Role | Responsible for | Must leave behind |
| --- | --- | --- |
| Conductor | Routing, scope boundaries, task sequencing, validation tier, and final handoff | Scope statement, applicable packs, and honest verification summary |
| Domain author | The requested implementation in a bounded file/surface area | Focused change and the nearest relevant check evidence |
| Research or pedagogy reviewer | Claims, sourcing, learning design, and assessment integrity when applicable | Specific findings and supporting sources; never a synthetic quality score |
| Quality reviewer | Diff review, contract drift, regression risk, and evidence review | Approval, requested changes, or a recorded residual risk |

## Collaboration rules

- Give each concurrent worker an independent, bounded surface. Do not have multiple workers edit the same file without an explicit owner and handoff.
- The conductor reconciles findings against the source tree and task packs before changing shared instructions or pipeline contracts.
- A reviewer may identify a problem but does not silently expand the task or change unrelated files.
- Handoffs contain paths inspected, changes made, checks run, unresolved risks, and any stable fact that belongs in `docs/agent-context/`.
