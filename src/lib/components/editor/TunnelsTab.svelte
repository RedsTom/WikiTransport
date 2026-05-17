<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';

	let search = $state('');
	let collapsed = $state<Set<number>>(new Set());

	function selectSegment(key: string) {
		editorState.selectedTunnelKey = key;
		editorState.rightTab = 'tunnel';
	}

	function toggleCollapse(lineId: number) {
		const next = new Set(collapsed);
		if (next.has(lineId)) {
			next.delete(lineId);
		} else {
			next.add(lineId);
		}
		collapsed = next;
	}

	function stationNameAt(x: number, y: number): string | null {
		for (const st of editorState.stations) {
			const pos = editorState.stationPosition(st);
			if (Math.round(pos.x) === Math.round(x) && Math.round(pos.y) === Math.round(y)) {
				return st.name;
			}
		}
		return null;
	}

	type SegmentEntry = {
		key: string;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		name1: string | null;
		name2: string | null;
		lineIds: number[];
	};

	type LineGroup = {
		lineId: number;
		segments: SegmentEntry[];
	};

	let groups = $derived.by<LineGroup[]>(() => {
		const q = search.toLowerCase();
		const segments = editorState.tunnelInfo.filter((t) => {
			if (!q) return true;
			for (const lid of t.lineIds) {
				const line = editorState.lineMap.get(lid);
				if (line && line.name.toLowerCase().includes(q)) return true;
			}
			return false;
		});

		const byLine = new SvelteMap<number, SegmentEntry[]>();

		for (const seg of segments) {
			const [p1, p2] = [
				seg.key.split(';')[0].split(',').map(Number),
				seg.key.split(';')[1].split(',').map(Number)
			];
			const entry: SegmentEntry = {
				key: seg.key,
				x1: p1[0],
				y1: p1[1],
				x2: p2[0],
				y2: p2[1],
				name1: stationNameAt(p1[0], p1[1]),
				name2: stationNameAt(p2[0], p2[1]),
				lineIds: [...seg.lineIds]
			};
			for (const lid of seg.lineIds) {
				const arr = byLine.get(lid) ?? [];
				arr.push(entry);
				byLine.set(lid, arr);
			}
		}

		const sortedLines = editorState.lines
			.filter((l) => l.id != null && byLine.has(l.id))
			.sort((a, b) => a.name.localeCompare(b.name));

		return sortedLines.map((line) => ({
			lineId: line.id!,
			segments: byLine.get(line.id!)!
		}));
	});
</script>

<div class="flex flex-col gap-2">
	<div class="relative">
		<span
			class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-on-surface-variant"
		>
			<span class="material-symbols-outlined text-sm">search</span>
		</span>
		<input
			type="text"
			placeholder={m.search_lines()}
			bind:value={search}
			class="w-full rounded-md border border-outline/20 bg-transparent py-1.5 pr-3 pl-8 text-sm"
		/>
	</div>

	<div class="flex flex-col gap-2">
		{#each groups as group (group.lineId)}
			{@const line = editorState.lineMap.get(group.lineId)}
			<div class="flex flex-col gap-0.5">
				<button
					class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-variant/60"
					onclick={() => toggleCollapse(group.lineId)}
				>
					<span
						class="material-symbols-outlined text-base transition-transform {collapsed.has(
							group.lineId
						)
							? '-rotate-90'
							: ''}"
					>
						expand_more
					</span>
					<span
						class="block h-3 w-3 shrink-0 rounded-full"
						style="background:{line?.color ?? '#888'}"
					></span>
					<span class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
						{line?.name ?? ''}
					</span>
					<span class="ml-auto text-xs text-on-surface-variant/60">
						{group.segments.length}
					</span>
				</button>
				{#if !collapsed.has(group.lineId)}
					{#each group.segments as seg (seg.key + '-' + group.lineId)}
						<button
							class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-variant/60 {editorState.selectedTunnelKey ===
							seg.key
								? 'bg-secondary-container text-on-secondary-container'
								: ''}"
							onclick={() => selectSegment(seg.key)}
							onmouseenter={() => (editorState.hoveredTunnelKey = seg.key)}
							onmouseleave={() => (editorState.hoveredTunnelKey = null)}
						>
							<span class="truncate text-xs">
								{seg.name1 ?? `(${seg.x1},${seg.y1})`} → {seg.name2 ?? `(${seg.x2},${seg.y2})`}
							</span>
							<div class="ml-auto flex items-center gap-0.5">
								{#each seg.lineIds.filter((lid) => lid !== group.lineId) as lid}
									{@const otherLine = editorState.lineMap.get(lid)}
									{#if otherLine}
										<span
											class="block h-2.5 w-2.5 shrink-0 rounded-full"
											style="background:{otherLine.color}"
											title={otherLine.name}
										></span>
									{/if}
								{/each}
							</div>
						</button>
					{/each}
				{/if}
			</div>
		{/each}
		{#if groups.length === 0}
			<p class="px-2 text-sm text-on-surface-variant">{m.nothing_matches()}</p>
		{/if}
	</div>
</div>
