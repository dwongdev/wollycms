import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();

	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('text/html')) return response;

	let gaId: string | undefined;
	try {
		// Astro on Cloudflare exposes worker bindings via locals.runtime.env
		const runtime = (context.locals as Record<string, any>).runtime;
		gaId = runtime?.env?.GA_MEASUREMENT_ID;
	} catch {
		// Not running on Workers
	}

	if (!gaId) return response;

	const gaScript = `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');</script>`;

	const html = await response.text();
	const injected = html.replace('</head>', `${gaScript}</head>`);

	return new Response(injected, {
		status: response.status,
		headers: response.headers,
	});
});
