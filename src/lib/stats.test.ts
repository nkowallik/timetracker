import { describe, expect, it } from 'vitest';
import { balanceDelta, breakTotal, computeSplit, dayProgress, dayRuns, liveSummary } from './stats';
import { dayKey, weekBounds } from './time';
import type { Summary, WorkWindow } from './types';

const H = 3_600_000;

describe('computeSplit', () => {
	it('returns null percentages when nothing is tracked', () => {
		expect(computeSplit({ job: 0, phd: 0 }, 50)).toEqual({
			actualJobPct: null,
			targetJobPct: 50,
			deltaPct: null
		});
	});

	it('computes the actual split and delta vs target', () => {
		const s = computeSplit({ job: 3_600_000, phd: 1_200_000 }, 50);
		expect(s.actualJobPct).toBeCloseTo(75);
		expect(s.deltaPct).toBeCloseTo(25);
	});

	it('handles one-sided tracking', () => {
		expect(computeSplit({ job: 1000, phd: 0 }, 60).actualJobPct).toBe(100);
		expect(computeSplit({ job: 0, phd: 1000 }, 60).actualJobPct).toBe(0);
	});
});

describe('balanceDelta', () => {
	it('reports how much the behind side needs at a 50/50 target', () => {
		// 3h job vs 1h phd: phd needs 2h to make it 3/3
		expect(balanceDelta({ job: 3 * H, phd: 1 * H }, 50)).toEqual({ side: 'phd', ms: 2 * H });
		expect(balanceDelta({ job: 1 * H, phd: 3 * H }, 50)).toEqual({ side: 'job', ms: 2 * H });
	});

	it('respects a non-even target', () => {
		// 3h job / 1h phd at 60/40: phd needs 1h → 3h/5h = 60%
		const r = balanceDelta({ job: 3 * H, phd: 1 * H }, 60);
		expect(r?.side).toBe('phd');
		expect(r?.ms).toBeCloseTo(1 * H, 5);
	});

	it('balancing amount actually restores the target split', () => {
		const t = { job: 7.3 * H, phd: 2.1 * H };
		const r = balanceDelta(t, 45)!;
		const after = { ...t, [r.side]: t[r.side] + r.ms };
		expect(computeSplit(after, 45).actualJobPct).toBeCloseTo(45, 6);
	});

	it('returns null when balanced, empty, or the target is degenerate', () => {
		expect(balanceDelta({ job: H, phd: H }, 50)).toBeNull();
		expect(balanceDelta({ job: 0, phd: 0 }, 50)).toBeNull();
		expect(balanceDelta({ job: H, phd: H }, 0)).toBeNull(); // job can never drop to 0%
		expect(balanceDelta({ job: H, phd: H }, 100)).toBeNull(); // phd can never drop to 0%
	});

	it('one-sided tracking asks the empty side for its whole share', () => {
		expect(balanceDelta({ job: 2 * H, phd: 0 }, 50)).toEqual({ side: 'phd', ms: 2 * H });
	});
});

describe('liveSummary', () => {
	function snapshot(asOf: number): Summary {
		const week = weekBounds(dayKey(asOf), 1);
		return {
			asOf,
			day: { job: H, phd: 0 },
			today: { job: H, phd: 0 },
			week: { job: 2 * H, phd: 2 * H, from: week.from, to: week.to, marks: [] },
			allTime: { job: 10 * H, phd: 10 * H },
			weekSplit: computeSplit({ job: 2 * H, phd: 2 * H }, 50),
			allTimeSplit: computeSplit({ job: 10 * H, phd: 10 * H }, 50),
			overtime: { balanceMs: H, weeks: 3, startMs: 0 },
			running: { id: 1, side: 'job', startTs: asOf - H, note: null }
		};
	}

	it('adds running elapsed to the current week and all-time and recomputes splits', () => {
		const asOf = Date.now();
		const live = liveSummary(snapshot(asOf), asOf + H);
		expect(live.week.job).toBe(3 * H);
		expect(live.week.phd).toBe(2 * H);
		expect(live.today.job).toBe(2 * H);
		expect(live.allTime.job).toBe(11 * H);
		expect(live.weekSplit.actualJobPct).toBeCloseTo(60);
		expect(live.allTimeSplit.actualJobPct).toBeCloseTo((11 / 21) * 100);
		// week bounds and overtime stay untouched
		expect(live.week.from).toBe(snapshot(asOf).week.from);
		expect(live.overtime).toEqual({ balanceMs: H, weeks: 3, startMs: 0 });
	});

	it('is a no-op without a running timer or elapsed time', () => {
		const asOf = Date.now();
		const idle = { ...snapshot(asOf), running: null };
		expect(liveSummary(idle, asOf + H)).toBe(idle);
		const s = snapshot(asOf);
		expect(liveSummary(s, asOf)).toBe(s);
	});

	it('does not bump a viewed week that lies in the past', () => {
		const asOf = Date.now();
		const s = snapshot(asOf);
		const pastWeek = weekBounds(dayKey(asOf - 21 * 24 * H), 1);
		s.week = { ...s.week, from: pastWeek.from, to: pastWeek.to };
		const live = liveSummary(s, asOf + H);
		expect(live.week.job).toBe(2 * H); // unchanged
		expect(live.allTime.job).toBe(11 * H); // still bumped
	});
});

