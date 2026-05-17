<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import NumberInput from '$lib/components/ui/NumberInput.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';

	const CORNER_RADIUS_MAX = 60;
	const CORNER_RADIUS_STEP = 2;

	let corner = $derived(editorState.selectedCorner);
	let cornerKey = $derived(corner?.key ?? '');

	// eslint-disable-next-line svelte/prefer-writable-derived
	let radius = $state(0);

	$effect(() => {
		radius = editorState.cornerRadii[cornerKey] ?? 0;
	});

	function handleRadiusChange() {
		if (radius > 0) {
			editorState.setCornerRadius(cornerKey, radius);
		} else {
			editorState.setCornerRadius(cornerKey, undefined);
		}
	}

	function resetRadius() {
		radius = 0;
		editorState.setCornerRadius(cornerKey, undefined);
	}
</script>

<div class="flex flex-col gap-4">
	{#if corner}
		<div class="rounded-md bg-surface-variant/60 p-3">
			<p class="text-xs text-on-surface-variant">{m.position()}</p>
			<p class="text-sm">({corner.x}, {corner.y})</p>
		</div>

		{@const line = editorState.lineMap.get(corner.lineId)}
		<div class="rounded-md bg-surface-variant/60 p-3">
			<p class="text-xs text-on-surface-variant">{m.line()}</p>
			<div class="flex items-center gap-2 text-sm">
				<span class="block h-3 w-3 shrink-0 rounded-full" style="background:{line?.color ?? '#888'}"
				></span>
				<span>{line?.name ?? m.no_line_selected()}</span>
			</div>
		</div>

		<h4
			class="flex items-center justify-between text-xs font-bold tracking-wider text-on-surface-variant uppercase"
		>
			{m.corner_rounding()}
			<Tooltip text={m.view_specific_property()}>
				<span class="material-symbols-outlined text-xs text-outline">tune</span>
			</Tooltip>
		</h4>

		<div class="flex items-center gap-2">
			<NumberInput
				bind:value={radius}
				min={0}
				max={CORNER_RADIUS_MAX}
				step={CORNER_RADIUS_STEP}
				onchange={handleRadiusChange}
				class="flex-1"
			/>
			<Tooltip text={m.reset_default()}>
				<IconButton onclick={resetRadius} disabled={radius === 0} class="!text-xs">
					<span class="material-symbols-outlined text-sm {radius === 0 ? 'text-outline/40' : ''}"
						>undo</span
					>
				</IconButton>
			</Tooltip>
		</div>
	{/if}
</div>
