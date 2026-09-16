import type { GermanState } from './holidays';

export type Side = 'job' | 'phd';

export const SIDES: Side[] = ['job', 'phd'];

export const SIDE_LABELS: Record<Side, string> = {
	job: 'Job',
	phd: 'PhD'
};

export type DayOffType = 'sick' | 'vacation' | 'holiday';

export type WorkLocationType = 'home_office';

export type DayMarkType = DayOffType | WorkLocationType;

export const DAY_OFF_TYPES: DayOffType[] = ['sick', 'vacation', 'holiday'];

export const WORK_LOCATION_TYPES: WorkLocationType[] = ['home_office'];

export const DAY_MARK_TYPES: DayMarkType[] = [...DAY_OFF_TYPES, ...WORK_LOCATION_TYPES];

export const DAY_MARK_LABELS: Record<DayMarkType, string> = {
	sick: 'Sick',
	vacation: 'Vacation',
	holiday: 'Holiday',
	home_office: 'Home office'
};

export function isDayOff(type: DayMarkType | null | undefined): boolean {
	return type != null && (DAY_OFF_TYPES as string[]).includes(type);
}

/** Whole-day mark, at most one per day. Day-off marks count as fully worked; home office is a label only. */
export interface DayMark {
	day: string; // YYYY-MM-DD
	type: DayMarkType;
	note: string | null;
	source: 'auto' | null; // 'auto' = generated public holiday
}

export interface MarkRangeResult {
	marked: string[];
	skipped: { day: string; reason: 'weekend' | 'holiday' }[];
}

export interface WorkWindow {
	id: number;
	side: Side;
	day: string; // YYYY-MM-DD
	startTs: number; // epoch ms
	endTs: number | null; // null ⇒ running
	note: string | null;
}

export interface Settings {
	targetJobPct: number; // 0–100; PhD target is the remainder
	weekStartDay: number; // 0=Sun … 6=Sat
	weeklyHourTarget: number | null;
	dailyHourTarget: number | null;
	initialOvertimeHours: number; // may be negative
	theme: 'light' | 'dark' | 'system';
	holidayState: GermanState | null; // null = off
	phdEnabled: boolean;
}

export interface SideTotals {
	job: number; // ms
	phd: number; // ms
}

export interface SplitStats {
	actualJobPct: number | null; // null when nothing is tracked
	targetJobPct: number;
	deltaPct: number | null;
}

export interface Summary {
	asOf: number; // server time the totals were computed at
	day: SideTotals; // viewed day
	today: SideTotals; // actual current day
	week: SideTotals & { from: string; to: string; marks: DayMark[] };
	allTime: SideTotals;
	weekSplit: SplitStats;
	allTimeSplit: SplitStats;
	/** Flexitime balance vs the weekly target; null when neither a target nor a starting balance is set. */
	overtime: {
		balanceMs: number;
		weeks: number; // completed weeks counted
		startMs: number;
	} | null;
	running: { id: number; side: Side; startTs: number; note: string | null } | null;
}

export interface MonthOverview {
	month: string; // YYYY-MM
	days: Record<string, SideTotals>; // only days with tracked time
	marks: DayMark[];
	dayTargetMs: number | null; // weekly target ÷ 5, else the daily target
	weekStartDay: number;
	today: string;
}
