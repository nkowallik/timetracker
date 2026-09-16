import { and, gte, lte, sql } from 'drizzle-orm';
import { db } from './db';
import { workWindows } from './db/schema';
import { getMarksInRange } from './dayMarks';
import { getSettings } from './settings';
import { sweepOvernight } from './timer';
import { dayKey } from '$lib/time';
import type { MonthOverview, SideTotals } from '$lib/types';

/** Tracked time per day and every mark of a month (YYYY-MM), for the overview modal. */
export function getMonthOverview(month: string, now = Date.now()): MonthOverview {
	sweepOvernight(now);
	const { weekStartDay, weeklyHourTarget, dailyHourTarget } = getSettings();
	const from = `${month}-01`;
	const to = `${month}-31`; // day keys are zero-padded, so string comparison is safe
	const rows = db
		.select({
			day: workWindows.day,
			side: workWindows.side,
			total: sql<number>`sum(coalesce(${workWindows.endTs}, ${now}) - ${workWindows.startTs})`
		})
		.from(workWindows)
		.where(and(gte(workWindows.day, from), lte(workWindows.day, to)))
		.groupBy(workWindows.day, workWindows.side)
		.all();
	const days: Record<string, SideTotals> = {};
	for (const row of rows) (days[row.day] ??= { job: 0, phd: 0 })[row.side] = row.total ?? 0;
	const dayTargetHours = weeklyHourTarget !== null ? weeklyHourTarget / 5 : dailyHourTarget;
	return {
		month,
		days,
		marks: getMarksInRange(from, to),
		dayTargetMs: dayTargetHours !== null ? dayTargetHours * 3_600_000 : null,
		weekStartDay,
		today: dayKey(now)
	};
}
