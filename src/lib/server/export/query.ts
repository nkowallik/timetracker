import { asc } from 'drizzle-orm';
import { db } from '../db';
import { workWindows } from '../db/schema';
import { getWindowsInRange } from '../windows';
import { getMarksInRange } from '../dayMarks';
import { sweepOvernight } from '../timer';
import { dayKey } from '$lib/time';
import type { DayMark, Side, WorkWindow } from '$lib/types';

export interface ExportFilter {
	from: string;
	to: string;
	side: Side | 'both';
}

export interface ExportWindow extends WorkWindow {
	effectiveEndTs: number; // endTs, or `now` for a running window
	running: boolean;
}

export function resolveFilter(params: URLSearchParams): ExportFilter {
	const first = db
		.select({ day: workWindows.day })
		.from(workWindows)
		.orderBy(asc(workWindows.day))
		.limit(1)
		.get();
	const today = dayKey(Date.now());
	const from = params.get('from') || first?.day || today;
	const to = params.get('to') || today;
	const side = params.get('side');
	return {
		from,
		to,
		side: side === 'job' || side === 'phd' ? side : 'both'
	};
}

export function getFilteredWindows(filter: ExportFilter, now = Date.now()): ExportWindow[] {
	sweepOvernight(now);
	const windows = getWindowsInRange(
		filter.from,
		filter.to,
		filter.side === 'both' ? undefined : filter.side
	);
	return windows.map((w) => ({
		...w,
		effectiveEndTs: w.endTs ?? now,
		running: w.endTs === null
	}));
}

export function getFilteredMarks(filter: ExportFilter): DayMark[] {
	return getMarksInRange(filter.from, filter.to);
}

export function exportFilename(filter: ExportFilter, ext: string): string {
	return `timetracker_${filter.from}_${filter.to}_${filter.side}.${ext}`;
}
