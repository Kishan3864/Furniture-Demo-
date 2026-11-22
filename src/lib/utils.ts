import { clsx, type ClassValue } from 'clsx';
import { differenceInCalendarDays, format, parseISO, isValid } from 'date-fns';
import type { LengthUnit, Naap, StageDef } from './types';
import { tr } from './i18n';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

export function fmtDate(s?: string | number | null, pattern = 'dd MMM yyyy'): string {
  if (s === null || s === undefined || s === '') return '-';
  const d = typeof s === 'number' ? new Date(s) : parseDate(s);
  return d && isValid(d) ? format(d, pattern) : '-';
}

export function fmtDateTime(ms?: number | null): string {
  if (!ms) return '-';
  return format(new Date(ms), 'dd MMM yyyy, hh:mm a');
}

/** Days from today to date (negative = past). */
export function daysLeft(s?: string | null): number | null {
  const d = parseDate(s);
  if (!d) return null;
  return differenceInCalendarDays(d, new Date());
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export function money(n?: number | null): string {
  return `₹${inr.format(Math.round(n || 0))}`;
}

export function num(n?: number | null): string {
  return inr.format(n || 0);
}

export function orderNo(n: number): string {
  return `WB-${String(n).padStart(4, '0')}`;
}

export function receiptNo(n: number): string {
  return `RC-${String(n).padStart(4, '0')}`;
}

export function randomToken(len = 20): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 1e9);
  return Array.from(arr, (x) => chars[x % chars.length]).join('');
}

export function naapText(n?: Naap | null): string {
  if (!n) return '-';
  const u = n.unit === 'inch' ? '"' : "'";
  const parts = [n.l, n.w, n.h].map((v) => (v === null || v === undefined ? '?' : `${v}${u}`));
  if (parts.every((p) => p === '?')) return '-';
  return `${parts[0]} x ${parts[1]} x ${parts[2]}`;
}

export function convertLen(v: number | null, from: LengthUnit, to: LengthUnit): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  if (from === to) return v;
  const r = from === 'ft' ? v * 12 : v / 12;
  return Math.round(r * 100) / 100;
}

export function cleanPhone(p: string): string {
  const d = (p || '').replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith('0')) return `91${d.slice(1)}`;
  return d;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`;
}

export function appUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function stagePercent(stages: StageDef[], index: number): number {
  return stages[index]?.percent ?? 0;
}

export function isDeliveredIdx(stages: StageDef[], index: number): boolean {
  return index >= stages.length - 1;
}

export function isReadyIdx(stages: StageDef[], index: number): boolean {
  return index === stages.length - 2;
}

export function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
}

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function monthKey(s: string): string {
  return s?.slice(0, 7) || '';
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const PAY_MODE_LABEL: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank',
};

/** User-friendly (translated) message for Firebase / app errors. */
export function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = String((e as { code: string }).code);
    const map: Record<string, string> = {
      'auth/invalid-credential': 'Wrong email or password',
      'auth/invalid-login-credentials': 'Wrong email or password',
      'auth/wrong-password': 'Wrong password',
      'auth/user-not-found': 'Account not found',
      'auth/email-already-in-use': 'This email is already in use',
      'auth/weak-password': 'Password must be at least 6 characters',
      'auth/invalid-email': 'Invalid email',
      'auth/too-many-requests': 'Too many attempts, please try again later',
      'auth/network-request-failed': 'Check your internet connection',
      'auth/requires-recent-login': 'Please sign in again and retry',
      'permission-denied': 'You do not have permission',
      unavailable: 'You are offline - it will sync when internet is back',
    };
    if (map[code]) return tr(map[code]);
  }
  if (e instanceof Error) return tr(e.message);
  return tr('Something went wrong');
}
