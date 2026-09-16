import pdfmake from 'pdfmake';
import Roboto from 'pdfmake/fonts/Roboto.js';
import { getSettings } from '../settings';
import { computeSplit } from '../summary';
import { fmtClock, fmtDuration, weekBounds, addDaysKey } from '$lib/time';
import { DAY_MARK_LABELS, DAY_OFF_TYPES, isDayOff, type DayMark, type SideTotals } from '$lib/types';
import { aggregate } from './json';
import { germanStateName } from '$lib/holidays';
import type { ExportFilter, ExportWindow } from './query';

pdfmake.addFonts(Roboto);

const JOB = '#2a78d6';
const PHD = '#eb6834';
const MUTED = '#52514e';

function splitBar(jobPct: number, targetJobPct: number) {
	const W = 460;
	const H = 10;
	const jobW = (W * jobPct) / 100;
	const tickX = (W * targetJobPct) / 100;
	return {
		margin: [0, 4, 0, 2] as [number, number, number, number],
		canvas: [
			{ type: 'rect', x: 0, y: 2, w: jobW, h: H, color: JOB },
			{ type: 'rect', x: jobW + 2, y: 2, w: Math.max(0, W - jobW - 2), h: H, color: PHD },
			{ type: 'line', x1: tickX, y1: 0, x2: tickX, y2: H + 4, lineWidth: 2, lineColor: '#0b0b0b' }
		]
	};
}

function totalsRow(label: string, t: SideTotals, targetJobPct: number) {
	const split = computeSplit(t, targetJobPct);
	const pct =
		split.actualJobPct === null
			? '—'
			: `${split.actualJobPct.toFixed(0)}% / ${(100 - split.actualJobPct).toFixed(0)}%`;
	return [
		{ text: label, bold: true },
		{ text: `${fmtDuration(t.job)} h`, color: JOB, alignment: 'right' },
		{ text: `${fmtDuration(t.phd)} h`, color: PHD, alignment: 'right' },
		{ text: `${fmtDuration(t.job + t.phd)} h`, alignment: 'right' },
		{ text: pct, alignment: 'right' }
	];
}

const WEEKDAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
];

/** One line per configured setting for the report header. */
function settingsLine(s: ReturnType<typeof getSettings>): string {
	const hours = (h: number) => fmtDuration(h * 3_600_000);
	return [
		s.phdEnabled
			? `Target split ${s.targetJobPct}/${100 - s.targetJobPct} (Job/PhD)`
			: 'PhD tracking off',
		`week starts ${WEEKDAY_NAMES[s.weekStartDay]}`,
		`weekly target ${s.weeklyHourTarget !== null ? `${hours(s.weeklyHourTarget)} h` : 'none'}`,
		`daily maximum ${s.dailyHourTarget !== null ? `${hours(s.dailyHourTarget)} h` : 'none'}`,
		`starting overtime ${s.initialOvertimeHours < 0 ? '−' : '+'}${hours(Math.abs(s.initialOvertimeHours))} h`,
		`public holidays ${s.holidayState !== null ? germanStateName(s.holidayState) : 'none'}`
	].join(' · ');
}

