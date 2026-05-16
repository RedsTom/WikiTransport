<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import '$lib/components/ui/m3.css';
	import './layout.css';
	import './theme.css';

	let { children } = $props();
</script>

<svelte:head>
	<meta property="og:title" content={m.app_title()} />
	<meta property="og:description" content={m.og_description()} />
	<meta property="og:url" content={page.url.origin} />
	<meta property="og:image" content={`${page.url.origin}/assets/Global%20View.png`} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={m.app_title()} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={m.app_title()} />
	<meta name="twitter:description" content={m.og_description()} />
	<meta name="twitter:image" content={`${page.url.origin}/assets/Global%20View.png`} />
</svelte:head>

<div class="min-h-screen bg-surface font-sans text-on-surface">
	{@render children()}
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)} data-sveltekit-reload
			>{locale}</a
		>
	{/each}
</div>
