import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteWindow, updateWindow, ValidationError } from '$lib/server/windows';
import { handle } from '$lib/server/api';
import { dayTimeToMs } from '$lib/time';

const TIME_RE = /^\d{2}:\d{2}$/;

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	return handle(() => {
		const id = Number(params.id);
		if (!Number.isInteger(id)) throw new ValidationError('invalid id');

		const patch: Parameters<typeof updateWindow>[1] = {};
		if (body.side !== undefined) {
			if (body.side !== 'job' && body.side !== 'phd')
				throw new ValidationError('side must be "job" or "phd"');
			patch.side = body.side;
		}
		if (body.note !== undefined) patch.note = body.note;
		const day = body.day;
		if (body.start !== undefined) {
			if (!TIME_RE.test(body.start) || !day) throw new ValidationError('start must be HH:MM with a day');
			patch.startTs = dayTimeToMs(day, body.start);
		}
		if (body.end !== undefined) {
			if (body.end === null) {
				patch.endTs = undefined; // cannot un-stop a window
			} else {
				if (!TIME_RE.test(body.end) || !day) throw new ValidationError('end must be HH:MM with a day');
				let endTs = dayTimeToMs(day, body.end);
				if (body.end === '00:00') endTs = dayTimeToMs(day, '24:00');
				patch.endTs = endTs;
			}
		}
		return json({ windows: updateWindow(id, patch) });
	});
};

export const DELETE: RequestHandler = ({ params }) =>
	handle(() => {
		const id = Number(params.id);
		if (!Number.isInteger(id)) throw new ValidationError('invalid id');
		deleteWindow(id);
		return json({ ok: true });
	});
