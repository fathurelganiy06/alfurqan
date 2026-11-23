import { Course } from '../types/siakad';

export const CAMPUS_LOGO_URL = '/assets/aistudio/mpf7gSSp_400x400_94d048f9.jpg';
export const CURRENT_ACADEMIC_YEAR = '2026/2027';
export const MAX_KRS_SKS = 24;

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatDateID(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateLongID(dateStr?: string): string {
  const d = dateStr
    ? new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr)
    : new Date();
  if (Number.isNaN(d.getTime())) return dateStr || '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export interface ScheduleConflict {
  courseA: Course;
  courseB: Course;
  reason: string;
}

export function coursesConflict(a: Course, b: Course): boolean {
  if (a.id === b.id) return false;
  if (a.hari !== b.hari) return false;
  const startA = parseTimeToMinutes(a.jam_mulai);
  const endA = parseTimeToMinutes(a.jam_selesai);
  const startB = parseTimeToMinutes(b.jam_mulai);
  const endB = parseTimeToMinutes(b.jam_selesai);
  return startA < endB && startB < endA;
}

export function detectScheduleConflicts(selectedCourses: Course[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < selectedCourses.length; i++) {
    for (let j = i + 1; j < selectedCourses.length; j++) {
      const a = selectedCourses[i];
      const b = selectedCourses[j];
      if (coursesConflict(a, b)) {
        conflicts.push({
          courseA: a,
          courseB: b,
          reason: `Bentrok hari ${a.hari}: ${a.nama_mk} (${a.jam_mulai}–${a.jam_selesai}) bertabrakan dengan ${b.nama_mk} (${b.jam_mulai}–${b.jam_selesai})`,
        });
      }
    }
  }
  return conflicts;
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36).slice(-5);
  return `${prefix}-${ts}${rand}`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