describe('dayProgress', () => {
	it('returns null without a configured daily maximum', () => {
		expect(dayProgress(4 * H, null)).toBeNull();
		expect(dayProgress(4 * H, 0)).toBeNull();
	});

	it('reports the share worked and the time left', () => {
		const p = dayProgress(2 * H, 8 * H)!;
		expect(p.pct).toBeCloseTo(25);
		expect(p.barPct).toBeCloseTo(25);
		expect(p.remainingMs).toBe(6 * H);
		expect(p.overMs).toBe(0);
		expect(p.reached).toBe(false);
	});

	it('caps the bar but not the percentage once the maximum is passed', () => {
		const p = dayProgress(10 * H, 8 * H)!;
		expect(p.pct).toBeCloseTo(125);
		expect(p.barPct).toBe(100);
		expect(p.remainingMs).toBe(0);
		expect(p.overMs).toBe(2 * H);
		expect(p.reached).toBe(true);
	});

	it('treats exactly hitting the maximum as reached', () => {
		const p = dayProgress(8 * H, 8 * H)!;
		expect(p.reached).toBe(true);
		expect(p.remainingMs).toBe(0);
		expect(p.overMs).toBe(0);
	});
});

describe('dayRuns', () => {
	const win = (
		id: number,
		side: 'job' | 'phd',
		startH: number,
		endH: number | null
	): WorkWindow => ({
		id,
		side,
		day: '2026-09-03',
		startTs: startH * H,
		endTs: endH === null ? null : endH * H,
		note: null
	});

	it('returns runs in the order they were worked', () => {
		const runs = dayRuns([win(1, 'job', 9, 11), win(2, 'phd', 11, 13), win(3, 'job', 13, 14)], 0);
		expect(runs).toEqual([
			{ side: 'job', ms: 2 * H },
			{ side: 'phd', ms: 2 * H },
			{ side: 'job', ms: H }
		]);
	});

	it('sorts by start and merges consecutive same-side windows', () => {
		const runs = dayRuns([win(3, 'phd', 13, 14), win(1, 'job', 9, 10), win(2, 'job', 10, 12)], 0);
		expect(runs).toEqual([
			{ side: 'job', ms: 3 * H },
			{ side: null, ms: H },
			{ side: 'phd', ms: H }
		]);
	});

	it('reports gaps between windows as breaks, on either side', () => {
		const runs = dayRuns([win(1, 'job', 9, 10), win(2, 'job', 10.5, 12), win(3, 'phd', 13, 14)], 0);
		expect(runs).toEqual([
			{ side: 'job', ms: H },
			{ side: null, ms: 0.5 * H },
			{ side: 'job', ms: 1.5 * H },
			{ side: null, ms: H },
			{ side: 'phd', ms: H }
		]);
		expect(breakTotal(runs)).toBe(1.5 * H);
	});

	it('ignores gaps under a minute and cross-side overlaps', () => {
		const M = 60_000;
		const windows: WorkWindow[] = [
			{ ...win(1, 'job', 9, 10), endTs: 10 * H - 30_000 },
			win(2, 'phd', 10, 11),
			{ ...win(3, 'job', 10, 12), startTs: 10.5 * H }
		];
		expect(dayRuns(windows, 0)).toEqual([
			{ side: 'job', ms: H - 30_000 },
			{ side: 'phd', ms: H },
			{ side: 'job', ms: 1.5 * H }
		]);
		expect(dayRuns([win(1, 'job', 9, 10), { ...win(2, 'phd', 10, 11), startTs: 10 * H + M }], 0))
			.toEqual([
				{ side: 'job', ms: H },
				{ side: null, ms: M },
				{ side: 'phd', ms: H - M }
			]);
	});

	it('never reports the time after the last window as a break', () => {
		expect(dayRuns([win(1, 'job', 9, 10)], 12 * H)).toEqual([{ side: 'job', ms: H }]);
	});

	it('counts a running window up to now and skips empty ones', () => {
		const runs = dayRuns([win(1, 'job', 9, 9), win(2, 'phd', 9, null)], 10.5 * H);
		expect(runs).toEqual([{ side: 'phd', ms: 1.5 * H }]);
	});

	it('returns nothing for an empty day', () => {
		expect(dayRuns([], 0)).toEqual([]);
	});
});
