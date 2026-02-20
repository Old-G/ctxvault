import { z } from 'zod';
import { MEMORY_TYPES } from '../memory/types.js';

const MemoryTypeEnum = z.enum(MEMORY_TYPES);

const injectionSchema = z.object({
  enabled: z.boolean().default(true),
  max_tokens: z.number().min(100).max(2000).default(500),
  include_types: z.array(MemoryTypeEnum).default([...MEMORY_TYPES]),
  exclude_tags: z.array(z.string()).default([]),
  always_include_system: z.boolean().default(true),
});

const contextualSchema = z.object({
  enabled: z.boolean().default(true),
  max_tokens: z.number().min(50).max(500).default(200),
  types: z.array(MemoryTypeEnum).default(['gotcha', 'solution']),
});

const extractSchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(['lightweight', 'deep']).default('lightweight'),
  min_session_messages: z.number().default(5),
});

const decaySchema = z.object({
  enabled: z.boolean().default(true),
  lambda: z.number().min(0).max(1).default(0.01),
  archive_threshold: z.number().default(0.2),
  delete_threshold: z.number().default(0.05),
  delete_min_age_days: z.number().default(90),
  pinned_types: z.array(z.string()).default(['system']),
});

const gitSchema = z.object({
  auto_commit: z.boolean().default(true),
  commit_prefix: z.string().default('ctx:'),
  sign_commits: z.boolean().default(false),
});

export const ConfigSchema = z
  .object({
    version: z.literal(1),
    project_name: z.string().optional(),
    language: z.enum(['auto', 'en', 'ru']).default('auto'),
    injection: injectionSchema.optional(),
    contextual: contextualSchema.optional(),
    extract: extractSchema.optional(),
    decay: decaySchema.optional(),
    agents: z
      .record(
        z.string(),
        z.object({
          enabled: z.union([z.boolean(), z.literal('auto')]).default('auto'),
          hooks: z.boolean().optional(),
          skill: z.boolean().optional(),
          mcp: z.boolean().optional(),
        }),
      )
      .default({}),
    git: gitSchema.optional(),
  })
  .transform((data) => ({
    ...data,
    injection: injectionSchema.parse(data.injection ?? {}),
    contextual: contextualSchema.parse(data.contextual ?? {}),
    extract: extractSchema.parse(data.extract ?? {}),
    decay: decaySchema.parse(data.decay ?? {}),
    git: gitSchema.parse(data.git ?? {}),
  }));

export type Config = z.output<typeof ConfigSchema>;
