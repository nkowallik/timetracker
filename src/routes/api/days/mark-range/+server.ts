import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markDayRange } from '$lib/server/dayMarks';
import { ValidationError } from '$lib/server/windows';
import { handle } from '$lib/server/api';
import { DAY_MARK_TYPES, type DayMarkType } from '$lib/types';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(v: unknown, label: string): string {
	if (typeof v !== 'string' || !DAY_RE.test(v))
		throw new ValidationError(`${label} must be YYYY-MM-DD`);
	return v;
}

/** Mark every working day in a range (weekends and public holidays are skipped). */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	return handle(() => {
		const type = body.type;
		if (!DAY_MARK_TYPES.includes(type))
			throw new ValidationError(`type must be one of: ${DAY_MARK_TYPES.join(', ')}`);
		const result = markDayRange(
			parseDay(body.from, 'from'),
			parseDay(body.to, 'to'),
			type as DayMarkType,
			typeof body.note === 'string' ? body.note : null
		);
		return json(result);
	});
};
