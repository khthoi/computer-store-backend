import type { RunContext } from './types';

export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function interpolate(value: string, ctx: RunContext): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = ctx[key];
    return v !== undefined ? String(v) : `{{${key}}}`;
  });
}

export function interpolateAny(value: unknown, ctx: RunContext): unknown {
  if (typeof value === 'string') return interpolate(value, ctx);
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => interpolateAny(item, ctx));
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = typeof v === 'string' ? interpolate(v, ctx) : interpolateAny(v, ctx);
  }
  return result;
}

export function extractValues(
  body: unknown,
  extracts: Record<string, string>,
  ctx: RunContext,
): void {
  for (const [varName, path] of Object.entries(extracts)) {
    ctx[varName] = getByPath(body, path);
  }
}
