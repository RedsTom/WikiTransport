import type { Handle } from '@sveltejs/kit';
import {
	getTextDirection,
	locales,
	baseLocale,
	cookieName
} from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = async ({ event, resolve }) => {
	const url = new URL(event.request.url);
	const firstSegment = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase();

	const detectedLocale =
		firstSegment && locales.includes(firstSegment as typeof locales[number])
			? firstSegment
			: baseLocale;

	// Inject cookie into the request so paraglideMiddleware detects it
	// on the very first visit (event.cookies.set only affects the response).
	const headers = new Headers(event.request.headers);
	const cookies = (headers.get('Cookie') || '')
		.split('; ')
		.filter((c) => !c.startsWith(`${cookieName}=`));
	cookies.push(`${cookieName}=${detectedLocale}`);
	headers.set('Cookie', cookies.join('; '));
	event.request = new Request(event.request, { headers });

	event.cookies.set(cookieName, detectedLocale, { path: '/' });

	return handleParaglide({ event, resolve });
};
