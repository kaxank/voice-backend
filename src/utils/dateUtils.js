// 📅 Ay anahtarı oluşturur
// 2026-01-12 → 2026-01
export function getMonthKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
}

import { parse, format, isValid } from 'date-fns';
import { tr } from 'date-fns/locale/tr';

export function resolveDate(dateText) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!dateText) {
    return format(today, 'yyyy-MM-dd');
  }

  const text = dateText.toLowerCase().trim();

  // Handle relative dates
  if (text.includes('today') || text.includes('bugün')) {
    return format(today, 'yyyy-MM-dd');
  }

  if (text.includes('yesterday') || text.includes('dün')) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return format(d, 'yyyy-MM-dd');
  }

  if (text.includes('tomorrow') || text.includes('yarın')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return format(d, 'yyyy-MM-dd');
  }

  // Try parsing specific date formats
  const formats = [
    'd MMMM yyyy',    // 11 Aralık 2025
    'd MMMM',          // 22 mayıs (assumes current year)
    'd MMM',           // 22 may (short month)
    'MMMM d',          // aralık 13 (assumes current year)
    'MMM d',           // ara 13 (short month)
    'yyyy-MM-dd',      // 2025-12-11
    'dd.MM.yyyy',      // 11.12.2025
    'dd/MM/yyyy',      // 11/12/2025
    'd MMMM yyyy',     // 11 Aralık 25 (with 2-digit year)
    'd MMMM yy'        // 11 Aralık 25 (with 2-digit year)
  ];

  for (const fmt of formats) {
    try {
      const parsedDate = parse(text, fmt, today, { locale: tr });
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy-MM-dd');
      }
    } catch (e) {
      // Try next format
    }
  }

  // Try native Date parsing as fallback
  try {
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch (e) {
    // Fall through to default
  }

  // If all else fails, return today's date
  return format(today, 'yyyy-MM-dd');
}