<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
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
		type: 'anchor';
		order: number;
		anchorId: number;
		schematicX: number;
		schematicY: number;
	};

	let segments = $state<DndItem[][]>([]);
	let isDragging = $state(false);

	let lineRps = $derived(
		editorState.routePoints
			.filter((rp) => rp.lineId === selectedLine?.id)
			.sort((a, b) => a.order - b.order)
	);

	let firstStation = $derived.by(() => {
		if (lineRps.length === 0) return null;
		const st = editorState.stations.find((s) => s.id === lineRps[0].stationId);
		return st ? { station: st, order: lineRps[0].order } : null;
	});

	let lastStation = $derived.by(() => {
		if (lineRps.length === 0) return null;
		const st = editorState.stations.find((s) => s.id === lineRps[lineRps.length - 1].stationId);
		return st ? { station: st, order: lineRps[lineRps.length - 1].order } : null;
	});

	let firstStationOrder = $derived(firstStation?.order ?? 0);
	let lastStationOrder = $derived(lastStation?.order ?? 0);

	$effect(() => {
		if (isDragging) return;
		const line = selectedLine;
		if (!line?.id) {
			segments = [];
			return;
		}
		const anchors = editorState.anchorPoints
			.filter((ap) => ap.lineId === line.id)
			.sort((a, b) => a.order - b.order);

		if (lineRps.length < 2) return;

		const result: DndItem[][] = [];
		let ai = 0;

		for (let ri = 0; ri < lineRps.length - 1; ri++) {
			const seg: DndItem[] = [];
			while (ai < anchors.length && anchors[ai].order < lineRps[ri + 1].order) {
				if (anchors[ai].order > lineRps[ri].order) {
					seg.push({
						id: `a-${anchors[ai].id!}`,
						type: 'anchor',
						order: anchors[ai].order,
						anchorId: anchors[ai].id!,
						schematicX: anchors[ai].schematicX,
						schematicY: anchors[ai].schematicY
					});
				}
				ai++;
			}
			result.push(seg);
		}
		segments = result;
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

	function handleConsider(e: CustomEvent<DndEvent<DndItem>>, segIdx: number) {
		isDragging = true;
		segments[segIdx] = e.detail.items as DndItem[];
	}

	async function handleFinalize(e: CustomEvent<DndEvent<DndItem>>, segIdx: number) {
		const items = e.detail.items as DndItem[];
		segments[segIdx] = items;
		const n = items.length;
		for (let i = 0; i < n; i++) {
			const newOrder = lineRps[segIdx].order + ((i + 1) / (n + 1)) * (lineRps[segIdx + 1].order - lineRps[segIdx].order);
			await AnchorPointService.update(items[i].anchorId, { order: newOrder });
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

		{#each segments as seg, segIdx}
			<div
				use:dndzone={{ items: seg, type: 'anchor-segment', flipDurationMs }}
				onconsider={(e) => handleConsider(e, segIdx)}
				onfinalize={(e) => handleFinalize(e, segIdx)}
				class="flex flex-col gap-0.5"
			>
				{#each seg as item (item.id)}
					<div
						animate:flip={{ duration: flipDurationMs }}
						role="none"
						class="flex cursor-grab items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-surface-variant/40 active:cursor-grabbing"
						onmouseenter={() => (editorState.hoveredAnchorId = item.anchorId)}
						onmouseleave={() => (editorState.hoveredAnchorId = null)}
					>
						<span class="text-on-surface-variant">
							<span class="material-symbols-outlined text-base">menu</span>
						</span>
						<span class="flex-1 truncate"
							>{m.anchor_coords({ x: item.schematicX, y: item.schematicY })}</span
						>
						<IconButton
							class="!h-6 !w-6"
							onclick={async () => {
								await AnchorPointService.delete(item.anchorId);
								await editorState.loadAnchorPoints(editorState.activeViewId ?? undefined);
							}}
						>
							<span class="material-symbols-outlined text-sm">remove</span>
						</IconButton>
					</div>
				{/each}
			</div>

			{@const rp = lineRps[segIdx + 1]}
			{@const st = editorState.stations.find((s) => s.id === rp.stationId)}
			<div
				class="flex items-center gap-2 rounded-md bg-surface-variant/60 px-2 py-1.5 text-sm font-medium"
			>
				<span class="material-symbols-outlined text-sm">location_on</span>
				<span>{st?.name || m.unknown_station()}</span>
			</div>
		{/each}
	</div>

	<Button variant="filled" onclick={() => (deleteConfirmOpen = true)}>
		<span class="material-symbols-outlined">delete</span>
		{m.delete()}
	</Button>

	<Dialog bind:open={deleteConfirmOpen}>
		{#snippet title()}{m.delete()}{/snippet}
		<p>{m.delete_line_confirm()}</p>
		{#snippet actions()}
			<Button variant="text" onclick={() => (deleteConfirmOpen = false)}>{m.cancel()}</Button>
			<Button
				variant="filled"
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
