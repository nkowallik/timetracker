import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';
import { dayTimeToMs } from '$lib/time';
import type { ExportWindow } from './query';

function win(overrides: Partial<ExportWindow>): ExportWindow {
	const startTs = dayTimeToMs('2026-08-19', '09:00');
	const endTs = dayTimeToMs('2026-08-19', '10:30');
	return {
		id: 1,
		side: 'job',
		day: '2026-08-19',
		startTs,
		endTs,
		effectiveEndTs: endTs,
		note: null,
		running: false,
		...overrides
	};
}

describe('toCsv', () => {
	it('emits header and rows with durations in minutes', () => {
		const csv = toCsv([win({})]);
		const [header, row] = csv.trim().split('\r\n');
		expect(header).toBe('date,side,start,end,duration_minutes,note');
		expect(row).toBe('2026-08-19,job,09:00:00,10:30:00,90.0,');
	});

	it('quotes notes containing commas, quotes, and newlines', () => {
		const csv = toCsv([win({ note: 'a, "b"\nc' })]);
		expect(csv).toContain('"a, ""b""\nc"');
	});

	it('emits day marks as timeless rows sorted before that day\'s windows', () => {
		const csv = toCsv(
			[win({})],
			[
				{ day: '2026-08-19', type: 'sick', note: 'flu', source: null },
				{ day: '2026-08-20', type: 'vacation', note: null, source: null }
			]
		);
		const rows = csv.trim().split('\r\n').slice(1);
		expect(rows).toEqual([
			'2026-08-19,sick,,,0.0,flu',
			'2026-08-19,job,09:00:00,10:30:00,90.0,',
			'2026-08-20,vacation,,,0.0,'
		]);
	});

	it('emits home-office marks alongside day-off marks', () => {
		const csv = toCsv([], [{ day: '2026-08-19', type: 'home_office', note: null, source: null }]);
		expect(csv.trim().split('\r\n')[1]).toBe('2026-08-19,home_office,,,0.0,');
	});

	it('leaves the end column empty for running windows', () => {
		const csv = toCsv([win({ endTs: null, running: true })]);
		const row = csv.trim().split('\r\n')[1];
		expect(row.split(',')[3]).toBe('');
	});
});
