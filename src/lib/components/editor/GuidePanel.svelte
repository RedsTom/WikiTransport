<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { useLocale } from '$lib/locale.svelte';
	import { getSections, getSection } from '$lib/data/guide';
	import type { GuideSection } from '$lib/data/guide';
	import GuideContent from '$lib/components/ui/markdown/GuideContent.svelte';

	let currentId = $state<string | null>(null);

	let locale = $derived(useLocale());

	let sections = $derived(getSections(locale));

	let currentSection = $derived<GuideSection | undefined>(
		currentId ? getSection(locale, currentId) : undefined
	);

	function openSection(id: string) {
		currentId = id;
	}

	function goBack() {
		currentId = null;
	}
</script>

{#if currentSection}
	<div class="flex h-full flex-col">
		<div class="flex items-center gap-2 border-b border-outline/20 px-3 py-2">
			<button class="m3-icon-button shrink-0" onclick={goBack} aria-label={m.back()}>
				<span class="material-symbols-outlined">arrow_back</span>
			</button>
			<h2 class="truncate text-sm font-bold text-on-surface">{currentSection.title}</h2>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#if currentSection.updated}
				<p class="px-4 pt-3 text-xs text-on-surface-variant/60">
					{m.last_updated()}: {currentSection.updated}
				</p>
			{/if}
			<div class="px-4 py-3">
				<GuideContent content={currentSection.content} />
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-full flex-col">
		<div class="flex items-center justify-between border-b border-outline/20 px-3 py-2">
			<h2 class="text-sm font-bold text-on-surface">{m.guide()}</h2>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			{#each sections as section (section.id)}
				<button
					class="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-variant/40"
					onclick={() => openSection(section.id)}
				>
					<span class="material-symbols-outlined shrink-0 text-lg text-primary">article</span>
					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-medium text-on-surface">{section.title}</div>
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
{/if}
