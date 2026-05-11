export function truncate500(s: string): string {
  return s.length > 500 ? s.slice(0, 497) + '...' : s;
}

/**
 * Parse raw User-Agent string → short readable label.
 * "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0"
 * → "Chrome 124 / Windows 10"
 */
export function parseUserAgent(ua?: string): string {
  if (!ua) return 'Unknown';
  const browser =
    /Edg\/(\d+)/.exec(ua)     ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}` :
    /Chrome\/(\d+)/.exec(ua)  ? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}` :
    /Firefox\/(\d+)/.exec(ua) ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}` :
    /Safari\/(\d+)/.exec(ua)  ? 'Safari' : 'Unknown browser';
  const os =
    /Windows NT 10/.test(ua) ? 'Windows 10' :
    /Windows NT 11/.test(ua) ? 'Windows 11' :
    /Mac OS X/.test(ua)      ? 'macOS' :
    /Android/.test(ua)       ? 'Android' :
    /iPhone|iPad/.test(ua)   ? 'iOS' :
    /Linux/.test(ua)         ? 'Linux' : 'Unknown OS';
  return `${browser} / ${os}`;
}

/**
 * Build field-by-field diff string from two plain objects.
 * Only includes fields listed in fieldLabels.
 */
export function buildDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldLabels: Record<string, string>,
  valueFormatters?: Record<string, (v: unknown) => string>,
): string {
  const parts: string[] = [];
  for (const [key, label] of Object.entries(fieldLabels)) {
    const oldVal = before[key] ?? null;
    const newVal = after[key] ?? null;
    if (oldVal === newVal) continue;
    const fmt = valueFormatters?.[key] ?? ((v) => (v === null ? '(trống)' : `"${v}"`));
    if (oldVal === null || oldVal === '') {
      parts.push(`${label}: thêm ${fmt(newVal)}`);
    } else if (newVal === null || newVal === '') {
      parts.push(`${label}: xoá (trước: ${fmt(oldVal)})`);
    } else {
      parts.push(`${label}: ${fmt(oldVal)} → ${fmt(newVal)}`);
    }
  }
  return parts.length ? parts.join('; ') : 'không có thay đổi';
}

/** "Tạo {entityLabel} — Field1: val1, Field2: val2" */
export function detailCreate(entityLabel: string, fields: Record<string, string | null | undefined>): string {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`);
  return truncate500(`Tạo ${entityLabel}${parts.length ? ' — ' + parts.join(', ') : ''}`);
}

/** "Cập nhật {entityLabel} — {diff}" */
export function detailUpdate(
  entityLabel: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldLabels: Record<string, string>,
  valueFormatters?: Record<string, (v: unknown) => string>,
): string {
  return truncate500(`Cập nhật ${entityLabel} — ${buildDiff(before, after, fieldLabels, valueFormatters)}`);
}

/** "Đổi trạng thái {entityLabel} — OldLabel → NewLabel" */
export function detailStatusChange(
  entityLabel: string,
  oldStatus: string,
  newStatus: string,
  statusLabels: Record<string, string>,
): string {
  const oldLabel = statusLabels[oldStatus] ?? oldStatus;
  const newLabel = statusLabels[newStatus] ?? newStatus;
  return `Đổi trạng thái ${entityLabel} — ${oldLabel} → ${newLabel}`;
}

/** "Xóa {entityLabel}" or "Xóa {entityLabel} — {note}" */
export function detailDelete(entityLabel: string, note?: string): string {
  return note ? `Xóa ${entityLabel} — ${note}` : `Xóa ${entityLabel}`;
}
