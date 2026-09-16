import { db } from './db';
import { settings } from './db/schema';
import type { Settings } from '$lib/types';
import { isGermanState } from '$lib/holidays';

const DEFAULTS: Settings = {
	targetJobPct: 50,
	weekStartDay: 1, // Monday
	weeklyHourTarget: null,
	dailyHourTarget: null,
	initialOvertimeHours: 0,
	theme: 'system',
	holidayState: null,
	phdEnabled: true
};

export function getSettings(): Settings {
	const rows = db.select().from(settings).all();
	const stored: Record<string, unknown> = {};
	for (const row of rows) {
		if (row.key.startsWith('_')) continue; // bookkeeping rows
		try {
			stored[row.key] = JSON.parse(row.value);
		} catch {
			// corrupt value: fall back to the default
		}
	}
	return { ...DEFAULTS, ...stored } as Settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
	const clean: Partial<Settings> = {};

	if (patch.targetJobPct !== undefined) {
		const v = Number(patch.targetJobPct);
		if (!Number.isFinite(v) || v < 0 || v > 100) throw new Error('targetJobPct must be 0–100');
		clean.targetJobPct = Math.round(v);
	}
	if (patch.weekStartDay !== undefined) {
		const v = Number(patch.weekStartDay);
		if (!Number.isInteger(v) || v < 0 || v > 6) throw new Error('weekStartDay must be 0–6');
		clean.weekStartDay = v;
	}
	if (patch.weeklyHourTarget !== undefined) {
		if (patch.weeklyHourTarget === null) {
			clean.weeklyHourTarget = null;
		} else {
			const v = Number(patch.weeklyHourTarget);
			if (!Number.isFinite(v) || v <= 0 || v > 168) throw new Error('weeklyHourTarget must be 1–168');
			clean.weeklyHourTarget = v;
		}
	}
	if (patch.dailyHourTarget !== undefined) {
		if (patch.dailyHourTarget === null) {
			clean.dailyHourTarget = null;
		} else {
			const v = Number(patch.dailyHourTarget);
			if (!Number.isFinite(v) || v <= 0 || v > 24) throw new Error('dailyHourTarget must be 0–24');
			clean.dailyHourTarget = v;
		}
	}
	if (patch.initialOvertimeHours !== undefined) {
		const v = Number(patch.initialOvertimeHours ?? 0);
		if (!Number.isFinite(v) || Math.abs(v) > 10_000)
			throw new Error('initialOvertimeHours must be a number (±10000)');
		clean.initialOvertimeHours = v;
	}
	if (patch.theme !== undefined) {
		if (!['light', 'dark', 'system'].includes(patch.theme)) throw new Error('invalid theme');
		clean.theme = patch.theme;
	}
	if (patch.holidayState !== undefined) {
		if (patch.holidayState !== null && !isGermanState(patch.holidayState))
			throw new Error('holidayState must be a German state code or null');
		clean.holidayState = patch.holidayState;
	}
	if (patch.phdEnabled !== undefined) {
		if (typeof patch.phdEnabled !== 'boolean') throw new Error('phdEnabled must be a boolean');
		clean.phdEnabled = patch.phdEnabled;
	}

	for (const [key, value] of Object.entries(clean)) {
		db.insert(settings)
			.values({ key, value: JSON.stringify(value) })
			.onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value) } })
			.run();
	}
	return getSettings();
}
