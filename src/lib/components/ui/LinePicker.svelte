<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let {
		onSelect = (_lineId: number) => {},
		excludeLineIds = new Set<number>(),
		onlyShowLineIds = undefined as Set<number> | undefined
	}: {
		onSelect: (lineId: number) => void;
		excludeLineIds?: Set<number>;
		onlyShowLineIds?: Set<number>;
	} = $props();

	let lineSearch = $state('');

	function stopProp(e: Event) {
		e.stopPropagation();
	}

	let linesToShow = $derived(
		editorState.lines.filter((l) => {
			if (l.id == null) return false;
			if (onlyShowLineIds && !onlyShowLineIds.has(l.id)) return false;
			if (excludeLineIds.has(l.id)) return false;
			return true;
		})
	);

	let linesByType = $derived.by(() => {
		const groups = new SvelteMap<string, typeof linesToShow>();
		const uncategorized: typeof linesToShow = [];
		const sorted = [...linesToShow].sort((a, b) => a.name.localeCompare(b.name));
		for (const line of sorted) {
			const type =
				line.transitTypeId != null
					? editorState.transitTypes.find((t) => t.id === line.transitTypeId)
					: null;
			if (type) {
				const key = type.name;
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key)!.push(line);
			} else {
				uncategorized.push(line);
			}
		}
		return {
			groups: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)),
			uncategorized
		};
	});

	let filteredLineGroups = $derived.by(() => {
		const q = lineSearch.toLowerCase();
		if (!q) return linesByType;
		const groups: [string, typeof linesToShow][] = [];
		for (const [name, lns] of linesByType.groups) {
			const fl = lns.filter((l) => l.name.toLowerCase().includes(q));
			if (fl.length) groups.push([name, fl]);
		}
		return {
			groups,
			uncategorized: linesByType.uncategorized.filter((l) => l.name.toLowerCase().includes(q))
		};
	});

	const typeIconMap = $derived(
		new SvelteMap(editorState.transitTypes.map((t) => [t.id, t.icon ?? 'directions_transit']))
	);
</script>

<div class="m3-menu__search">
	<span class="material-symbols-outlined m3-menu__search-icon">search</span>
	<input
		type="text"
		placeholder={m.search_lines()}
		bind:value={lineSearch}
		onclick={stopProp}
		onkeydown={stopProp}
		class="m3-menu__search-input"
	/>
</div>
<div class="max-h-48 overflow-y-auto">
	{#each filteredLineGroups.groups as [typeName, lines] (typeName)}
		<div class="m3-menu__group-label">{typeName}</div>
		{#each lines as line (line.id)}
			<button type="button" class="m3-menu__item" onclick={() => onSelect(line.id!)}>
				<div class="h-3 w-3 shrink-0 rounded-full" style="background-color: {line.color}"></div>
				<span class="flex-1 truncate">{line.name}</span>
				{#if line.transitTypeId != null && typeIconMap.has(line.transitTypeId)}
					<span class="material-symbols-outlined ml-auto text-sm text-on-surface-variant"
						>{typeIconMap.get(line.transitTypeId!)}</span
					>
				{/if}
			</button>
		{/each}
	{/each}
	{#if filteredLineGroups.uncategorized.length}
		<div class="m3-menu__group-label">{m.other_lines()}</div>
		{#each filteredLineGroups.uncategorized as line (line.id)}
			<button type="button" class="m3-menu__item" onclick={() => onSelect(line.id!)}>
				<div class="h-3 w-3 shrink-0 rounded-full" style="background-color: {line.color}"></div>
				<span class="flex-1 truncate">{line.name}</span>
			</button>
		{/each}
	{/if}
	{#if filteredLineGroups.groups.length === 0 && filteredLineGroups.uncategorized.length === 0}
		<div class="m3-menu__empty">{m.no_lines_found()}</div>
	{/if}
</div>
