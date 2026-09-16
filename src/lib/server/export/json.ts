import { getSettings } from '../settings';
import { computeSplit } from '../summary';
import { weekBounds, fmtClock } from '$lib/time';
import type { DayMark, SideTotals } from '$lib/types';
import type { ExportFilter, ExportWindow } from './query';

export function aggregate(windows: ExportWindow[], weekStartDay: number) {
	const perDay: Record<string, SideTotals> = {};
	const perWeek: Record<string, SideTotals> = {};
	const perSide: SideTotals = { job: 0, phd: 0 };
	for (const w of windows) {
		const ms = w.effectiveEndTs - w.startTs;
		const week = weekBounds(w.day, weekStartDay).from;
		(perDay[w.day] ??= { job: 0, phd: 0 })[w.side] += ms;
		(perWeek[week] ??= { job: 0, phd: 0 })[w.side] += ms;
		perSide[w.side] += ms;
	}
	return { perDay, perWeek, perSide };
}

export function toJsonExport(windows: ExportWindow[], filter: ExportFilter, marks: DayMark[] = []) {
	const settings = getSettings();
	const totals = aggregate(windows, settings.weekStartDay);
	return {
		exportedAt: new Date().toISOString(),
		filter,
		settings,
		windows: windows.map((w) => ({
			id: w.id,
			side: w.side,
			day: w.day,
			start: fmtClock(w.startTs),
			end: w.running ? null : fmtClock(w.effectiveEndTs),
			startTs: w.startTs,
			endTs: w.endTs,
			durationMs: w.effectiveEndTs - w.startTs,
			note: w.note,
			running: w.running
		})),
		dayMarks: marks,
		totals: {
			...totals,
			split: computeSplit(totals.perSide, settings.targetJobPct)
		}
	};
}
