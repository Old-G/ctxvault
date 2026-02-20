import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TranscriptSession {
  sessionId: string;
  agent: string;
  projectPath: string;
  messages: TranscriptMessage[];
}

interface ClaudeCodeLine {
  type: string;
  message?: {
    role: string;
    content: string | { type: string; text?: string }[];
  };
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
}

/**
 * Extracts text content from Claude Code message content field.
 */
function extractContent(content: string | { type: string; text?: string }[]): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text ?? '')
    .join('\n');
}

/**
 * Parses a Claude Code JSONL transcript file.
 */
export function parseClaudeCodeTranscript(filePath: string): TranscriptSession | null {
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());

  const messages: TranscriptMessage[] = [];
  let sessionId = '';
  let cwd = '';

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as ClaudeCodeLine;

      if (parsed.type === 'user' || parsed.type === 'assistant') {
        if (!sessionId && parsed.sessionId) sessionId = parsed.sessionId;
        if (!cwd && parsed.cwd) cwd = parsed.cwd;

        const content = parsed.message ? extractContent(parsed.message.content) : '';
        if (content.trim()) {
          messages.push({
            role: parsed.type,
            content: content.trim(),
            timestamp: parsed.timestamp ?? '',
          });
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  if (messages.length === 0) return null;

  return {
    sessionId: sessionId || basename(filePath, '.jsonl'),
    agent: 'claude-code',
    projectPath: cwd,
    messages,
  };
}

/**
 * Discovers Claude Code transcript files for the current project.
 */
export function discoverClaudeCodeTranscripts(projectRoot: string): string[] {
  const claudeDir = join(homedir(), '.claude', 'projects');
  if (!existsSync(claudeDir)) return [];

  // Claude Code encodes paths with dashes
  const encodedPath = projectRoot.replace(/\//g, '-');

  const projectDirs = readdirSync(claudeDir).filter((d) => d === encodedPath);
  const transcripts: string[] = [];

  for (const dir of projectDirs) {
    const dirPath = join(claudeDir, dir);
    const files = readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
    for (const file of files) {
      transcripts.push(join(dirPath, file));
    }
  }

  return transcripts.sort();
}

/**
 * Builds a single transcript string from session messages (for extraction).
 */
export function buildTranscriptText(session: TranscriptSession): string {
  return session.messages.map((m) => `[${m.role}]: ${m.content}`).join('\n\n');
}
