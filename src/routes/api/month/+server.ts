import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMonthOverview } from '$lib/server/month';
import { ValidationError } from '$lib/server/windows';
import { handle } from '$lib/server/api';

export const GET: RequestHandler = ({ url }) =>
	handle(() => {
		const month = url.searchParams.get('month') ?? '';
		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ValidationError('month must be YYYY-MM');
		return json(getMonthOverview(month));
	});
