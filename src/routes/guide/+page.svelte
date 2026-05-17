<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { useLocale } from '$lib/locale.svelte';
	import { getSections } from '$lib/data/guide';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let locale = $derived(useLocale());
	let sections = $derived(getSections(locale));
</script>

<svelte:head>
	<title>{m.app_title()} - {m.guide()}</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
	<header class="mb-6 flex items-center gap-3">
		<button class="m3-icon-button" onclick={() => goto(resolve('/projects'))} aria-label={m.back()}>
			<span class="material-symbols-outlined">arrow_back</span>
		</button>
		<h1 class="text-xl font-bold text-on-surface">{m.guide()}</h1>
	</header>

	<div class="grid gap-2">
		{#each sections as section (section.id)}
			<button
				class="flex w-full items-center gap-3 rounded-lg border border-outline/10 px-4 py-3 text-left transition-colors hover:bg-surface-variant/40"
				onclick={() => goto(resolve(`/guide/${section.id}`))}
			>
				<span class="material-symbols-outlined shrink-0 text-lg text-primary">article</span>
				<div class="min-w-0 flex-1">
					<div class="truncate font-medium text-on-surface">{section.title}</div>
					{#if section.updated}
						<div class="text-xs text-on-surface-variant/60">
							{m.last_updated()}: {section.updated}
						</div>
					{/if}
				</div>
				<span class="material-symbols-outlined shrink-0 text-base text-on-surface-variant/40"
					>chevron_right</span
				>
			</button>
		{/each}
	</div>
</div>
