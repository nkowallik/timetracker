import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createWindow, getWindowsForDay, getWindowsInRange, ValidationError } from '$lib/server/windows';
import { sweepOvernight } from '$lib/server/timer';
import { handle } from '$lib/server/api';
import { dayTimeToMs } from '$lib/time';
import type { Side } from '$lib/types';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function parseSide(v: unknown): Side {
	if (v !== 'job' && v !== 'phd') throw new ValidationError('side must be "job" or "phd"');
	return v;
}

export const GET: RequestHandler = ({ url }) =>
	handle(() => {
		sweepOvernight();
		const day = url.searchParams.get('day');
		if (day) {
			if (!DAY_RE.test(day)) throw new ValidationError('day must be YYYY-MM-DD');
			return json({ windows: getWindowsForDay(day) });
		}
		const from = url.searchParams.get('from');
		const to = url.searchParams.get('to');
		if (!from || !to || !DAY_RE.test(from) || !DAY_RE.test(to))
			throw new ValidationError('provide ?day= or ?from=&to= (YYYY-MM-DD)');
		const side = url.searchParams.get('side');
		return json({ windows: getWindowsInRange(from, to, side ? parseSide(side) : undefined) });
	});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	return handle(() => {
		const side = parseSide(body.side);
		const day = String(body.day ?? '');
		if (!DAY_RE.test(day)) throw new ValidationError('day must be YYYY-MM-DD');
		if (!TIME_RE.test(body.start ?? '') || !TIME_RE.test(body.end ?? ''))
			throw new ValidationError('start and end must be HH:MM');
		const startTs = dayTimeToMs(day, body.start);
		let endTs = dayTimeToMs(day, body.end);
		// "end 00:00" means end of day
		if (endTs <= startTs && body.end === '00:00') endTs = dayTimeToMs(day, '24:00');
		const windows = createWindow({ side, startTs, endTs, note: body.note ?? null });
		return json({ windows }, { status: 201 });
	});
};
