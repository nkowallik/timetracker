import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, updateSettings } from '$lib/server/settings';
import { ensurePublicHolidays } from '$lib/server/holidays';
import { getRunningWindow } from '$lib/server/windows';
import { stopTimer } from '$lib/server/timer';

export const GET: RequestHandler = () => json(getSettings());

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	try {
		const settings = updateSettings(body);
		ensurePublicHolidays(settings.holidayState);
		// a running PhD timer would be invisible once the side is hidden
		if (!settings.phdEnabled && getRunningWindow()?.side === 'phd') stopTimer();
		return json(settings);
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
	}
};
