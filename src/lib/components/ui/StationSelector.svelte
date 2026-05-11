<script lang="ts">
	import { createDropdownMenu } from '@melt-ui/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';

	let {
		onSelect = () => {},
		excludeIds = [] as number[],
		label = m.select_station(),
		variant = 'outlined' as 'outlined' | 'text',
		selectedId = null as number | null,
		class: className = '',
		includeIcon = true
	}: {
		onSelect: (id: number) => void;
		excludeIds?: number[];
		label?: string;
		variant?: 'outlined' | 'text';
		selectedId?: number | null;
		class?: string;
		includeIcon: boolean;
	} = $props();

	const {
		elements: { trigger, menu },
		states: { open }
	} = createDropdownMenu();

	let selectedStation = $derived(
		selectedId ? editorState.stations.find((s) => s.id === selectedId) : null
	);

	let search = $state('');

	let filtered = $derived(
		[...editorState.stations]
			.filter(
				(s) =>
					s.id && !excludeIds.includes(s.id) && s.name.toLowerCase().includes(search.toLowerCase())
			)
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	$effect(() => {
		if ($open === false) search = '';
	});

	function handleSelect(id: number) {
		onSelect(id);
	}
</script>

<div class="relative inline-flex {className}">
	<!-- eslint-disable svelte/require-store-reactive-access -->
	<button
		type="button"
		{...$trigger}
		use:trigger
		class="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {variant ===
		'outlined'
			? 'border border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'
			: 'text-on-surface-variant hover:text-on-surface'}"
	>
		{#if includeIcon}
			<span class="material-symbols-outlined text-sm">location_on</span>
		{/if}
		<span class="truncate">{selectedStation?.name ?? label}</span>
		<span class="material-symbols-outlined text-sm">unfold_more</span>
	</button>
	<!-- eslint-enable svelte/require-store-reactive-access -->
</div>

<!-- eslint-disable svelte/require-store-reactive-access -->
<div
	{...$menu}
	use:menu
	class="z-50 overflow-hidden rounded-lg border border-outline/20 bg-surface p-2 shadow-xl"
>
	<div class="relative mb-1">
		<span
			class="material-symbols-outlined absolute top-1/2 left-2 -translate-y-1/2 text-sm text-on-surface-variant"
			>search</span
		>
		<input
			type="text"
			placeholder={m.search_stations()}
			bind:value={search}
			onclick={(e) => e.stopPropagation()}
			class="w-full rounded-md border border-outline/20 bg-transparent py-1.5 pr-2 pl-8 text-sm outline-none focus:border-primary"
		/>
	</div>
	<div class="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
		{#each filtered as station (station.id)}
			<button
				type="button"
				class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-variant"
				onclick={() => handleSelect(station.id!)}
			>
				<span class="material-symbols-outlined shrink-0 text-sm text-on-surface-variant"
					>location_on</span
				>
				<span class="truncate">{station.name}</span>
			</button>
		{/each}
		{#if filtered.length === 0}
			<div class="p-2 text-center text-xs text-on-surface-variant opacity-70">
				{search ? m.no_stations_match() : m.no_stations_available()}
			</div>
		{/if}
	</div>
</div>
