import { and, gte, lt, sql, type SQL } from 'drizzle-orm';
import { db } from './db';
import { workWindows } from './db/schema';
import { getSettings } from './settings';
import { getMarksBefore, getMarksInRange } from './dayMarks';
import { getRunningWindow } from './windows';
import { sweepOvernight } from './timer';
import { addDaysKey, dayKey, isWeekend, weekBounds } from '$lib/time';
import { computeSplit } from '$lib/stats';
import { isDayOff, type SideTotals, type Summary } from '$lib/types';

export { computeSplit };

/**
 * Flexitime balance over completed weeks: worked time minus (weekly target ÷ 5)
 * per tracked Mon–Fri day. Days marked off never add to the target.
 */
function getOvertime(
	now: number,
	weeklyHourTarget: number | null,
	weekStartDay: number,
	initialOvertimeHours: number
): Summary['overtime'] {
	const startMs = initialOvertimeHours * 3_600_000;
	if (!weeklyHourTarget) {
		return startMs !== 0 ? { balanceMs: startMs, weeks: 0, startMs } : null;
	}
	const currentWeekFrom = weekBounds(dayKey(now), weekStartDay).from;
	const rows = db
		.select({
			day: workWindows.day,
			total: sql<number>`sum(coalesce(${workWindows.endTs}, ${now}) - ${workWindows.startTs})`
		})
		.from(workWindows)
		.where(lt(workWindows.day, currentWeekFrom))
		.groupBy(workWindows.day)
		.all();
	const marked = getMarksBefore(currentWeekFrom);
	const perWeek = new Map<string, { total: number; weekdays: number }>();
	for (const row of rows) {
		const wk = weekBounds(row.day, weekStartDay).from;
		const acc = perWeek.get(wk) ?? { total: 0, weekdays: 0 };
		acc.total += row.total ?? 0;
		if (!isWeekend(row.day) && !isDayOff(marked.get(row.day))) acc.weekdays += 1;
		perWeek.set(wk, acc);
	}
	const dayTargetMs = (weeklyHourTarget / 5) * 3_600_000;
	let balanceMs = startMs;
	for (const { total, weekdays } of perWeek.values()) balanceMs += total - weekdays * dayTargetMs;
	return { balanceMs, weeks: perWeek.size, startMs };
}

function totals(now: number, ...conds: (SQL | undefined)[]): SideTotals {
	const rows = db
		.select({
			side: workWindows.side,
			total: sql<number>`sum(coalesce(${workWindows.endTs}, ${now}) - ${workWindows.startTs})`
		})
		.from(workWindows)
		.where(and(...conds))
		.groupBy(workWindows.side)
		.all();
	const result: SideTotals = { job: 0, phd: 0 };
	for (const row of rows) result[row.side] = row.total ?? 0;
	return result;
}

export function getSummary(day: string, now = Date.now()): Summary {
	sweepOvernight(now);
	const { targetJobPct, weekStartDay, weeklyHourTarget, initialOvertimeHours } = getSettings();
	const week = weekBounds(day, weekStartDay);

	const todayKey = dayKey(now);
	const dayTotals = totals(now, sql`${workWindows.day} = ${day}`);
	const todayTotals =
		day === todayKey ? dayTotals : totals(now, sql`${workWindows.day} = ${todayKey}`);
	const weekTotals = totals(now, gte(workWindows.day, week.from), lt(workWindows.day, week.to));
	const allTime = totals(now);
	const running = getRunningWindow();

	return {
		asOf: now,
		day: dayTotals,
		today: todayTotals,
		week: {
			...weekTotals,
			from: week.from,
			to: week.to,
			marks: getMarksInRange(week.from, addDaysKey(week.to, -1))
		},
		allTime,
		weekSplit: computeSplit(weekTotals, targetJobPct),
		allTimeSplit: computeSplit(allTime, targetJobPct),
		overtime: getOvertime(now, weeklyHourTarget, weekStartDay, initialOvertimeHours),
		running: running
			? { id: running.id, side: running.side, startTs: running.startTs, note: running.note }
			: null
	};
}
