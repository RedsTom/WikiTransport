<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { LineService } from '$lib/services/LineService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import type { Line } from '$lib/types/models';

	import { Button, TextField, Dialog, Slider, IconButton } from '$lib/components/ui';

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

	let lineAnchors = $derived(
		editorState.anchorPoints
			.filter((ap) => ap.lineId === selectedLine?.id)
			.sort((a, b) => a.order - b.order)
	);

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

	{#if lineAnchors.length > 0}
		<h4 class="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
			{m.anchors()}
		</h4>
		<div class="flex flex-col gap-0.5">
			{#each lineAnchors as ap (ap.id)}
				<div class="flex items-center gap-2 rounded-md bg-surface-variant p-1.5">
					<span class="material-symbols-outlined text-sm text-on-surface-variant">anchor</span>
					<span class="flex-1 truncate text-sm"
						>{m.anchor_coords({ x: ap.schematicX, y: ap.schematicY })}</span
					>
					<IconButton
						class="!h-6 !w-6"
						onclick={async () => {
							await AnchorPointService.delete(ap.id!);
							await editorState.loadAnchorPoints(editorState.activeViewId ?? undefined);
						}}
					>
						<span class="material-symbols-outlined text-sm">remove</span>
					</IconButton>
				</div>
			{/each}
		</div>
	{/if}

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