export async function buildPdf(
	windows: ExportWindow[],
	filter: ExportFilter,
	marks: DayMark[] = []
): Promise<Uint8Array> {
	const settings = getSettings();
	const { targetJobPct, weekStartDay } = settings;
	const totals = aggregate(windows, weekStartDay);
	const split = computeSplit(totals.perSide, targetJobPct);
	const includeDetails =
		windows.length > 0 &&
		(new Date(filter.to).getTime() - new Date(filter.from).getTime()) / 86400000 <= 31;

	const markByDay = new Map(marks.map((m) => [m.day, m]));
	const daysOff = marks.filter((m) => isDayOff(m.type));
	const homeOffice = marks.filter((m) => !isDayOff(m.type));
	// weeks with tracked time or a day mark
	const weeks = [
		...new Set([
			...Object.keys(totals.perWeek),
			...marks.map((m) => weekBounds(m.day, weekStartDay).from)
		])
	].sort();
	const weekSections = weeks.flatMap((weekFrom) => {
		const wTotals = totals.perWeek[weekFrom] ?? { job: 0, phd: 0 };
		const wSplit = computeSplit(wTotals, targetJobPct);
		const weekTo = addDaysKey(weekFrom, 6);
		const days = [
			...new Set(
				[...Object.keys(totals.perDay), ...markByDay.keys()].filter(
					(d) => weekBounds(d, weekStartDay).from === weekFrom
				)
			)
		].sort();

		const dayRows = days.map((d) => {
			const t = totals.perDay[d] ?? { job: 0, phd: 0 };
			const mark = markByDay.get(d);
			const rows: unknown[] = [
				mark
					? {
							stack: [
								{ text: d },
								{
									text: DAY_MARK_LABELS[mark.type] + (mark.note ? ` — ${mark.note}` : ''),
									color: MUTED,
									fontSize: 8
								}
							]
						}
					: { text: d },
				{ text: fmtDuration(t.job), alignment: 'right' },
				{ text: fmtDuration(t.phd), alignment: 'right' },
				{ text: fmtDuration(t.job + t.phd), bold: true, alignment: 'right' },
				includeDetails
					? {
							text: windows
								.filter((w) => w.day === d)
								.map(
									(w) =>
										`${w.side === 'job' ? 'J' : 'P'} ${fmtClock(w.startTs)}–${w.running ? 'now' : fmtClock(w.effectiveEndTs)}${w.note ? ` (${w.note})` : ''}`
								)
								.join('  ·  '),
							color: MUTED,
							fontSize: 8
						}
					: {}
			];
			if (!includeDetails) rows.pop();
			return rows;
		});

		const header = [
			{ text: 'Day', color: MUTED },
			{ text: 'Job', color: MUTED, alignment: 'right' },
			{ text: 'PhD', color: MUTED, alignment: 'right' },
			{ text: 'Total', color: MUTED, alignment: 'right' },
			...(includeDetails ? [{ text: 'Windows', color: MUTED }] : [])
		];

		return [
			{
				text: `Week ${weekFrom} – ${weekTo}`,
				bold: true,
				fontSize: 11,
				margin: [0, 14, 0, 2]
			},
			{
				text:
					`Job ${fmtDuration(wTotals.job)} h · PhD ${fmtDuration(wTotals.phd)} h` +
					(wSplit.actualJobPct !== null
						? ` — split ${wSplit.actualJobPct.toFixed(0)}/${(100 - wSplit.actualJobPct).toFixed(0)} (target ${targetJobPct}/${100 - targetJobPct})`
						: ''),
				color: MUTED,
				fontSize: 9,
				margin: [0, 0, 0, 4]
			},
			{
				table: {
					headerRows: 1,
					widths: includeDetails ? [62, 40, 40, 40, '*'] : [80, 60, 60, 60],
					body: [header, ...dayRows]
				},
				layout: {
					hLineWidth: () => 0.5,
					vLineWidth: () => 0,
					hLineColor: () => '#e1e0d9',
					paddingTop: () => 3,
					paddingBottom: () => 3
				},
				fontSize: 9
			}
		];
	});

	const doc = pdfmake.createPdf({
		info: { title: 'TimeTracker report' },
		defaultStyle: { font: 'Roboto', fontSize: 10 },
		pageMargins: [50, 50, 50, 50],
		content: [
			{ text: 'TimeTracker report', fontSize: 18, bold: true },
			{
				text: `${filter.from} – ${filter.to} · ${filter.side === 'both' ? 'Job + PhD' : filter.side === 'job' ? 'Job only' : 'PhD only'} · generated ${new Date().toISOString().slice(0, 10)}`,
				color: MUTED,
				fontSize: 9,
				margin: [0, 2, 0, 1]
			},
			{ text: settingsLine(settings), color: MUTED, fontSize: 8, margin: [0, 0, 0, 12] },
			{
				table: {
					widths: [90, 70, 70, 70, '*'],
					body: [
						[
							{ text: '', border: [false, false, false, false] },
							{ text: 'Job', color: JOB, bold: true, alignment: 'right' },
							{ text: 'PhD', color: PHD, bold: true, alignment: 'right' },
							{ text: 'Total', bold: true, alignment: 'right' },
							{ text: 'Split (Job/PhD)', bold: true, alignment: 'right' }
						],
						totalsRow('Summary', totals.perSide, targetJobPct)
					]
				},
				layout: 'noBorders'
			},
			...(split.actualJobPct !== null ? [splitBar(split.actualJobPct, targetJobPct)] : []),
			...(split.deltaPct !== null
				? [
						{
							text: `Actual split ${split.actualJobPct!.toFixed(1)}% Job vs target ${targetJobPct}% — ${Math.abs(split.deltaPct).toFixed(1)} pp ${split.deltaPct >= 0 ? 'over' : 'under'} on the Job side.`,
							color: MUTED,
							fontSize: 9,
							margin: [0, 2, 0, 0]
						}
					]
				: []),
			...(daysOff.length > 0
				? [
						{
							text:
								'Days off: ' +
								DAY_OFF_TYPES.map((t) => ({ t, n: daysOff.filter((m) => m.type === t).length }))
									.filter(({ n }) => n > 0)
									.map(({ t, n }) => `${n} × ${DAY_MARK_LABELS[t]}`)
									.join(' · ') +
								' — counted as full working time.',
							color: MUTED,
							fontSize: 9,
							margin: [0, 2, 0, 0] as [number, number, number, number]
						}
					]
				: []),
			...(homeOffice.length > 0
				? [
						{
							text: `Home office: ${homeOffice.length} ${homeOffice.length === 1 ? 'day' : 'days'} — ordinary working days.`,
							color: MUTED,
							fontSize: 9,
							margin: [0, 2, 0, 0] as [number, number, number, number]
						}
					]
				: []),
			...weekSections
		]
	});
	return doc.getBuffer();
}
