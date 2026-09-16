import type { RequestHandler } from './$types';
import { exportFilename, getFilteredMarks, getFilteredWindows, resolveFilter } from '$lib/server/export/query';
import { toJsonExport } from '$lib/server/export/json';

export const GET: RequestHandler = ({ url }) => {
	const filter = resolveFilter(url.searchParams);
	const body = JSON.stringify(
		toJsonExport(getFilteredWindows(filter), filter, getFilteredMarks(filter)),
		null,
		2
	);
	return new Response(body, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="${exportFilename(filter, 'json')}"`
		}
	});
};
