import { eq } from 'drizzle-orm';
import { db } from './db';
import { settings as settingsTable } from './db/schema';
import { clearDayMarks, getAutoMarks, getDayMark, setDayMark } from './dayMarks';
import { germanHolidays, type GermanState } from '$lib/holidays';
import { isWeekend } from '$lib/time';

// bookkeeping row; getSettings() drops keys starting with '_'
const SYNC_KEY = '_holidaySync';

function syncStamp(state: GermanState | null, year: number): string {
	return `${state ?? 'none'}:${year}`;
}

/**
 * Regenerate the automatic holiday marks for the configured state (current and
 * next year) and drop stale ones. Hand-set marks are never touched.
 */
export function syncPublicHolidays(
	state: GermanState | null,
	now = Date.now()
): { added: number; removed: number } {
	const year = new Date(now).getFullYear();
	const auto = getAutoMarks();
	const years = new Set<number>([year, year + 1]);
	for (const m of auto) years.add(Number(m.day.slice(0, 4)));

	const wanted = new Map<string, string>(); // day → holiday name
	if (state) {
		for (const y of years) {
			for (const h of germanHolidays(y, state)) if (!isWeekend(h.day)) wanted.set(h.day, h.name);
		}
	}

	const stale = auto.filter((m) => !wanted.has(m.day)).map((m) => m.day);
	clearDayMarks(stale);

	let added = 0;
	for (const [day, name] of wanted) {
		const current = getDayMark(day);
		if (current === null) {
			setDayMark(day, 'holiday', name, 'auto');
			added++;
		} else if (current.source === 'auto' && current.note !== name) {
			setDayMark(day, 'holiday', name, 'auto');
		}
	}

	db.insert(settingsTable)
		.values({ key: SYNC_KEY, value: JSON.stringify(syncStamp(state, year)) })
		.onConflictDoUpdate({
			target: settingsTable.key,
			set: { value: JSON.stringify(syncStamp(state, year)) }
		})
		.run();
	return { added, removed: stale.length };
}

/** Sync once per state and calendar year. */
export function ensurePublicHolidays(state: GermanState | null, now = Date.now()): void {
	const row = db.select().from(settingsTable).where(eq(settingsTable.key, SYNC_KEY)).get();
	let last: string | null = null;
	try {
		last = row ? (JSON.parse(row.value) as string) : null;
	} catch {
		last = null;
	}
	if (last !== syncStamp(state, new Date(now).getFullYear())) syncPublicHolidays(state, now);
}
