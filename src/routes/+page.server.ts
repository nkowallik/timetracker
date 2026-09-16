import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWindowsForDay } from '$lib/server/windows';
import { getSummary } from '$lib/server/summary';
import { sweepOvernight } from '$lib/server/timer';
import { dayKey } from '$lib/time';

export const load: PageServerLoad = ({ url }) => {
	const today = dayKey(Date.now());
	const day = url.searchParams.get('day') ?? today;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) redirect(302, '/');
	sweepOvernight();
	return {
		day,
		today,
		windows: getWindowsForDay(day),
		summary: getSummary(day)
	};
};
