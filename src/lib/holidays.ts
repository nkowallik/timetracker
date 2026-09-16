// German public holidays per federal state, computed from calendar rules.
// Only state-wide holidays are included; regional ones (e.g. Mariä Himmelfahrt
// in parts of Bavaria, Fronleichnam in parts of Saxony and Thuringia) are not.

import { addDays, dayKey } from './time';

export const GERMAN_STATES = [
	{ code: 'BW', name: 'Baden-Württemberg' },
	{ code: 'BY', name: 'Bayern' },
	{ code: 'BE', name: 'Berlin' },
	{ code: 'BB', name: 'Brandenburg' },
	{ code: 'HB', name: 'Bremen' },
	{ code: 'HH', name: 'Hamburg' },
	{ code: 'HE', name: 'Hessen' },
	{ code: 'MV', name: 'Mecklenburg-Vorpommern' },
	{ code: 'NI', name: 'Niedersachsen' },
	{ code: 'NW', name: 'Nordrhein-Westfalen' },
	{ code: 'RP', name: 'Rheinland-Pfalz' },
	{ code: 'SL', name: 'Saarland' },
	{ code: 'SN', name: 'Sachsen' },
	{ code: 'ST', name: 'Sachsen-Anhalt' },
	{ code: 'SH', name: 'Schleswig-Holstein' },
	{ code: 'TH', name: 'Thüringen' }
] as const;

export type GermanState = (typeof GERMAN_STATES)[number]['code'];

export const GERMAN_STATE_CODES: GermanState[] = GERMAN_STATES.map((s) => s.code);

export function isGermanState(v: unknown): v is GermanState {
	return typeof v === 'string' && (GERMAN_STATE_CODES as string[]).includes(v);
}

export function germanStateName(code: GermanState): string {
	return GERMAN_STATES.find((s) => s.code === code)?.name ?? code;
}

export interface Holiday {
	day: string; // YYYY-MM-DD
	name: string;
}

/** Easter Sunday (anonymous Gregorian algorithm). */
export function easterSunday(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day);
}

/** Buß- und Bettag: the Wednesday before 23 November. */
export function bussUndBettag(year: number): Date {
	const nov22 = new Date(year, 10, 22);
	const back = (nov22.getDay() - 3 + 7) % 7; // 3 = Wednesday
	return addDays(nov22, -back);
}

type Rule = { name: string; states: readonly GermanState[] | 'all'; date: (year: number) => Date };

const ALL = 'all' as const;
const fixed = (month: number, day: number) => (year: number) => new Date(year, month - 1, day);
const easterPlus = (n: number) => (year: number) => addDays(easterSunday(year), n);

const RULES: Rule[] = [
	{ name: 'Neujahr', states: ALL, date: fixed(1, 1) },
	{ name: 'Heilige Drei Könige', states: ['BW', 'BY', 'ST'], date: fixed(1, 6) },
	{ name: 'Internationaler Frauentag', states: ['BE', 'MV'], date: fixed(3, 8) },
	{ name: 'Karfreitag', states: ALL, date: easterPlus(-2) },
	{ name: 'Ostermontag', states: ALL, date: easterPlus(1) },
	{ name: 'Tag der Arbeit', states: ALL, date: fixed(5, 1) },
	{ name: 'Christi Himmelfahrt', states: ALL, date: easterPlus(39) },
	{ name: 'Pfingstmontag', states: ALL, date: easterPlus(50) },
	{ name: 'Fronleichnam', states: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'], date: easterPlus(60) },
	{ name: 'Mariä Himmelfahrt', states: ['SL'], date: fixed(8, 15) },
	{ name: 'Weltkindertag', states: ['TH'], date: fixed(9, 20) },
	{ name: 'Tag der Deutschen Einheit', states: ALL, date: fixed(10, 3) },
	{
		name: 'Reformationstag',
		states: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'],
		date: fixed(10, 31)
	},
	{ name: 'Allerheiligen', states: ['BW', 'BY', 'NW', 'RP', 'SL'], date: fixed(11, 1) },
	{ name: 'Buß- und Bettag', states: ['SN'], date: bussUndBettag },
	{ name: '1. Weihnachtstag', states: ALL, date: fixed(12, 25) },
	{ name: '2. Weihnachtstag', states: ALL, date: fixed(12, 26) }
];

/** State-wide public holidays of `year` in `state`, sorted by date. */
export function germanHolidays(year: number, state: GermanState): Holiday[] {
	return RULES.filter((r) => r.states === ALL || r.states.includes(state))
		.map((r) => ({ day: dayKey(r.date(year)), name: r.name }))
		.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}
