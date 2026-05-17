<script lang="ts">
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages.js';
	import { changelogs, type LocalizedChangelog } from '$lib/data/changelogs';
	import { useLocale } from '$lib/locale.svelte';

	let currentLocale = $derived(useLocale());

	function localizeEntry(entry: LocalizedChangelog) {
		return {
			version: entry.version,
			date: entry.date,
			title: currentLocale === 'fr' ? entry.titleFr : entry.titleEn,
			summary: currentLocale === 'fr' ? entry.summaryFr : entry.summaryEn,
			content: currentLocale === 'fr' ? entry.contentFr : entry.contentEn
		};
	}
</script>

{#if changelogs.length > 0}
	<hr class="my-8 border-outline/10" />

	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xl text-on-surface-variant">{m.changelog()}</h2>
		<a
			href={resolve('/changelogs')}
			class="flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
		>
			{m.all_changelogs()}
			<span class="material-symbols-outlined text-base">arrow_forward</span>
		</a>
	</div>

	{#each [changelogs[0]] as latest (latest.version)}
		{@const loc = localizeEntry(latest)}
		<div
			class="rounded-xl border border-outline/10 bg-surface p-4 shadow-xs transition-shadow hover:shadow-sm"
		>
			<div class="flex items-start justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary"
					>
						{m.version_badge({ version: loc.version })}
					</span>
					<h3 class="truncate text-base font-semibold text-on-surface">{loc.title}</h3>
				</div>
				<span class="shrink-0 text-xs text-on-surface-variant">{loc.date}</span>
			</div>

			<div class="mt-3 text-sm leading-relaxed text-on-surface-variant italic">
				{loc.summary}
			</div>
		</div>
	{/each}
{/if}
