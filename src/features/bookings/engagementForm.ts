/** Shared form rules for public posts and private chat offers. Times are Philippine time. */
export const BASE_SERVICES = ['Cleaning', 'Child_care', 'Cooking', 'Caregiver', 'Laundry'] as const;
export const SERVICE_OPTIONS = [...BASE_SERVICES, 'All-around'];
export const SERVICE_CHOICES = [
  { id: 'Cleaning', label: 'Cleaning', icon: 'sparkles' },
  { id: 'Child_care', label: 'Child Care', icon: 'happy' },
  { id: 'Cooking', label: 'Cooking', icon: 'restaurant' },
  { id: 'Caregiver', label: 'Caregiver', icon: 'heart' },
  { id: 'Laundry', label: 'Laundry', icon: 'shirt' },
  { id: 'All-around', label: 'All-around', icon: 'home' },
] as const;

export function normalizeServices(values: readonly string[]): string[] {
  const unique = [...new Set(values)].filter(value => SERVICE_OPTIONS.includes(value));
  return unique.includes('All-around') || BASE_SERVICES.every(value => unique.includes(value))
    ? ['All-around'] : unique;
}

export function toggleService(values: readonly string[], value: string): string[] {
  if (!SERVICE_OPTIONS.includes(value)) return normalizeServices(values);
  const current = normalizeServices(values);
  if (value === 'All-around') return current.includes(value) ? [] : [value];
  if (current.includes('All-around')) return [value];
  return normalizeServices(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
}

export const WORK_DAYS = [
  { value: 'M', label: 'Mon' }, { value: 'T', label: 'Tue' }, { value: 'W', label: 'Wed' },
  { value: 'Th', label: 'Thu' }, { value: 'F', label: 'Fri' }, { value: 'S', label: 'Sat' },
  { value: 'Su', label: 'Sun' },
] as const;

export const WORK_SHIFTS = [
  { value: 'morning', label: 'Morning', hours: '08:00 AM - 12:00 PM' },
  { value: 'afternoon', label: 'Afternoon', hours: '12:00 PM - 05:00 PM' },
  { value: 'night', label: 'Night', hours: '05:00 PM - 09:00 PM' },
] as const;
export type WorkShift = typeof WORK_SHIFTS[number]['value'];

export function bookingSchedule(date: string, clockText: string): { iso: string; clock: string } {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const time = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clockText.trim());
  if (!match || !time) throw new Error('Select valid dates and working hours.');
  const [, month = '', day = '', year = ''] = match;
  const hour = Number(time[1]); const minute = Number(time[2]);
  if (hour < 1 || hour > 12 || minute > 59) throw new Error('Select valid working hours.');
  const hour24 = hour % 12 + (time[3]?.toUpperCase() === 'PM' ? 12 : 0);
  const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)) throw new Error('Select a valid calendar date.');
  const clockValue = String(hour24).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ':00';
  return { iso: new Date(year + '-' + month + '-' + day + 'T' + clockValue + '+08:00').toISOString(), clock: clockValue };
}

export function dayForDate(date: string): string {
  const stamp = bookingSchedule(date, '12:00 PM');
  return ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'][new Date(stamp.iso).getUTCDay()]!;
}

export interface EngagementSchedule {
  bookingType: 'short_term' | 'long_term';
  startDate: string;
  endDate: string;
  workHours: string;
  days: readonly string[];
  shift: WorkShift | null;
}

export function buildEngagementSchedule(form: EngagementSchedule, now = Date.now()) {
  const short = form.bookingType === 'short_term';
  const shift = WORK_SHIFTS.find(item => item.value === form.shift);
  if (short && !shift) throw new Error('Select Morning, Afternoon or Night.');
  const hours = short ? shift!.hours : form.workHours;
  const [startClock = '', endClock = ''] = hours.split(' - ');
  const start = bookingSchedule(form.startDate, startClock);
  const end = bookingSchedule(short ? form.startDate : form.endDate, endClock);
  if (start.clock >= end.clock) throw new Error('Daily work hours must end after they start.');
  if (Date.parse(start.iso) <= now) throw new Error('Choose a start date and shift that have not passed.');
  if (Date.parse(end.iso) <= Date.parse(start.iso)) throw new Error('Choose an end after the start.');
  if (!short && Date.parse(end.iso) - Date.parse(start.iso) < 86400000) throw new Error('Long-term work must last at least 24 hours.');
  const days = WORK_DAYS.filter(item => form.days.includes(item.value)).map(item => item.value);
  if (!short && !days.length) throw new Error('Select at least one working day.');
  if (!short && !days.includes(dayForDate(form.startDate) as typeof days[number])) throw new Error('The start date must fall on a selected working day.');
  return {
    start_time: start.iso, end_time: end.iso, daily_start_time: start.clock, daily_end_time: end.clock,
    work_days: short ? [dayForDate(form.startDate)] : days,
  };
}
