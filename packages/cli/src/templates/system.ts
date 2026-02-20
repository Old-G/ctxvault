export const ARCHITECTURE_MD = `---
type: convention
tags: [architecture]
relevance: 1.0
created: {{DATE}}
updated: {{DATE}}
summary: Project architecture overview
---

# Architecture

<!-- Describe your project's high-level architecture here -->
<!-- This memory is always injected into AI agent sessions -->

## Stack
- Language:
- Framework:
- Database:

## Directory Structure
- \`src/\` — source code
- \`tests/\` — test files

## Key Patterns
<!-- Describe important patterns used in the project -->
`;

export const CONVENTIONS_MD = `---
type: convention
tags: [conventions, style]
relevance: 1.0
created: {{DATE}}
updated: {{DATE}}
summary: Project coding conventions
---

# Coding Conventions

<!-- Define your project's coding conventions here -->
<!-- These are always injected into AI agent sessions -->

## General
- Use descriptive variable names
- Prefer explicit over implicit

## Error Handling
<!-- How errors should be handled -->

## Testing
<!-- Testing conventions -->
`;

export function renderTemplate(template: string): string {
  const now = new Date().toISOString();
  return template.replaceAll('{{DATE}}', now);
}
