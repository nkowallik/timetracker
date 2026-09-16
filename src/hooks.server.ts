import type { Handle } from '@sveltejs/kit';
import { getSettings } from '$lib/server/settings';

// Set the theme attribute during SSR so there is no flash before hydration.
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: ({ html }) => {
			const { theme } = getSettings();
			return html.replace('%theme.attr%', theme === 'system' ? '' : ` data-theme="${theme}"`);
		}
	});
