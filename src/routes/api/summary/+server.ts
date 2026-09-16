import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSummary } from '$lib/server/summary';
import { ValidationError } from '$lib/server/windows';
import { handle } from '$lib/server/api';
import { dayKey } from '$lib/time';

export const GET: RequestHandler = ({ url }) =>
	handle(() => {
		const day = url.searchParams.get('day') ?? dayKey(Date.now());
		if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ValidationError('day must be YYYY-MM-DD');
		return json(getSummary(day));
	});
