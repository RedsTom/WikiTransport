<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';

	let search = $state('');
	let collapsed = $state<Set<number>>(new Set());
	let initialCollapsedSet = $state(false);

	$effect(() => {
		if (initialCollapsedSet || groups.length === 0) return;
		const next = new Set<number>();
		for (const g of groups) next.add(g.lineId);
		collapsed = next;
		initialCollapsedSet = true;
	});

	function selectSegment(key: string) {
		editorState.selectedTunnelKey = key;
		editorState.rightTab = 'tunnel';
	}

	function selectCorner(key: string) {
		editorState.selectedCornerKey = key;
		editorState.rightTab = 'corner';
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

	type ListItem =
		| {
				kind: 'segment';
				key: string;
				x1: number;
				y1: number;
				x2: number;
				y2: number;
				name1: string | null;
				name2: string | null;
				lineIds: number[];
		  }
		| { kind: 'corner'; key: string; x: number; y: number };

	type LineGroup = {
		lineId: number;
		items: ListItem[];
	};

	let groups = $derived.by<LineGroup[]>(() => {
		const q = search.toLowerCase();
		const { basePaths } = editorState.tunnelData;

		const lineHasMatch = (lineId: number): boolean => {
			if (!q) return true;
			const line = editorState.lineMap.get(lineId);
			return line != null && line.name.toLowerCase().includes(q);
		};

		const sortedLines = editorState.lines
			.filter((l) => l.id != null && basePaths.has(l.id) && lineHasMatch(l.id))
			.sort((a, b) => a.name.localeCompare(b.name));

		return sortedLines.map((line) => {
			const path = basePaths.get(line.id!)!;
			const items: ListItem[] = [];
			const seenCorners = new Set<string>();

			for (let i = 0; i < path.length; i++) {
				if (i < path.length - 1) {
					const u = path[i];
					const v = path[i + 1];
					const segKey = `${u.x},${u.y};${v.x},${v.y}`;
					const tunnel = editorState.tunnelData.tunnels.get(segKey);
					items.push({
						kind: 'segment',
						key: segKey,
						x1: u.x,
						y1: u.y,
						x2: v.x,
						y2: v.y,
						name1: stationNameAt(u.x, u.y),
						name2: stationNameAt(v.x, v.y),
						lineIds: tunnel ? Array.from(tunnel.lines) : [line.id!]
					});
				}

				if (i > 0 && i < path.length - 1) {
					const p = path[i];
					const ck = `${p.x},${p.y}`;
					if (!seenCorners.has(ck)) {
						seenCorners.add(ck);
						items.push({ kind: 'corner', key: ck, x: p.x, y: p.y });
					}
				}
			}

			return { lineId: line.id!, items };
		});
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
						{group.items.length}
					</span>
				</button>
				{#if !collapsed.has(group.lineId)}
					{#each group.items as item (item.key + '-' + group.lineId)}
						{#if item.kind === 'segment'}
							<button
								class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-variant/60 {editorState.selectedTunnelKey ===
								item.key
									? 'bg-secondary-container text-on-secondary-container'
									: ''}"
								onclick={() => selectSegment(item.key)}
								onmouseenter={() => (editorState.hoveredTunnelKey = item.key)}
								onmouseleave={() => (editorState.hoveredTunnelKey = null)}
							>
								<span class="material-symbols-outlined text-sm text-on-surface-variant/60"
									>linear_scale</span
								>
								<span class="truncate text-xs">
									{item.name1 ?? `(${item.x1},${item.y1})`} → {item.name2 ??
										`(${item.x2},${item.y2})`}
								</span>
								<div class="ml-auto flex items-center gap-0.5">
									{#each item.lineIds.filter((lid) => lid !== group.lineId) as lid}
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
						{:else}
							{@const radius = editorState.cornerRadii[item.key] ?? 0}
							<button
								class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-variant/60 {editorState.selectedCornerKey ===
								item.key
									? 'bg-secondary-container text-on-secondary-container'
									: ''}"
								onclick={() => selectCorner(item.key)}
								onmouseenter={() => (editorState.hoveredCornerKey = item.key)}
								onmouseleave={() => (editorState.hoveredCornerKey = null)}
							>
								<span class="material-symbols-outlined text-sm text-on-surface-variant/60"
									>trip_origin</span
								>
								<span class="truncate text-xs">
									({item.x}, {item.y})
								</span>
								<span class="ml-auto text-xs text-on-surface-variant/60">
									{radius > 0 ? `${radius}px` : '—'}
								</span>
							</button>
						{/if}
					{/each}
				{/if}
			</div>
		{/each}
		{#if groups.length === 0}
			<p class="px-2 text-sm text-on-surface-variant">{m.nothing_matches()}</p>
		{/if}
	</div>
</div>
