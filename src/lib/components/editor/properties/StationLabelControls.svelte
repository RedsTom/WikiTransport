<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Tooltip, NumberInput } from '$lib/components/ui';
	import { DIR_ARROWS, ANCHOR_ICONS } from '$lib/constants/schematic';
	import DirectionGrid from './DirectionGrid.svelte';

	let {
		subtitle,
		subtitleAlign = $bindable(''),
		labelDir = $bindable('E'),
		labelAnchor = $bindable('E'),
		anchorDx = $bindable(14),
		anchorDy = $bindable(14),
		ratioLocked = $bindable(false),
		onsubtitlealign = () => {},
		onlabeldir = () => {},
		onlabelanchor = () => {},
		onanchordx = () => {},
		onanchordy = () => {},
		ontoggleratio = () => {}
	}: {
		subtitle: string;
		subtitleAlign?: string;
		labelDir?: string;
		labelAnchor?: string;
		anchorDx?: number;
		anchorDy?: number;
		ratioLocked?: boolean;
		onsubtitlealign?: (align: string) => void;
		onlabeldir?: (dir: string) => void;
		onlabelanchor?: (anchor: string) => void;
		onanchordx?: (d: number) => void;
		onanchordy?: (d: number) => void;
		ontoggleratio?: () => void;
	} = $props();
</script>

{#if subtitle}
	<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
		<div class="flex items-center justify-between text-sm text-on-surface-variant">
			<span>{m.subtitle_alignment()}</span>
			<Tooltip text={m.view_specific_property()}>
				<span class="material-symbols-outlined text-xs text-outline">tune</span>
			</Tooltip>
		</div>
		<div class="flex w-full overflow-hidden rounded-md border border-outline/20">
			{#each [{ value: 'left', icon: 'format_align_left' }, { value: 'center', icon: 'format_align_center' }, { value: 'right', icon: 'format_align_right' }] as opt (opt.value)}
				<button
					class="flex flex-1 items-center justify-center border-r border-outline/20 py-1.5 text-base transition-colors last:border-r-0 {subtitleAlign ===
					opt.value
						? 'bg-primary-container text-primary'
						: 'text-on-surface-variant hover:bg-surface-variant'}"
					onclick={() => onsubtitlealign(subtitleAlign === opt.value ? '' : opt.value)}
				>
					<span class="material-symbols-outlined">{opt.icon}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

<DirectionGrid
	title={m.label_direction()}
	tooltip={m.view_specific_property()}
	selectedDir={labelDir}
	iconMap={DIR_ARROWS}
	onchange={onlabeldir}
/>

<DirectionGrid
	title={m.label_positioning()}
	tooltip={m.view_specific_property()}
	selectedDir={labelAnchor}
	iconMap={ANCHOR_ICONS}
	onchange={onlabelanchor}
/>

<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
	<div class="flex items-center justify-between text-sm text-on-surface-variant">
		<span>{m.label_distance()}</span>
		<Tooltip text={m.view_specific_property()}>
			<span class="material-symbols-outlined text-xs text-outline">tune</span>
		</Tooltip>
	</div>
	<div class="flex items-end gap-2">
		<NumberInput
			label={m.anchor_x({ dx: anchorDx })}
			bind:value={anchorDx}
			onchange={() => onanchordx(anchorDx)}
			class="flex-1"
		/>
		<button
			class="mb-0.5 flex aspect-square w-8 items-center justify-center rounded-md border p-1 text-base transition-colors {ratioLocked
				? 'border-primary bg-primary-container text-primary'
				: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
			onclick={ontoggleratio}
			title={ratioLocked ? m.unlock_ratio() : m.lock_ratio()}
		>
			<span class="material-symbols-outlined text-sm">{ratioLocked ? 'lock' : 'lock_open'}</span>
		</button>
		<NumberInput
			label={m.anchor_y({ dy: anchorDy })}
			bind:value={anchorDy}
			onchange={() => onanchordy(anchorDy)}
			class="flex-1"
		/>
	</div>
</div>
