import { encodingForModel } from 'js-tiktoken';

let encoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder(): ReturnType<typeof encodingForModel> {
  encoder ??= encodingForModel('gpt-4o');
  return encoder;
}

export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}

export function fitWithinBudget(items: string[], maxTokens: number): string[] {
  const result: string[] = [];
  let used = 0;

  for (const item of items) {
    const tokens = countTokens(item);
    if (used + tokens > maxTokens) break;
    result.push(item);
    used += tokens;
  }

  return result;
}
