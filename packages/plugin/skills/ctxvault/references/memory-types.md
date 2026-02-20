# Memory Types

| Type | When | Example |
|------|------|---------|
| gotcha | Surprising behavior, bug pattern | "Prisma migrate fails without --skip-seed in Docker" |
| decision | Architecture/tech choice + rationale | "Chose Zustand: simpler API for our needs" |
| solution | Problem → diagnosis → fix | "CORS 403 → added rewrite in next.config.js" |
| discovery | New knowledge about codebase | "Legacy endpoint /v1/users still called by mobile app" |
| convention | Coding standard, pattern | "All components use forwardRef" |

## Frontmatter Fields
- type: required (one of above)
- tags: required (array of keywords)
- summary: required (one-line, < 100 chars)
- related_files: recommended (project file paths this relates to)
- relevance, source_agent, source_session: auto-managed
