import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearDayMark, getDayMark, setDayMark } from '$lib/server/dayMarks';
import { ValidationError } from '$lib/server/windows';
import { handle } from '$lib/server/api';
import { DAY_MARK_TYPES, type DayMarkType } from '$lib/types';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(v: string | undefined): string {
	if (!v || !DAY_RE.test(v)) throw new ValidationError('day must be YYYY-MM-DD');
	return v;
}

export const GET: RequestHandler = ({ params }) =>
	handle(() => json({ mark: getDayMark(parseDay(params.day)) }));

export const PUT: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	return handle(() => {
		const type = body.type;
		if (!DAY_MARK_TYPES.includes(type))
			throw new ValidationError(`type must be one of: ${DAY_MARK_TYPES.join(', ')}`);
		const mark = setDayMark(parseDay(params.day), type as DayMarkType, body.note ?? null);
		return json({ mark });
	});
};

export const DELETE: RequestHandler = ({ params }) =>
	handle(() => {
		clearDayMark(parseDay(params.day));
		return json({ ok: true });
	});
