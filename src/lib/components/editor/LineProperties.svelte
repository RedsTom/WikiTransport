<script lang="ts">
	import { dragHandleZone, dragHandle, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { LineService } from '$lib/services/LineService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import type { Line } from '$lib/types';

	import { Button, TextField, Dialog, Slider, IconButton } from '$lib/components/ui';

	const flipDurationMs = 200;

	let lineName = $state('');
	let lineColor = $state('#000000');
	let lineStrokeWidth = $state(6);
	let lineDashPattern = $state('');

	let selectedLine = $derived(editorState.lines.find((l) => l.id === editorState.selectedLineId));

	$effect(() => {
		if (selectedLine) {
			lineName = selectedLine.name;
			lineColor = selectedLine.color;
			lineStrokeWidth = selectedLine.strokeWidth ?? 6;
			lineDashPattern = selectedLine.dashPattern ?? '';
		}
	});

	type DndItem = {
		id: string;
		type: 'station' | 'anchor';
		order: number;
		stationId?: number;
		stationName?: string;
		anchorId?: number;
		schematicX?: number;
		schematicY?: number;
	};

	let dndItems = $state<DndItem[]>([]);
	let isDragging = $state(false);

	let firstStation = $derived.by(() => {
		const line = selectedLine;
		if (!line?.id) return null;
		const rps = editorState.routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order);
		if (rps.length === 0) return null;
		const st = editorState.stations.find((s) => s.id === rps[0].stationId);
		return st ? { station: st, order: rps[0].order } : null;
	});

	let lastStation = $derived.by(() => {
		const line = selectedLine;
		if (!line?.id) return null;
		const rps = editorState.routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order);
		if (rps.length === 0) return null;
		const st = editorState.stations.find((s) => s.id === rps[rps.length - 1].stationId);
		return st ? { station: st, order: rps[rps.length - 1].order } : null;
	});

	let firstStationOrder = $derived(firstStation?.order ?? 0);
	let lastStationOrder = $derived(lastStation?.order ?? 0);

	$effect(() => {
		if (isDragging) return;
		const line = selectedLine;
		if (!line?.id) {
			dndItems = [];
			return;
		}
		const rps = editorState.routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order);
		const anchors = editorState.anchorPoints
			.filter((ap) => ap.lineId === line.id)
			.sort((a, b) => a.order - b.order);

		if (rps.length < 2) return;

		const items: DndItem[] = [];
		let ai = 0;

		for (let ri = 1; ri < rps.length - 1; ri++) {
			const rp = rps[ri];
			const station = editorState.stations.find((s) => s.id === rp.stationId);
			if (!station) continue;
			while (ai < anchors.length && anchors[ai].order < rp.order) {
				if (anchors[ai].order > firstStationOrder) {
					items.push({
						id: `a-${anchors[ai].id!}`,
						type: 'anchor',
						order: anchors[ai].order,
						anchorId: anchors[ai].id,
						schematicX: anchors[ai].schematicX,
						schematicY: anchors[ai].schematicY
					});
				}
				ai++;
			}
			items.push({
				id: `s-${station.id!}`,
				type: 'station',
				order: rp.order,
				stationId: station.id,
				stationName: station.name
			});
		}
		while (ai < anchors.length) {
			if (anchors[ai].order > firstStationOrder && anchors[ai].order < lastStationOrder) {
				items.push({
					id: `a-${anchors[ai].id!}`,
					type: 'anchor',
					order: anchors[ai].order,
					anchorId: anchors[ai].id,
					schematicX: anchors[ai].schematicX,
					schematicY: anchors[ai].schematicY
				});
			}
			ai++;
		}
		dndItems = items;
	});

	let deleteConfirmOpen = $state(false);

	async function updateLine(changes: Partial<Line>) {
		if (selectedLine?.id) {
			await LineService.updateLine(selectedLine.id, changes);
			await editorState.loadLines();
		}
	}

	async function handleDeleteLine() {
		if (selectedLine?.id) {
			await LineService.deleteLine(selectedLine.id);
			editorState.selectedLineId = null;
			await editorState.loadLines();
			await editorState.loadRoutePoints();
		}
	}

	function handleDndConsider(e: CustomEvent<DndEvent<DndItem>>) {
		isDragging = true;
		dndItems = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent<DndEvent<DndItem>>) {
		const items = e.detail.items as DndItem[];

		const updates: { id: number; order: number }[] = [];

		let i = 0;
		while (i < items.length && items[i].type === 'anchor') i++;

		if (i > 0) {
			const nextOrder = i < items.length ? items[i].order : lastStationOrder;
			for (let k = 0; k < i; k++) {
				const aid = items[k].anchorId;
				if (aid != null) {
					updates.push({
						id: aid,
						order: firstStationOrder + ((k + 1) * (nextOrder - firstStationOrder)) / (i + 1)
					});
				}
			}
		}

		while (i < items.length) {
			if (items[i].type === 'station') {
				const prevOrder = items[i].order;
				const anchorItems: DndItem[] = [];
				let j = i + 1;
				while (j < items.length && items[j].type === 'anchor') {
					anchorItems.push(items[j]);
					j++;
				}
				const nextOrder = j < items.length ? items[j].order : lastStationOrder;
				if (anchorItems.length > 0) {
					const n = anchorItems.length;
					for (let k = 0; k < n; k++) {
						const newOrder = prevOrder + ((k + 1) * (nextOrder - prevOrder)) / (n + 1);
						const aid = anchorItems[k].anchorId;
						if (aid != null) updates.push({ id: aid, order: newOrder });
					}
				}
				i = j;
			} else {
				i++;
			}
		}
		for (const u of updates) {
			await AnchorPointService.update(u.id, { order: u.order });
		}
		await editorState.loadAnchorPoints(editorState.activeViewId ?? undefined);
		isDragging = false;
	}
