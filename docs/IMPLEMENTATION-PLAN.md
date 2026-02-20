# CtxVault — Пошаговый план реализации

> **Версия:** 2.0 (PRD v4) | **Дата:** 20 февраля 2026 | **Статус:** В работе

---

## Phase 0: Инфраструктура проекта ✅

### 0.1 Инициализация монорепо

- [x] Создать корневой `package.json` (private, workspaces)
- [x] Создать `pnpm-workspace.yaml` с packages/*
- [x] Создать `tsconfig.base.json` (strict, ESM, target ES2022, moduleResolution bundler)
- [x] Создать два пакета: `packages/core/`, `packages/cli/`
- [x] Настроить `package.json` для каждого пакета:
  - `@ctxvault/core` — библиотека (exports, types)
  - `ctxvault` — CLI (bin: ctx, ctxvault)
- [x] Настроить `tsconfig.json` каждого пакета (extends base, project references)
- [x] `pnpm install` — убедиться что workspace работает

### 0.2 Инструменты разработки

- [x] Настроить tsup (`tsup.config.ts`) — ESM build для каждого пакета
- [x] Настроить ESLint 9.x flat config (`eslint.config.js`) + `@typescript-eslint`
- [x] Настроить Prettier (`prettier.config.js`)
- [x] Настроить Vitest (`vitest.config.ts`) — workspaces mode, coverage (v8)
- [x] Настроить simple-git-hooks + lint-staged (pre-commit: lint + format)
- [x] Добавить root scripts: build, dev, test, test:bench, typecheck, lint, format, clean
- [x] Проверить: `pnpm build && pnpm test && pnpm typecheck && pnpm lint` — всё зелёное

### 0.3 CI/CD

- [x] Создать `.github/workflows/ci.yml` (Node 22+24, Ubuntu/macOS/Windows matrix)
- [x] Создать `.github/workflows/release.yml` (changesets → npm publish)
- [x] Настроить `.changeset/config.json`
- [x] Создать `LICENSE` (MIT)
- [x] Создать базовый `README.md`

---

## Phase 1: MVP — "It Just Works" (в работе)

### 1.1 Core: Типы и конфигурация ✅

- [x] `packages/core/src/memory/types.ts` — MemoryType enum, MemoryEntry, Frontmatter интерфейсы
- [x] `packages/core/src/config/schema.ts` — Zod-схема для config.yaml
- [x] `packages/core/src/config/defaults.ts` — дефолтные значения конфигурации
- [x] `packages/core/src/config/loader.ts` — загрузка config.yaml, валидация, merge с defaults
- [x] Тесты для config loader (3 теста)

### 1.2 Core: Memory Store ✅

- [x] `packages/core/src/memory/frontmatter.ts` — парсинг/сериализация YAML frontmatter
- [x] `packages/core/src/memory/validator.ts` — Zod-схемы валидации
- [x] `packages/core/src/memory/store.ts` — MemoryStore: create, read, update, delete, list, findByRelatedFile
- [x] `packages/core/src/memory/slugify.ts` — генерация slug-имён файлов
- [x] `packages/core/src/memory/uuid.ts` — UUIDv7
- [x] Тесты (5 тестов store + 1 тест frontmatter)

### 1.3 Core: SQLite Index + FTS5 ✅

- [x] `packages/core/src/index/db.ts` — better-sqlite3 + Drizzle, WAL mode, pragmas
- [x] `packages/core/src/index/schema.ts` — Drizzle-схема: memories, file_relations, sessions
- [x] `packages/core/src/index/fts.ts` — FTS5 virtual table + sync triggers
- [x] `packages/core/src/index/search.ts` — FTS5 search с BM25 ranking
- [x] `packages/core/src/index/sync.ts` — syncMemoryToIndex, removeFromIndex, rebuildIndex
- [x] Тесты (2 теста sync)

### 1.4 Core: Injection ✅

- [x] `packages/core/src/injection/budget.ts` — подсчёт токенов (js-tiktoken), fitWithinBudget
- [x] `packages/core/src/injection/injector.ts` — buildSessionPayload (L1, ≤ 500 токенов)
- [x] `packages/core/src/injection/context-for-file.ts` — getContextForFile (PreToolUse, ≤ 200 токенов)
- [x] Тесты (3 теста budget)

### 1.5 Core: Extraction ✅

- [x] `packages/core/src/extraction/patterns.ts` — regex-паттерны для lightweight extract
- [x] `packages/core/src/extraction/extractor.ts` — extractFromTranscript
- [x] Тесты (5 тестов patterns)
- [ ] Дедупликация через FTS5 similarity check

### 1.6 Core: Git Operations ✅

- [x] `packages/core/src/git/ops.ts` — git add, commit, status (simple-git)
- [x] `packages/core/src/git/ignore.ts` — ensureGitignore (vault.db, sessions/)
- [ ] Smart auto-commit с описательными сообщениями

### 1.7 Core: Публичный API ✅

- [x] `packages/core/src/index.ts` — экспорт всех публичных модулей
- [x] Сборка и экспорт типов работают

### 1.8 CLI: Entry Point ✅

- [x] `packages/cli/src/index.ts` — Commander.js setup, все команды зарегистрированы
- [x] `packages/cli/bin/ctx.js` — shim

### 1.9 CLI: `ctx init` ✅

- [x] Создание `.ctx/` со всеми поддиректориями (включая sessions/)
- [x] Запись default config.yaml
- [x] Запись `.ctx/.gitignore` (vault.db, sessions/)
- [x] Обновление корневого .gitignore
- [x] Templates (architecture.md, conventions.md)
- [x] Инициализация SQLite (vault.db)
- [x] Agent detection + Claude Code setup (hooks + skill)
- [x] Флаги: `--force`, `--no-hooks`, `--no-skill`, `--agent`

### 1.10 CLI: Agent Detection + Claude Code Setup ✅

- [x] `packages/cli/src/agents/detector.ts` — обнаружение агентов (claude-code, cursor, windsurf, codex)
- [x] `packages/cli/src/agents/claude-code.ts` — `.claude/settings.json` с 5 hooks:
  - SessionStart, PreToolUse (Edit|MultiEdit|Write), PostToolUse, PreCompact, Stop
  - Формат: вложенная структура { hooks: [{ type, command }], matcher? }

### 1.11 CLI: Agent Skill (Layer 2) ✅

- [x] `packages/cli/src/skill/generator.ts` — генерация `.agents/skills/ctxvault/`:
  - SKILL.md с YAML frontmatter (name, description, triggers)
  - scripts/: inject.sh, search.sh, save.sh, read.sh, list.sh (все chmod +x)
  - references/memory-types.md
  - Симлинк `.claude/skills/ctxvault` → `.agents/skills/ctxvault`

### 1.12 CLI: Hook Commands ✅

- [x] `packages/cli/src/commands/hook.ts` — 5 субкоманд:
  - `hook session-start` — SessionStart injection payload
  - `hook context-for-file` — PreToolUse, stdin JSON → additionalContext JSON
  - `hook track-change` — PostToolUse, stdin JSON → access_count tracking
  - `hook snapshot` — PreCompact, сохраняет payload в .ctx/sessions/
  - `hook auto-extract` — Stop, lightweight regex extraction

### 1.13 CLI: Пользовательские команды ✅

- [x] `ctx search <query>` — FTS5 поиск (--type, --limit)
- [x] `ctx list` — список memories (--type, --sort, --limit)
- [x] `ctx add <type> <summary>` — добавление memory
- [x] `ctx save` — неинтерактивное сохранение (для skill scripts)
- [x] `ctx show <path>` — полное содержимое
- [x] `ctx remove <path>` — удаление
- [x] `ctx status` — статус (кол-во, типы, индекс)
- [x] `ctx inject` — preview injection payload
- [x] `ctx sync` — rebuild SQLite index
- [x] `ctx connect` — обнаружение агентов + настройка
- [x] `ctx doctor` — диагностика
- [x] `ctx version` — версия

### 1.14 Тестирование ✅

- [x] 23 теста: config (3), frontmatter (1), store (5), patterns (5), budget (3), sync (2), E2E (3), smoke (1)
- [x] Build, typecheck, lint — всё зелёное
- [x] Benchmarks: FTS5 ~0.11ms, PreToolUse ~0.05ms, SessionStart ~2.4ms
- [ ] Test fixtures: hook input JSONs
- [ ] E2E тест: `ctx init` → `ctx add` → `ctx search` → найти
- [ ] E2E тест: PreToolUse hook со stdin JSON
- [ ] Coverage ≥ 70%

### 1.15 Публикация MVP

- [ ] Написать README.md (GIF-демо, Quick Start)
- [ ] `pnpm changeset` → version 0.1.0
- [ ] Проверить `npm pack` / `npx ctxvault init`
- [ ] Dogfooding (1 неделя)
- [ ] Опубликовать в npm
- [ ] Опубликовать skill на skills.sh

---

## Phase 2: Intelligence + Plugin + Distribution

### 2.1 Intelligence

- [ ] `ctx reflect --deep` — AI-рефлексия через Haiku
- [ ] `ctx defrag` — реорганизация памяти (dedup, split, archive)
- [ ] `ctx decay` — relevance decay
- [ ] Deep extract mode (LLM-анализ сессий)
- [ ] Import history из Claude Code / Codex
- [ ] `ctx deprecate <path>`
- [ ] `ctx edit <path>` (открыть в $EDITOR)
- [ ] FTS5 дедупликация в extraction

### 2.2 Claude Code Plugin

- [ ] `.claude-plugin/plugin.json` — манифест
- [ ] `commands/search.md` — `/ctxvault:search <query>`
- [ ] `commands/status.md` — `/ctxvault:status`
- [ ] `commands/reflect.md` — `/ctxvault:reflect`
- [ ] `commands/add.md` — `/ctxvault:add <type>`
- [ ] `commands/inject.md` — `/ctxvault:inject`
- [ ] `agents/memory-extractor.md` — субагент для рефлексии
- [ ] `hooks/hooks.json` — бандл hooks
- [ ] Skill внутри плагина
- [ ] Marketplace: `ctxvault/ctxvault-marketplace`
- [ ] Подача в `anthropics/claude-plugins-official`

### 2.3 Distribution

- [ ] Публикация на skills.sh
- [ ] Skill-only fallback mode (без CLI, через grep/find/cat)

---

## Phase 3: Growth

- [ ] Cursor hooks интеграция
- [ ] `ctx export` / `ctx import` между проектами
- [ ] Git hook integration (post-commit → auto-reflect)
- [ ] Web dashboard
- [ ] VS Code extension
- [ ] Дополнительные slash-команды для plugin
- [ ] Дополнительные субагенты
- [ ] Benchmarks (Context-Bench, LoCoMo)

---

## Чеклист готовности к запуску (Phase 1 MVP)

- [x] 2 пакета собираются без ошибок (core + cli)
- [x] 5 hooks Claude Code настраиваются автоматически
- [x] Agent Skill генерируется в `.agents/skills/ctxvault/`
- [x] FTS5 search работает с BM25 ranking
- [x] PreToolUse < 10ms (~0.05ms), SessionStart < 200ms (~2.4ms)
- [x] Auto-extract (lightweight) работает
- [x] 23 теста проходят
- [ ] Coverage ≥ 70%
- [ ] CI зелёный на всех платформах
- [ ] README с GIF-демо
- [ ] Dogfooding (1 неделя)
- [ ] npm publish
