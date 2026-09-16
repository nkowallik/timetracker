import type { LayoutServerLoad } from './$types';
import { getSettings } from '$lib/server/settings';
import { ensurePublicHolidays } from '$lib/server/holidays';

export const load: LayoutServerLoad = () => {
	const settings = getSettings();
	ensurePublicHolidays(settings.holidayState);
	return { settings };
};
