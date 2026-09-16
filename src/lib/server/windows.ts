import { and, asc, eq, gte, isNull, lt, lte, ne, or } from 'drizzle-orm';
import { db } from './db';
import { workWindows } from './db/schema';
import { splitByMidnight, rangesOverlap } from '$lib/split';
import type { Side, WorkWindow } from '$lib/types';

export class ValidationError extends Error {}
export class OverlapError extends Error {}

function toDto(row: typeof workWindows.$inferSelect): WorkWindow {
	return {
		id: row.id,
		side: row.side,
		day: row.day,
		startTs: row.startTs,
		endTs: row.endTs,
		note: row.note
	};
}

export function getWindowsForDay(day: string): WorkWindow[] {
	return db
		.select()
		.from(workWindows)
		.where(eq(workWindows.day, day))
		.orderBy(asc(workWindows.startTs))
		.all()
		.map(toDto);
}

export function getWindowsInRange(fromDay: string, toDay: string, side?: Side): WorkWindow[] {
	const conds = [gte(workWindows.day, fromDay), lte(workWindows.day, toDay)];
	if (side) conds.push(eq(workWindows.side, side));
	return db
		.select()
		.from(workWindows)
		.where(and(...conds))
		.orderBy(asc(workWindows.day), asc(workWindows.startTs))
		.all()
		.map(toDto);
}

export function getRunningWindow(): WorkWindow | null {
	const row = db.select().from(workWindows).where(isNull(workWindows.endTs)).get();
	return row ? toDto(row) : null;
}

/** Reject overlap with a same-side window; a running window extends to `now`. */
function assertNoSameSideOverlap(
	side: Side,
	startTs: number,
	endTs: number,
	excludeId?: number
): void {
	const now = Date.now();
	const conds = [
		eq(workWindows.side, side),
		lt(workWindows.startTs, endTs),
		or(isNull(workWindows.endTs), gte(workWindows.endTs, startTs))
	];
	if (excludeId !== undefined) conds.push(ne(workWindows.id, excludeId));
	const candidates = db
		.select()
		.from(workWindows)
		.where(and(...conds))
		.all();
	for (const c of candidates) {
		if (rangesOverlap(startTs, endTs, c.startTs, c.endTs ?? Math.max(now, c.startTs + 1))) {
			throw new OverlapError(
				`Overlaps an existing ${side} window on ${c.day} — adjust the times.`
			);
		}
	}
}

/** Insert a closed window split at midnights; returns one window per day touched. */
export function createWindow(input: {
	side: Side;
	startTs: number;
	endTs: number;
	note?: string | null;
}): WorkWindow[] {
	if (input.endTs <= input.startTs) throw new ValidationError('End must be after start.');
	assertNoSameSideOverlap(input.side, input.startTs, input.endTs);
	const segments = splitByMidnight(input.startTs, input.endTs);
	const now = Date.now();
	return db.transaction((tx) =>
		segments.map((seg) =>
			toDto(
				tx
					.insert(workWindows)
					.values({
						side: input.side,
						day: seg.day,
						startTs: seg.startTs,
						endTs: seg.endTs,
						note: input.note?.trim() || null,
						createdAt: now
					})
					.returning()
					.get()
			)
		)
	);
}

export function updateWindow(
	id: number,
	patch: { side?: Side; startTs?: number; endTs?: number; note?: string | null }
): WorkWindow[] {
	const existing = db.select().from(workWindows).where(eq(workWindows.id, id)).get();
	if (!existing) throw new ValidationError('Window not found.');

	const side = patch.side ?? existing.side;
	const startTs = patch.startTs ?? existing.startTs;
	// setting an end on a running window stops it
	const endTs = patch.endTs !== undefined ? patch.endTs : existing.endTs;
	const note = patch.note !== undefined ? patch.note?.trim() || null : existing.note;

	if (endTs === null) {
		// still running: only start/note/side may change
		if (startTs > Date.now()) throw new ValidationError('Start of a running timer cannot be in the future.');
		const row = db
			.update(workWindows)
			.set({ side, startTs, day: splitByMidnight(startTs, startTs + 1)[0].day, note })
			.where(eq(workWindows.id, id))
			.returning()
			.get();
		return [toDto(row)];
	}

	if (endTs <= startTs) throw new ValidationError('End must be after start.');
	assertNoSameSideOverlap(side, startTs, endTs, id);
	const segments = splitByMidnight(startTs, endTs);

	return db.transaction((tx) => {
		const first = tx
			.update(workWindows)
			.set({ side, day: segments[0].day, startTs: segments[0].startTs, endTs: segments[0].endTs, note })
			.where(eq(workWindows.id, id))
			.returning()
			.get();
		const rest = segments.slice(1).map((seg) =>
			tx
				.insert(workWindows)
				.values({ side, day: seg.day, startTs: seg.startTs, endTs: seg.endTs, note, createdAt: Date.now() })
				.returning()
				.get()
		);
		return [first, ...rest].map(toDto);
	});
}

export function deleteWindow(id: number): void {
	db.delete(workWindows).where(eq(workWindows.id, id)).run();
}
