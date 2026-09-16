// Day keys are YYYY-MM-DD strings in the process-local timezone.

export function dayKey(d: Date | number): string {
	const date = typeof d === 'number' ? new Date(d) : d;
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function dayStart(day: string): Date {
	const [y, m, d] = day.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function dayStartMs(day: string): number {
	return dayStart(day).getTime();
}

export function dayEndMs(day: string): number {
	return addDays(dayStart(day), 1).getTime();
}

export function addDays(d: Date, n: number): Date {
	const copy = new Date(d);
	copy.setDate(copy.getDate() + n);
	return copy;
}

export function addDaysKey(day: string, n: number): string {
	return dayKey(addDays(dayStart(day), n));
}

export function isWeekend(day: string): boolean {
	const dow = dayStart(day).getDay();
	return dow === 0 || dow === 6;
}

/** Mon–Fri days from `from` through `day` inclusive, capped at one week. */
export function weekdaysThrough(from: string, day: string): number {
	let count = 0;
	let cur = from;
	for (let i = 0; i < 7 && cur <= day; i++) {
		if (!isWeekend(cur)) count++;
		cur = addDaysKey(cur, 1);
	}
	return count;
}

/** Week containing `day`: from (inclusive) and to (exclusive). */
export function weekBounds(day: string, weekStartDay: number): { from: string; to: string } {
	const d = dayStart(day);
	const diff = (d.getDay() - weekStartDay + 7) % 7;
	const from = addDays(d, -diff);
	return { from: dayKey(from), to: dayKey(addDays(from, 7)) };
}

export function dayTimeToMs(day: string, hhmm: string): number {
	const [h, min] = hhmm.split(':').map(Number);
	const d = dayStart(day);
	d.setHours(h, min, 0, 0);
	return d.getTime();
}

/** Parse "9:30", "9.30", "9", "930" or "1400" into "HH:MM"; null if invalid. */
export function parseClock(input: string): string | null {
	const s = input.trim();
	let h: number;
	let m: number;
	const colon = s.match(/^(\d{1,2})[:.](\d{1,2})$/);
	if (colon) {
		h = Number(colon[1]);
		m = Number(colon[2]);
	} else if (/^\d{1,4}$/.test(s)) {
		if (s.length <= 2) {
			h = Number(s);
			m = 0;
		} else {
			h = Number(s.slice(0, -2));
			m = Number(s.slice(-2));
		}
	} else {
		return null;
	}
	if (h > 23 || m > 59) return null;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmtClock(ts: number): string {
	const d = new Date(ts);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDuration(ms: number): string {
	const totalMin = Math.floor(ms / 60000);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return `${h}:${String(m).padStart(2, '0')}`;
}

export function fmtDurationSec(ms: number): string {
	const totalSec = Math.floor(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtHours(ms: number): string {
	return (ms / 3600000).toFixed(1);
}
