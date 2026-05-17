<script lang="ts">
	import { dragHandleZone, dragHandle, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { LineService } from '$lib/services/LineService';
	import { DND_DROP_TARGET_STYLE } from '$lib/constants/schematic';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	const flipDurationMs = 200;

	type DndItem = { id: string; lineId: number };

	let dndItems = $state<DndItem[]>([]);
	let isDragging = $state(false);

	let tunnel = $derived(editorState.selectedTunnel);
	let tunnelKey = $derived(tunnel?.key ?? '');

	$effect(() => {
		if (isDragging) return;
		const t = tunnel;
		if (!t) {
			dndItems = [];
			return;
		}
		const order = editorState.tunnelOrder[t.key];
		const sortLines = (ids: number[]) =>
			[...ids].sort((a, b) => {
				const ta = editorState.lineMap.get(a)?.transitTypeId ?? 0;
				const tb = editorState.lineMap.get(b)?.transitTypeId ?? 0;
				return ta - tb || a - b;
			});
		let sortedIds: number[];
		if (order && order.length > 0) {
			const custom = order.filter((id) => t.lineIds.includes(id));
			const remaining = sortLines(t.lineIds.filter((id) => !custom.includes(id)));
			sortedIds = [...custom, ...remaining];
		} else {
			sortedIds = sortLines(t.lineIds);
		}
		dndItems = sortedIds.map((lineId) => ({ id: `l-${lineId}`, lineId }));
	});

	function handleDndConsider(e: CustomEvent<DndEvent<DndItem>>) {
		isDragging = true;
		dndItems = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent<DndEvent<DndItem>>) {
		dndItems = e.detail.items;
		isDragging = false;
		const orderedIds = dndItems.map((item) => item.lineId);
		await editorState.setTunnelOrder(tunnelKey, orderedIds);

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const zIndexMap = new Map<number, number>();
		for (let i = 0; i < orderedIds.length; i++) {
			zIndexMap.set(orderedIds[i], i);
		}
		for (const [lid, z] of zIndexMap) {
			await LineService.updateLine(lid, { zIndex: z });
		}
		await editorState.loadLines();
	}
</script>

<div class="flex flex-col gap-4">
	{#if tunnel}
		{@const keys = tunnelKey.split(';')}
		{@const p1 = keys[0].split(',').map(Number)}
		{@const p2 = keys[1].split(',').map(Number)}

		<div class="rounded-md bg-surface-variant/60 p-3">
			<p class="text-xs text-on-surface-variant">{m.position()}</p>
			<p class="text-sm">({p1[0]}, {p1[1]}) → ({p2[0]}, {p2[1]})</p>
		</div>

		<h4
			class="flex items-center justify-between text-xs font-bold tracking-wider text-on-surface-variant uppercase"
		>
			{m.tunnel_arrangement()}
			<Tooltip text={m.view_specific_property()}>
				<span class="material-symbols-outlined text-xs text-outline">tune</span>
			</Tooltip>
		</h4>

		{#if dndItems.length > 0}
			<div
				use:dragHandleZone={{
					items: dndItems,
					flipDurationMs,
					dropTargetStyle: DND_DROP_TARGET_STYLE
				}}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				class="flex flex-col gap-0.5"
			>
				{#each dndItems as item (item.id)}
					{@const line = editorState.lineMap.get(item.lineId)}
					<div
						animate:flip={{ duration: flipDurationMs }}
						role="none"
						class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-variant/40"
					>
						<span use:dragHandle class="cursor-grab text-on-surface-variant active:cursor-grabbing">
							<span class="material-symbols-outlined text-base">menu</span>
						</span>
						<span
							class="block h-3 w-3 shrink-0 rounded-full"
							style="background:{line?.color ?? '#888'}"
						></span>
						<span class="flex-1 truncate">{line?.name ?? m.no_line_selected()}</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-on-surface-variant">{m.nothing_matches()}</p>
		{/if}
	{/if}
</div>
