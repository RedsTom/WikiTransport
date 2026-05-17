<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { useLocale } from '$lib/locale.svelte';
	import { getSection } from '$lib/data/guide';
	import GuideContent from '$lib/components/ui/markdown/GuideContent.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { params } = $props();

	let locale = $derived(useLocale());

	let section = $derived(getSection(locale, params.id));
</script>

<svelte:head>
	<title>{m.app_title()} - {section?.title ?? m.guide()}</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
	<header class="mb-6 flex items-center gap-3">
		<button class="m3-icon-button" onclick={() => goto(resolve('/guide'))} aria-label={m.back()}>
			<span class="material-symbols-outlined">arrow_back</span>
		</button>
		<h1 class="text-xl font-bold text-on-surface">
			{section?.title ?? m.guide()}
		</h1>
	</header>

	{#if section}
		<div class="flex flex-col">
			{#if section.updated}
				<p class="mb-3 text-xs text-on-surface-variant/60">
					{m.last_updated()}: {section.updated}
				</p>
			{/if}

			<GuideContent content={section.content} />
		</div>
	{:else}
		<p class="text-on-surface-variant">{m.section_not_found()}</p>
	{/if}
</div>
