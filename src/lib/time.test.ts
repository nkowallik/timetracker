import { describe, expect, it } from 'vitest';
import {
	addDaysKey,
	dayKey,
	dayStart,
	dayTimeToMs,
	fmtDuration,
	isWeekend,
	parseClock,
	weekBounds,
	weekdaysThrough
} from './time';

describe('parseClock', () => {
	it('normalizes colon and dot forms', () => {
		expect(parseClock('9:00')).toBe('09:00');
		expect(parseClock('09:30')).toBe('09:30');
		expect(parseClock('9:5')).toBe('09:05');
		expect(parseClock('9.30')).toBe('09:30');
		expect(parseClock(' 14:00 ')).toBe('14:00');
	});

	it('expands bare digits', () => {
		expect(parseClock('9')).toBe('09:00');
		expect(parseClock('14')).toBe('14:00');
		expect(parseClock('900')).toBe('09:00');
		expect(parseClock('1400')).toBe('14:00');
		expect(parseClock('130')).toBe('01:30');
		expect(parseClock('0')).toBe('00:00');
		expect(parseClock('2359')).toBe('23:59');
	});

	it('rejects out-of-range and malformed input', () => {
		expect(parseClock('24')).toBeNull();
		expect(parseClock('2400')).toBeNull();
		expect(parseClock('1275')).toBeNull();
		expect(parseClock('25:00')).toBeNull();
		expect(parseClock('12:60')).toBeNull();
		expect(parseClock('9am')).toBeNull();
		expect(parseClock('abc')).toBeNull();
		expect(parseClock('')).toBeNull();
		expect(parseClock('12345')).toBeNull();
	});
});

describe('weekBounds', () => {
	// 2026-08-20 is a Thursday
	it('computes a Monday-start week', () => {
		expect(weekBounds('2026-08-20', 1)).toEqual({ from: '2026-08-17', to: '2026-08-24' });
	});

	it('computes a Sunday-start week', () => {
		expect(weekBounds('2026-08-20', 0)).toEqual({ from: '2026-08-16', to: '2026-08-23' });
	});

	it('is stable for every week start day', () => {
		for (let wsd = 0; wsd < 7; wsd++) {
			const { from, to } = weekBounds('2026-08-20', wsd);
			expect(dayStart(from).getDay()).toBe(wsd);
			expect(addDaysKey(from, 7)).toBe(to);
			expect(from <= '2026-08-20' && '2026-08-20' < to).toBe(true);
		}
	});

	it('returns the day itself as start when it matches the week start', () => {
		expect(weekBounds('2026-08-17', 1).from).toBe('2026-08-17'); // a Monday
	});
});

describe('day helpers', () => {
	it('round-trips dayKey/dayStart', () => {
		expect(dayKey(dayStart('2026-02-01'))).toBe('2026-02-01');
	});

	it('addDaysKey crosses month and year boundaries', () => {
		expect(addDaysKey('2026-08-31', 1)).toBe('2026-09-01');
		expect(addDaysKey('2026-01-01', -1)).toBe('2025-12-31');
	});

	it('dayTimeToMs("24:00") lands on the next day midnight', () => {
		expect(dayTimeToMs('2026-08-19', '24:00')).toBe(dayTimeToMs('2026-08-20', '00:00'));
	});

	it('isWeekend flags Saturday and Sunday only', () => {
		expect(isWeekend('2026-08-21')).toBe(false); // Friday
		expect(isWeekend('2026-08-22')).toBe(true); // Saturday
		expect(isWeekend('2026-08-23')).toBe(true); // Sunday
		expect(isWeekend('2026-08-24')).toBe(false); // Monday
	});

	it('weekdaysThrough counts Mon–Fri from week start through the given day', () => {
		// week starting Monday 2026-08-24
		expect(weekdaysThrough('2026-08-24', '2026-08-24')).toBe(1); // Monday
		expect(weekdaysThrough('2026-08-24', '2026-08-26')).toBe(3); // Wednesday
		expect(weekdaysThrough('2026-08-24', '2026-08-28')).toBe(5); // Friday
		expect(weekdaysThrough('2026-08-24', '2026-08-30')).toBe(5); // Sunday → full week
		// week starting Sunday 2026-08-23: Sunday itself contributes nothing
		expect(weekdaysThrough('2026-08-23', '2026-08-23')).toBe(0);
		expect(weekdaysThrough('2026-08-23', '2026-08-24')).toBe(1);
		// day past the week end stays capped at one week
		expect(weekdaysThrough('2026-08-24', '2026-09-15')).toBe(5);
	});
});

describe('fmtDuration', () => {
	it('formats hours and minutes', () => {
		expect(fmtDuration(0)).toBe('0:00');
		expect(fmtDuration(90 * 60000)).toBe('1:30');
		expect(fmtDuration(25 * 3600000 + 5 * 60000)).toBe('25:05');
	});
});
