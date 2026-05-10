<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import '$lib/components/ui/m3.css';
	import './layout.css';
	import './theme.css';

	let { children } = $props();
</script>

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
