import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stopTimer, sweepOvernight } from '$lib/server/timer';
import { handle } from '$lib/server/api';

export const POST: RequestHandler = () =>
	handle(() => {
		sweepOvernight();
		return json({ stopped: stopTimer() });
	});
