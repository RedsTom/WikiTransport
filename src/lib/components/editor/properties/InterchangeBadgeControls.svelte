<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Tooltip } from '$lib/components/ui';
	import { DIR_ARROWS } from '$lib/constants/schematic';
	import type { InterchangeBadgeMode, InterchangeBadgeDirection } from '$lib/types';

	let {
		mode,
		direction,
		servingLines,
		hiddenLineIds,
		hiddenBadgeLineIds,
		onchangeMode = () => {},
		onchangeDirection = () => {},
		ontoggleLine = () => {}
	}: {
		mode: InterchangeBadgeMode;
		direction: InterchangeBadgeDirection;
		servingLines: { id?: number; color: string; name: string }[];
		hiddenLineIds: Set<number>;
		hiddenBadgeLineIds: Set<number>;
		onchangeMode: (m: InterchangeBadgeMode) => void;
		onchangeDirection: (d: InterchangeBadgeDirection) => void;
		ontoggleLine: (lineId: number, hidden: boolean) => void;
	} = $props();
</script>

<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
	<div class="flex items-center justify-between text-sm text-on-surface-variant">
		<span>{m.interchange_badge_mode()}</span>
		<Tooltip text={m.view_specific_property()}>
			<span class="material-symbols-outlined text-xs text-outline">tune</span>
		</Tooltip>
	</div>
	<div class="flex w-full flex-col overflow-hidden rounded-md border border-outline/20">
		<button
			class="flex w-full items-center justify-center border-b border-outline/20 py-2 text-sm transition-colors {mode ===
			'station'
				? 'bg-primary-container text-primary'
				: 'text-on-surface-variant hover:bg-surface-variant'}"
			onclick={() => onchangeMode('station')}
		>
			{m.ic_mode_station()}
		</button>
		<button
			class="flex w-full items-center justify-center border-b border-outline/20 py-2 text-sm transition-colors {mode ===
			'next_to_text'
				? 'bg-primary-container text-primary'
				: 'text-on-surface-variant hover:bg-surface-variant'}"
			onclick={() => onchangeMode('next_to_text')}
		>
			{m.ic_mode_next_to_text()}
		</button>
		<button
			class="flex w-full items-center justify-center py-2 text-sm transition-colors {mode ===
			'stack_with_text'
				? 'bg-primary-container text-primary'
				: 'text-on-surface-variant hover:bg-surface-variant'}"
			onclick={() => onchangeMode('stack_with_text')}
		>
			{m.ic_mode_stack_with_text()}
		</button>
	</div>
</div>

{#if mode === 'station'}
	<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
		<div class="flex items-center justify-between text-sm text-on-surface-variant">
			<span>{m.interchange_badge_direction()}</span>
		</div>
		<div class="flex flex-col gap-1 self-center">
			<div class="flex gap-1">
				{#each ['NW', 'N', 'NE'] as dir (dir)}
					<button
						class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {direction ===
						dir
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => onchangeDirection(dir as InterchangeBadgeDirection)}
						title={dir}
					>
						<span class="material-symbols-outlined">{DIR_ARROWS[dir]}</span>
					</button>
				{/each}
			</div>
			<div class="flex gap-1">
				{#each ['W', '', 'E'] as dir (dir)}
					{#if dir}
						<button
							class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {direction ===
							dir
								? 'border-primary bg-primary-container text-primary'
								: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
							onclick={() => onchangeDirection(dir as InterchangeBadgeDirection)}
							title={dir}
						>
							<span class="material-symbols-outlined">{DIR_ARROWS[dir]}</span>
						</button>
					{:else}
						<div class="aspect-square w-9"></div>
					{/if}
				{/each}
			</div>
			<div class="flex gap-1">
				{#each ['SW', 'S', 'SE'] as dir (dir)}
					<button
						class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {direction ===
						dir
							? 'border-primary bg-primary-container text-primary'
							: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
						onclick={() => onchangeDirection(dir as InterchangeBadgeDirection)}
						title={dir}
					>
						<span class="material-symbols-outlined">{DIR_ARROWS[dir]}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
	<div class="text-sm text-on-surface-variant">{m.serving_lines()}</div>
	<div class="flex flex-col gap-1">
		{#each servingLines as line (line.id)}
			{@const isHiddenLine = hiddenLineIds.has(line.id!)}
			{@const isBadgeHidden = hiddenBadgeLineIds.has(line.id!)}
			<div class="flex items-center justify-between rounded-md p-1.5 hover:bg-surface-variant">
				<div class="flex items-center gap-2">
					<div class="h-4 w-4 shrink-0 rounded" style="background-color: {line.color}"></div>
					<span class="text-sm">{line.name}</span>
				</div>
				{#if isHiddenLine}
					<button
						class="flex h-7 w-7 items-center justify-center rounded transition-colors {isBadgeHidden
							? 'text-outline/50'
							: 'bg-primary-container text-primary'}"
						onclick={() => ontoggleLine(line.id!, !isBadgeHidden)}
						title={m.toggle_interchange_badge()}
					>
						<span class="material-symbols-outlined text-base"
							>{isBadgeHidden ? 'visibility_off' : 'visibility'}</span
						>
					</button>
				{:else}
					<span class="text-xs text-outline/50">{m.line()}</span>
				{/if}
			</div>
		{/each}
	</div>
</div>
