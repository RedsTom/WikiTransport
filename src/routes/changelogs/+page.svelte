<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { useLocale } from '$lib/locale.svelte';
	import { changelogs, type LocalizedChangelog } from '$lib/data/changelogs';
	import GuideContent from '$lib/components/ui/markdown/GuideContent.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let expandedVersions = $state<Record<string, boolean>>({});

	function toggleVersion(v: string) {
		expandedVersions[v] = !expandedVersions[v];
	}

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

<svelte:head>
	<title>{m.app_title()} - {m.changelog()}</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-3xl px-4 py-6">
	<header class="mb-8 flex items-center gap-3">
		<button class="m3-icon-button" onclick={() => goto(resolve('/projects'))} aria-label={m.back()}>
			<span class="material-symbols-outlined">arrow_back</span>
		</button>
		<h1 class="text-xl font-bold text-on-surface">{m.changelog()}</h1>
	</header>

	<div class="flex flex-col gap-4">
		{#each changelogs as entry (entry.version)}
			{@const loc = localizeEntry(entry)}
			<article
				class="rounded-xl border border-outline/10 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex min-w-0 items-center gap-3">
						<span
							class="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs text-primary"
						>
							{m.version_badge({ version: loc.version })}
						</span>
						<h2 class="truncate text-base font-semibold text-on-surface">{loc.title}</h2>
					</div>
					<span class="shrink-0 text-xs text-on-surface-variant">{loc.date}</span>
				</div>

				<div class="mt-3">
					{#if expandedVersions[entry.version]}
						<GuideContent content={loc.content} />
					{:else}
						<p class="text-sm leading-relaxed text-on-surface-variant italic">
							{loc.summary}
						</p>
					{/if}
				</div>

				<button
					class="mt-3 flex items-center gap-1 text-sm text-primary transition-opacity hover:opacity-80"
					onclick={() => toggleVersion(entry.version)}
				>
					<span class="material-symbols-outlined text-base"
						>{expandedVersions[entry.version] ? 'expand_less' : 'expand_more'}</span
					>
					{expandedVersions[entry.version] ? m.show_less() : m.show_more()}
				</button>
			</article>
		{/each}
	</div>
</div>
