import type { RequestHandler } from './$types';
import { exportFilename, getFilteredMarks, getFilteredWindows, resolveFilter } from '$lib/server/export/query';
import { buildPdf } from '$lib/server/export/pdf';

export const GET: RequestHandler = async ({ url }) => {
	const filter = resolveFilter(url.searchParams);
	const buffer = await buildPdf(getFilteredWindows(filter), filter, getFilteredMarks(filter));
	return new Response(new Uint8Array(buffer), {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': `attachment; filename="${exportFilename(filter, 'pdf')}"`
		}
	});
};
