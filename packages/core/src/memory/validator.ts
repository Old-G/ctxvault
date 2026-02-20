import { z } from 'zod';
import { MEMORY_TYPES } from './types.js';

export const FrontmatterSchema = z.object({
  type: z.enum(MEMORY_TYPES),
  tags: z.array(z.string()),
  relevance: z.number().min(0).max(1),
  created: z.string(),
  updated: z.string(),
  source_agent: z.string().optional(),
  source_session: z.string().optional(),
  related_files: z.array(z.string()).optional(),
  summary: z.string().max(200),
});

export const CreateMemoryInputSchema = z.object({
  type: z.enum(MEMORY_TYPES),
  summary: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()),
  relatedFiles: z.array(z.string()).optional(),
  sourceAgent: z.string().optional(),
  sourceSession: z.string().optional(),
});
