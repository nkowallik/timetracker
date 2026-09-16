import type { RequestHandler } from './$types';
import { exportFilename, getFilteredMarks, getFilteredWindows, resolveFilter } from '$lib/server/export/query';
import { toCsv } from '$lib/server/export/csv';

export const GET: RequestHandler = ({ url }) => {
	const filter = resolveFilter(url.searchParams);
	const csv = toCsv(getFilteredWindows(filter), getFilteredMarks(filter));
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${exportFilename(filter, 'csv')}"`
		}
	});
};
