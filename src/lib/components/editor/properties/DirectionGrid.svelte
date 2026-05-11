<script lang="ts">
	import { Tooltip } from '$lib/components/ui';

	let {
		title = '',
		tooltip = '',
		selectedDir = '',
		directions = [
			['NW', 'N', 'NE'],
			['W', '', 'E'],
			['SW', 'S', 'SE']
		],
		iconMap = {} as Record<string, string>,
		onchange = () => {}
	}: {
		title: string;
		tooltip?: string;
		selectedDir: string;
		directions?: string[][];
		iconMap: Record<string, string>;
		onchange: (dir: string) => void;
	} = $props();
</script>

<div class="flex flex-col gap-2 rounded-lg bg-surface-variant/40 p-3">
	<div class="flex items-center justify-between text-sm text-on-surface-variant">
		<span>{title}</span>
		{#if tooltip}
			<Tooltip text={tooltip}>
				<span class="material-symbols-outlined text-xs text-outline">tune</span>
			</Tooltip>
		{/if}
	</div>
	<div class="flex flex-col gap-1 self-center">
		{#each directions as row, ri (ri)}
			<div class="flex gap-1">
				{#each row as dir, di (di)}
					{#if dir}
						<button
							class="flex aspect-square w-9 items-center justify-center rounded-md border p-1.5 text-base transition-colors {selectedDir ===
							dir
								? 'border-primary bg-primary-container text-primary'
								: 'border-outline/20 text-on-surface-variant hover:border-outline hover:text-on-surface'}"
							onclick={() => onchange(dir)}
							title={dir}
						>
							<span class="material-symbols-outlined">{iconMap[dir]}</span>
						</button>
					{:else}
						<div class="aspect-square w-9"></div>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
</div>
