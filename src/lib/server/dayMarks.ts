import { and, asc, eq, gte, lt, lte } from 'drizzle-orm';
import { db } from './db';
import { dayMarks } from './db/schema';
import { ValidationError } from './windows';
import { addDaysKey, isWeekend } from '$lib/time';
import { DAY_MARK_TYPES, type DayMark, type DayMarkType, type MarkRangeResult } from '$lib/types';

function toDto(row: typeof dayMarks.$inferSelect): DayMark {
	return { day: row.day, type: row.type, note: row.note, source: row.source ?? null };
}

export function getDayMark(day: string): DayMark | null {
	const row = db.select().from(dayMarks).where(eq(dayMarks.day, day)).get();
	return row ? toDto(row) : null;
}

/** Marks with fromDay ≤ day ≤ toDay, ordered by day. */
export function getMarksInRange(fromDay: string, toDay: string): DayMark[] {
	return db
		.select()
		.from(dayMarks)
		.where(and(gte(dayMarks.day, fromDay), lte(dayMarks.day, toDay)))
		.orderBy(asc(dayMarks.day))
		.all()
		.map(toDto);
}

/** Marks before `day` as a day → type map. */
export function getMarksBefore(day: string): Map<string, DayMarkType> {
	const rows = db.select().from(dayMarks).where(lt(dayMarks.day, day)).all();
	return new Map(rows.map((r) => [r.day, r.type]));
}

/** Every automatically generated public-holiday mark. */
export function getAutoMarks(): DayMark[] {
	return db.select().from(dayMarks).where(eq(dayMarks.source, 'auto')).all().map(toDto);
}

export function setDayMark(
	day: string,
	type: DayMarkType,
	note?: string | null,
	source: 'auto' | null = null
): DayMark {
	if (!DAY_MARK_TYPES.includes(type))
		throw new ValidationError(`type must be one of: ${DAY_MARK_TYPES.join(', ')}`);
	const values = { day, type, note: note?.trim() || null, source, createdAt: Date.now() };
	const row = db
		.insert(dayMarks)
		.values(values)
		.onConflictDoUpdate({
			target: dayMarks.day,
			set: { type: values.type, note: values.note, source: values.source }
		})
		.returning()
		.get();
	return toDto(row);
}

export function clearDayMark(day: string): void {
	db.delete(dayMarks).where(eq(dayMarks.day, day)).run();
}

export function clearDayMarks(days: string[]): void {
	if (days.length === 0) return;
	db.transaction((tx) => {
		for (const day of days) tx.delete(dayMarks).where(eq(dayMarks.day, day)).run();
	});
}

const MAX_RANGE_DAYS = 366;

/** Mark every working day in the range; weekends and public holidays are skipped, other marks replaced. */
export function markDayRange(
	from: string,
	to: string,
	type: DayMarkType,
	note?: string | null
): MarkRangeResult {
	if (!DAY_MARK_TYPES.includes(type))
		throw new ValidationError(`type must be one of: ${DAY_MARK_TYPES.join(', ')}`);
	if (to < from) throw new ValidationError('the end date must not be before the start date');
	const existing = new Map(getMarksInRange(from, to).map((m) => [m.day, m]));
	const result: MarkRangeResult = { marked: [], skipped: [] };
	const cleanNote = note?.trim() || null;
	db.transaction((tx) => {
		let count = 0;
		for (let day = from; day <= to; day = addDaysKey(day, 1)) {
			if (++count > MAX_RANGE_DAYS)
				throw new ValidationError(`a range can cover at most ${MAX_RANGE_DAYS} days`);
			if (isWeekend(day)) {
				result.skipped.push({ day, reason: 'weekend' });
				continue;
			}
			if (existing.get(day)?.type === 'holiday' && type !== 'holiday') {
				result.skipped.push({ day, reason: 'holiday' });
				continue;
			}
			tx.insert(dayMarks)
				.values({ day, type, note: cleanNote, source: null, createdAt: Date.now() })
				.onConflictDoUpdate({
					target: dayMarks.day,
					set: { type, note: cleanNote, source: null }
				})
				.run();
			result.marked.push(day);
		}
	});
	return result;
}
