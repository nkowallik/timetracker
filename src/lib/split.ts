import { dayKey, dayEndMs } from './time';
import type { WorkWindow } from './types';

export interface Segment {
	day: string;
	startTs: number;
	endTs: number;
}

/** Split a closed interval into per-day segments at local midnights. */
export function splitByMidnight(startTs: number, endTs: number): Segment[] {
	if (endTs <= startTs) throw new Error('end must be after start');
	const segments: Segment[] = [];
	let s = startTs;
	for (;;) {
		const day = dayKey(s);
		const boundary = dayEndMs(day);
		if (endTs <= boundary) {
			segments.push({ day, startTs: s, endTs });
			return segments;
		}
		segments.push({ day, startTs: s, endTs: boundary });
		s = boundary;
	}
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
	return aStart < bEnd && bStart < aEnd;
}

/** Display window built from one or more stored windows (`parts`). */
export type MergedWindow = WorkWindow & { parts: WorkWindow[] };

const minuteOf = (ts: number) => Math.floor(ts / 60_000);

/** Merge same-side windows that end and start within a minute of each other. View only. */
export function mergeNeighboring(windows: WorkWindow[]): MergedWindow[] {
	const sorted = [...windows].sort((a, b) => a.startTs - b.startTs);
	const merged: MergedWindow[] = [];
	for (const w of sorted) {
		const prev = merged.at(-1);
		if (
			prev &&
			prev.side === w.side &&
			prev.endTs !== null &&
			minuteOf(w.startTs) - minuteOf(prev.endTs) <= 1
		) {
			prev.parts.push(w);
			prev.endTs = w.endTs === null ? null : Math.max(prev.endTs, w.endTs);
			if (w.note && w.note !== prev.note) prev.note = prev.note ? `${prev.note} · ${w.note}` : w.note;
		} else {
			merged.push({ ...w, parts: [w] });
		}
	}
	return merged;
}
