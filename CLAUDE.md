# Claude Code Instructions

Read @ARCHITECTURE.md completely before doing anything else. (@README.md is the
project front-door: setup, screenshots, API, and scoring overview.)

Treat @ARCHITECTURE.md as the architectural source of truth for this project.

Before writing any code:

1. Summarize your understanding of:
   - the product
   - the system architecture
   - the domain model
   - the engineering decisions

2. Identify any ambiguities or missing implementation details that require clarification.

3. Propose a milestone-based implementation plan that follows the README exactly.

Constraints:

- Do not redesign the architecture.
- Do not suggest alternative frameworks or libraries.
- Do not expand the project scope.
- Do not generate any code yet.

Wait for my approval before creating files or writing implementation code.

If you think a better architecture exists, do not implement it.

Instead, list it under "Alternative Approaches" at the end of your response and continue following @README.md.

## Milestone Reviews

Produce a small review after every milestone, before moving on. Use this format:

```
Milestone Summary

Files created:
...

Responsibilities added:
...

Architecture boundaries maintained:
...

Known limitations:
...
```

This makes the work easy to review instead of diving straight into code.
