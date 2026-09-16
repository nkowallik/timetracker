import type { DayMark } from '$lib/types';
import type { ExportWindow } from './query';

function esc(value: string): string {
	return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function clock(ts: number): string {
	const d = new Date(ts);
	return [d.getHours(), d.getMinutes(), d.getSeconds()]
		.map((n) => String(n).padStart(2, '0'))
		.join(':');
}

export function toCsv(windows: ExportWindow[], marks: DayMark[] = []): string {
	// day marks are rows of their own, sorted before that day's windows
	const rows = [
		...marks.map((m) => ({
			day: m.day,
			ts: -Infinity,
			line: [m.day, m.type, '', '', '0.0', esc(m.note ?? '')].join(',')
		})),
		...windows.map((w) => ({
			day: w.day,
			ts: w.startTs,
			line: [
				w.day,
				w.side,
				clock(w.startTs),
				w.running ? '' : clock(w.effectiveEndTs),
				((w.effectiveEndTs - w.startTs) / 60000).toFixed(1),
				esc(w.note ?? '')
			].join(',')
		}))
	].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.ts - b.ts));
	const lines = ['date,side,start,end,duration_minutes,note', ...rows.map((r) => r.line)];
	return lines.join('\r\n') + '\r\n';
}
