import { json } from '@sveltejs/kit';
import { OverlapError, ValidationError } from './windows';

/** Run a handler, mapping domain errors to 400/409 JSON responses. */
export function handle(fn: () => Response): Response {
	try {
		return fn();
	} catch (e) {
		if (e instanceof OverlapError) return json({ error: e.message }, { status: 409 });
		if (e instanceof ValidationError || e instanceof SyntaxError)
			return json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
		throw e;
	}
}
