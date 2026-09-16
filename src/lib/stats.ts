import { dayKey } from './time';
import type { Side, SideTotals, SplitStats, Summary, WorkWindow } from './types';

/** Side behind the target split and the time it needs to catch up; null when on target or unreachable. */
export function balanceDelta(
	t: SideTotals,
	targetJobPct: number
): { side: Side; ms: number } | null {
	const total = t.job + t.phd;
	if (total <= 0) return null;
	const target = targetJobPct / 100;
	const actualJob = t.job / total;
	if (actualJob > target) {
		// PhD is behind: job / (total + x) = target
		if (target <= 0) return null;
		const ms = t.job / target - total;
		return ms > 0 ? { side: 'phd', ms } : null;
	}
	if (actualJob < target) {
		// Job is behind: (job + x) / (total + x) = target
		if (target >= 1) return null;
		const ms = t.phd / (1 - target) - total;
		return ms > 0 ? { side: 'job', ms } : null;
	}
	return null;
}

/** Add a running timer's time since the snapshot to the today/week/all-time totals. */
export function liveSummary(s: Summary, now: number): Summary {
	if (!s.running) return s;
	const extra = now - s.asOf;
	if (extra <= 0) return s;
	const side = s.running.side;
	const target = s.weekSplit.targetJobPct;
	const bump = (t: SideTotals): SideTotals => ({ ...t, [side]: t[side] + extra });

	const allTime = bump(s.allTime);
	// only bump the week if it contains today
	const today = dayKey(now);
	const inWeek = today >= s.week.from && today < s.week.to;
	const week = inWeek ? { ...s.week, ...bump(s.week) } : s.week;

	return {
		...s,
		week,
		today: bump(s.today),
		allTime,
		weekSplit: computeSplit(week, target),
		allTimeSplit: computeSplit(allTime, target)
	};
}

export interface DayProgress {
	workedMs: number;
	targetMs: number;
	pct: number; // not capped
	barPct: number; // capped at 100
	remainingMs: number;
	overMs: number;
	reached: boolean;
}

/** Progress against the daily maximum; null when none is configured. */
export function dayProgress(workedMs: number, targetMs: number | null): DayProgress | null {
	if (targetMs === null || !(targetMs > 0)) return null;
	const worked = Math.max(0, workedMs);
	const pct = (worked / targetMs) * 100;
	return {
		workedMs: worked,
		targetMs,
		pct,
		barPct: Math.min(100, pct),
		remainingMs: Math.max(0, targetMs - worked),
		overMs: Math.max(0, worked - targetMs),
		reached: worked >= targetMs
	};
}

/** A stretch of one side's work, or a break (`side: null`). */
export interface DayRun {
	side: Side | null;
	ms: number;
}

/** Gaps between windows shorter than this are side switches, not breaks. */
export const BREAK_MIN_MS = 60_000;

/** Chronological runs: same-side neighbours merged, gaps of at least BREAK_MIN_MS reported as breaks. */
export function dayRuns(windows: WorkWindow[], now: number): DayRun[] {
	const runs: DayRun[] = [];
	let reach = -Infinity;
	for (const w of [...windows].sort((a, b) => a.startTs - b.startTs)) {
		const end = Math.max(w.startTs, w.endTs ?? now);
		const ms = end - w.startTs;
		if (ms <= 0) continue;
		const gap = w.startTs - reach;
		if (runs.length > 0 && gap >= BREAK_MIN_MS) runs.push({ side: null, ms: gap });
		const prev = runs.at(-1);
		if (prev && prev.side === w.side) prev.ms += ms;
		else runs.push({ side: w.side, ms });
		reach = Math.max(reach, end);
	}
	return runs;
}

export function breakTotal(runs: DayRun[]): number {
	return runs.reduce((sum, r) => (r.side === null ? sum + r.ms : sum), 0);
}

/** Actual Job share vs the target split. */
export function computeSplit(t: SideTotals, targetJobPct: number): SplitStats {
	const total = t.job + t.phd;
	if (total <= 0) return { actualJobPct: null, targetJobPct, deltaPct: null };
	const actualJobPct = (t.job / total) * 100;
	return { actualJobPct, targetJobPct, deltaPct: actualJobPct - targetJobPct };
}
