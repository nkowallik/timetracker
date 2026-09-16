import { describe, expect, it } from 'vitest';
import { splitByMidnight, rangesOverlap, mergeNeighboring } from './split';
import { dayTimeToMs, dayEndMs } from './time';
import type { WorkWindow } from './types';

describe('splitByMidnight', () => {
	it('keeps a same-day window as one segment', () => {
		const start = dayTimeToMs('2026-08-19', '09:00');
		const end = dayTimeToMs('2026-08-19', '17:30');
		expect(splitByMidnight(start, end)).toEqual([
			{ day: '2026-08-19', startTs: start, endTs: end }
		]);
	});

	it('splits a window crossing one midnight', () => {
		const start = dayTimeToMs('2026-08-19', '23:00');
		const end = dayTimeToMs('2026-08-20', '02:00');
		const boundary = dayEndMs('2026-08-19');
		expect(splitByMidnight(start, end)).toEqual([
			{ day: '2026-08-19', startTs: start, endTs: boundary },
			{ day: '2026-08-20', startTs: boundary, endTs: end }
		]);
	});

	it('splits a multi-day window into one segment per day', () => {
		const start = dayTimeToMs('2026-08-19', '22:00');
		const end = dayTimeToMs('2026-08-22', '03:00');
		const segments = splitByMidnight(start, end);
		expect(segments.map((s) => s.day)).toEqual([
			'2026-08-19',
			'2026-08-20',
			'2026-08-21',
			'2026-08-22'
		]);
		// segments are contiguous and cover the whole interval
		expect(segments[0].startTs).toBe(start);
		expect(segments.at(-1)!.endTs).toBe(end);
		for (let i = 1; i < segments.length; i++) {
			expect(segments[i].startTs).toBe(segments[i - 1].endTs);
		}
	});

	it('attributes a window ending exactly at midnight to the earlier day', () => {
		const start = dayTimeToMs('2026-08-19', '22:00');
		const end = dayEndMs('2026-08-19');
		expect(splitByMidnight(start, end)).toEqual([
			{ day: '2026-08-19', startTs: start, endTs: end }
		]);
	});

	it('rejects zero and negative length intervals', () => {
		const t = dayTimeToMs('2026-08-19', '09:00');
		expect(() => splitByMidnight(t, t)).toThrow();
		expect(() => splitByMidnight(t, t - 1)).toThrow();
	});

	it('total duration is preserved across splits', () => {
		const start = dayTimeToMs('2026-08-19', '23:17');
		const end = dayTimeToMs('2026-08-21', '05:03');
		const segments = splitByMidnight(start, end);
		const sum = segments.reduce((acc, s) => acc + (s.endTs - s.startTs), 0);
		expect(sum).toBe(end - start);
	});
});

describe('rangesOverlap', () => {
	it('detects overlap and treats intervals as half-open', () => {
		expect(rangesOverlap(0, 10, 5, 15)).toBe(true);
		expect(rangesOverlap(0, 10, 10, 20)).toBe(false); // touching ends don't overlap
		expect(rangesOverlap(5, 6, 0, 10)).toBe(true); // containment
		expect(rangesOverlap(0, 5, 6, 10)).toBe(false);
	});
});

describe('mergeNeighboring', () => {
	const day = '2026-08-19';
	let nextId = 1;
	const win = (start: string, end: string | null, over: Partial<WorkWindow> = {}): WorkWindow => ({
		id: nextId++,
		side: 'job',
		day,
		startTs: dayTimeToMs(day, start),
		endTs: end === null ? null : dayTimeToMs(day, end),
		note: null,
		...over
	});

	it('merges windows touching or gapped by less than a minute', () => {
		const a = win('09:00', '10:00');
		const b = win('10:00', '10:30');
		// starts 40 s into the same minute the previous window ended in
		const c = win('10:30', '11:00', { startTs: dayTimeToMs(day, '10:30') + 40_000 });
		const merged = mergeNeighboring([a, b, c]);
		expect(merged).toHaveLength(1);
		expect(merged[0].startTs).toBe(a.startTs);
		expect(merged[0].endTs).toBe(c.endTs);
		expect(merged[0].parts).toEqual([a, b, c]);
	});

	it('merges when end and next start fall in neighbouring minutes', () => {
		// ends at 10:00:50, next starts at 10:01:55 — gap >1 min but adjacent minutes
		const a = win('09:00', '10:00', { endTs: dayTimeToMs(day, '10:00') + 50_000 });
		const b = win('10:01', '11:00', { startTs: dayTimeToMs(day, '10:01') + 55_000 });
		expect(mergeNeighboring([a, b])).toHaveLength(1);
	});

	it('does not merge across a two-minute gap', () => {
		const a = win('09:00', '10:00');
		const b = win('10:02', '11:00');
		expect(mergeNeighboring([a, b])).toHaveLength(2);
	});

	it('does not merge different sides', () => {
		const a = win('09:00', '10:00');
		const b = win('10:00', '11:00', { side: 'phd' });
		expect(mergeNeighboring([a, b])).toHaveLength(2);
	});

	it('a running window absorbs a neighbouring earlier window and stays running', () => {
		const a = win('09:00', '10:00');
		const b = win('10:00', null);
		const merged = mergeNeighboring([a, b]);
		expect(merged).toHaveLength(1);
		expect(merged[0].endTs).toBeNull();
		expect(merged[0].parts.map((p) => p.id)).toEqual([a.id, b.id]);
	});

	it('nothing merges after a running window', () => {
		const a = win('09:00', null);
		const b = win('10:00', '11:00');
		expect(mergeNeighboring([a, b])).toHaveLength(2);
	});

	it('sorts input and combines distinct notes', () => {
		const b = win('10:00', '11:00', { note: 'review' });
		const a = win('09:00', '10:00', { note: 'standup' });
		const merged = mergeNeighboring([b, a]);
		expect(merged).toHaveLength(1);
		expect(merged[0].note).toBe('standup · review');
	});

	it('leaves isolated windows untouched apart from wrapping', () => {
		const a = win('09:00', '10:00');
		const merged = mergeNeighboring([a]);
		expect(merged).toHaveLength(1);
		expect(merged[0].parts).toEqual([a]);
		expect(merged[0].startTs).toBe(a.startTs);
		expect(merged[0].endTs).toBe(a.endTs);
	});
});
