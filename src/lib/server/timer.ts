import { eq } from 'drizzle-orm';
import { db } from './db';
import { workWindows } from './db/schema';
import { splitByMidnight } from '$lib/split';
import { dayKey } from '$lib/time';
import { getRunningWindow } from './windows';
import type { Side, WorkWindow } from '$lib/types';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Close the running window at `now`, splitting at midnights. */
function closeRunning(tx: Tx, running: WorkWindow, now: number): WorkWindow {
	const end = Math.max(now, running.startTs + 1);
	const segments = splitByMidnight(running.startTs, end);
	const first = segments[0];
	tx.update(workWindows)
		.set({ day: first.day, startTs: first.startTs, endTs: first.endTs })
		.where(eq(workWindows.id, running.id))
		.run();
	let last = { ...running, day: first.day, startTs: first.startTs, endTs: first.endTs };
	for (const seg of segments.slice(1)) {
		const row = tx
			.insert(workWindows)
			.values({
				side: running.side,
				day: seg.day,
				startTs: seg.startTs,
				endTs: seg.endTs,
				note: running.note,
				createdAt: now
			})
			.returning()
			.get();
		last = { id: row.id, side: row.side, day: row.day, startTs: row.startTs, endTs: seg.endTs, note: row.note };
	}
	return last;
}

/** Close the past-day segments of an overnight timer and re-anchor it at today's midnight. */
export function sweepOvernight(now = Date.now()): void {
	const running = getRunningWindow();
	if (!running || running.day === dayKey(now)) return;
	db.transaction((tx) => {
		const closed = closeRunning(tx, running, now);
		tx.update(workWindows)
			.set({ endTs: null })
			.where(eq(workWindows.id, closed.id))
			.run();
	});
}

export function startTimer(
	side: Side,
	note?: string | null,
	now = Date.now()
): { started: WorkWindow; stopped: WorkWindow | null } {
	const running = getRunningWindow();
	if (running && running.side === side) {
		return { started: running, stopped: null };
	}
	return db.transaction((tx) => {
		const stopped = running ? closeRunning(tx, running, now) : null;
		const row = tx
			.insert(workWindows)
			.values({
				side,
				day: dayKey(now),
				startTs: now,
				endTs: null,
				note: note?.trim() || null,
				createdAt: now
			})
			.returning()
			.get();
		return {
			started: { id: row.id, side: row.side, day: row.day, startTs: row.startTs, endTs: row.endTs, note: row.note },
			stopped
		};
	});
}

export function stopTimer(now = Date.now()): WorkWindow | null {
	const running = getRunningWindow();
	if (!running) return null;
	return db.transaction((tx) => closeRunning(tx, running, now));
}