</script>

<div class="flex flex-col gap-4">
	<h3 class="text-sm font-bold text-primary">{m.line_name()}</h3>

	<TextField
		label={m.line_name()}
		bind:value={lineName}
		onchange={() => updateLine({ name: lineName })}
	/>

	<div class="flex flex-col gap-2">
		<label class="text-sm text-on-surface-variant" for="color-picker">{m.color()}</label>
		<input
			id="color-picker"
			type="color"
			bind:value={lineColor}
			onchange={() => updateLine({ color: lineColor })}
			class="h-9 w-full cursor-pointer rounded-md border border-outline/20 bg-transparent p-0.5"
		/>
	</div>

	<div class="flex flex-col gap-2">
		<label class="text-sm text-on-surface-variant" for="stroke-width-slider"
			>{m.stroke_width()}</label
		>
		<div class="flex items-center gap-3">
			<Slider
				bind:value={lineStrokeWidth}
				min={2}
				max={16}
				step={1}
				onchange={() => updateLine({ strokeWidth: lineStrokeWidth })}
			/>
			<span class="w-5 text-center text-xs text-on-surface-variant">{lineStrokeWidth}</span>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<label class="text-sm text-on-surface-variant" for="dash-pattern-select"
			>{m.dash_pattern()}</label
		>
		<select
			id="dash-pattern-select"
			bind:value={lineDashPattern}
			onchange={() => updateLine({ dashPattern: lineDashPattern })}
			class="rounded-md border border-outline/20 bg-transparent px-3 py-1.5 text-sm"
		>
			<option value="">{m.solid()}</option>
			<option value="4,4">{m.dashed_short()}</option>
			<option value="8,4">{m.dashed_long()}</option>
			<option value="2,4">{m.dotted()}</option>
			<option value="8,4,2,4">{m.dash_dot()}</option>
		</select>
	</div>

	<h4 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
		{m.anchors()}
	</h4>

	<div class="flex flex-col gap-0.5">
		{#if firstStation}
			<div
				class="flex items-center gap-2 rounded-md bg-surface-variant/60 px-2 py-1.5 text-sm font-medium"
			>
				<span class="material-symbols-outlined text-sm">location_on</span>
				<span>{firstStation.station.name}</span>
			</div>
		{/if}

		{#if dndItems.length > 0}
			<div
				use:dragHandleZone={{ items: dndItems, flipDurationMs, dropTargetStyle: { outline: '2px solid var(--md-sys-color-primary)' } }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				class="flex flex-col gap-0.5"
			>
				{#each dndItems as item (item.id)}
					<div
						animate:flip={{ duration: flipDurationMs }}
						role="none"
						class="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors {item.type ===
						'station'
							? 'bg-surface-variant/60 font-medium'
							: 'hover:bg-surface-variant/40'}"
						onmouseenter={() => {
							if (item.type === 'anchor') editorState.hoveredAnchorId = item.anchorId!;
						}}
						onmouseleave={() => {
							if (item.type === 'anchor') editorState.hoveredAnchorId = null;
						}}
					>
						{#if item.type === 'station'}
							<span class="material-symbols-outlined text-sm">location_on</span>
							<span>{item.stationName}</span>
						{:else}
							<span
								use:dragHandle
								class="cursor-grab text-on-surface-variant active:cursor-grabbing"
							>
								<span class="material-symbols-outlined text-base">menu</span>
							</span>
							<span class="flex-1 truncate"
								>{m.anchor_coords({ x: item.schematicX!, y: item.schematicY! })}</span
							>
							<IconButton
								class="!h-6 !w-6"
								onclick={async () => {
									await AnchorPointService.delete(item.anchorId!);
									await editorState.loadAnchorPoints(editorState.activeViewId ?? undefined);
								}}
							>
								<span class="material-symbols-outlined text-sm">remove</span>
							</IconButton>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if lastStation}
			<div
				class="flex items-center gap-2 rounded-md bg-surface-variant/60 px-2 py-1.5 text-sm font-medium"
			>
				<span class="material-symbols-outlined text-sm">location_on</span>
				<span>{lastStation.station.name}</span>
			</div>
		{/if}
	</div>

	<Button variant="filled" onclick={() => (deleteConfirmOpen = true)}>
		<span class="material-symbols-outlined">delete</span>
		{m.delete()}
	</Button>

	<Dialog bind:open={deleteConfirmOpen}>
		{#snippet icon()}
			<span class="material-symbols-outlined">delete</span>
		{/snippet}
		{#snippet title()}{m.delete()}{/snippet}
		<p>{m.delete_line_confirm()}</p>
		{#snippet actions()}
			<Button variant="text" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</Button>
			<Button
				variant="filled"
				autofocus
				onclick={async () => {
					await handleDeleteLine();
					deleteConfirmOpen = false;
				}}
			>
				{m.delete()}
			</Button>
		{/snippet}
	</Dialog>
</div>
