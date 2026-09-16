import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startTimer, sweepOvernight } from '$lib/server/timer';
import { ValidationError } from '$lib/server/windows';
import { handle } from '$lib/server/api';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	return handle(() => {
		if (body.side !== 'job' && body.side !== 'phd')
			throw new ValidationError('side must be "job" or "phd"');
		sweepOvernight();
		return json(startTimer(body.side, body.note ?? null));
	});
};
