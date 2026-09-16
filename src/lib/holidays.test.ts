import { describe, expect, it } from 'vitest';
import { bussUndBettag, easterSunday, germanHolidays, GERMAN_STATES } from './holidays';
import { dayKey } from './time';

describe('easterSunday', () => {
	it('matches known dates', () => {
		expect(dayKey(easterSunday(2024))).toBe('2024-03-31');
		expect(dayKey(easterSunday(2025))).toBe('2025-04-20');
		expect(dayKey(easterSunday(2026))).toBe('2026-04-05');
		expect(dayKey(easterSunday(2027))).toBe('2027-03-28');
		expect(dayKey(easterSunday(2038))).toBe('2038-04-25'); // latest possible
	});
});

describe('bussUndBettag', () => {
	it('is the Wednesday before 23 November', () => {
		expect(dayKey(bussUndBettag(2024))).toBe('2024-11-20');
		expect(dayKey(bussUndBettag(2025))).toBe('2025-11-19');
		expect(dayKey(bussUndBettag(2026))).toBe('2026-11-18');
		for (let y = 2020; y < 2040; y++) expect(bussUndBettag(y).getDay()).toBe(3);
	});
});

describe('germanHolidays', () => {
	const days = (year: number, state: Parameters<typeof germanHolidays>[1]) =>
		germanHolidays(year, state).map((h) => h.day);

	it('lists the nine nationwide holidays for every state', () => {
		const nationwide = [
			'2026-01-01',
			'2026-04-03',
			'2026-04-06',
			'2026-05-01',
			'2026-05-14',
			'2026-05-25',
			'2026-10-03',
			'2026-12-25',
			'2026-12-26'
		];
		for (const { code } of GERMAN_STATES) {
			for (const d of nationwide) expect(days(2026, code)).toContain(d);
		}
		expect(days(2026, 'HH')).toEqual([...nationwide, '2026-10-31'].sort());
	});

	it('adds the state-specific holidays', () => {
		expect(germanHolidays(2026, 'BY').map((h) => h.name)).toEqual([
			'Neujahr',
			'Heilige Drei Könige',
			'Karfreitag',
			'Ostermontag',
			'Tag der Arbeit',
			'Christi Himmelfahrt',
			'Pfingstmontag',
			'Fronleichnam',
			'Tag der Deutschen Einheit',
			'Allerheiligen',
			'1. Weihnachtstag',
			'2. Weihnachtstag'
		]);
		expect(days(2026, 'BY')).toContain('2026-06-04'); // Fronleichnam
		expect(days(2026, 'SN')).toContain('2026-11-18'); // Buß- und Bettag
		expect(days(2026, 'SN')).toContain('2026-10-31'); // Reformationstag
		expect(days(2026, 'BE')).toContain('2026-03-08'); // Frauentag
		expect(days(2026, 'TH')).toContain('2026-09-20'); // Weltkindertag
		expect(days(2026, 'SL')).toContain('2026-08-15'); // Mariä Himmelfahrt
		expect(days(2026, 'NW')).not.toContain('2026-10-31');
		expect(days(2026, 'NW')).toContain('2026-11-01');
	});

	it('is sorted by date', () => {
		const d = days(2025, 'BW');
		expect(d).toEqual([...d].sort());
	});
});
