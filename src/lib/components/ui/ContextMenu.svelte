<script lang="ts" module>
	export interface ContextMenuItem {
		label: string;
		icon?: string;
		action: () => void;
		separator?: boolean;
		disabled?: boolean;
	}
</script>

<script lang="ts">
	/* eslint-disable svelte/require-store-reactive-access */
	import { createContextMenu } from '@melt-ui/svelte';

	let { x = 0, y = 0, items = [] as ContextMenuItem[], onclose = () => {} } = $props();

	const {
		elements: { menu, item, separator }
	} = createContextMenu({
		defaultOpen: true,
		closeOnOutsideClick: true,
		positioning: { placement: 'right' }
	});
</script>

<div
	class="fixed z-50"
	style="left: {x}px; top: {y}px;"
	role="none"
	oncontextmenu={(e) => e.preventDefault()}
>
	<div {...$menu} use:menu class="m3-menu">
		{#each items as entry, i (i)}
			{#if entry.separator}
				<div {...$separator} use:separator class="m3-menu__separator"></div>
			{:else}
				<button
					type="button"
					{...$item}
					use:item
					class="m3-menu__item"
					disabled={entry.disabled}
					onclick={() => {
						entry.action();
						onclose();
					}}
				>
					{#if entry.icon}
						<span class="material-symbols-outlined text-base">{entry.icon}</span>
					{/if}
					{entry.label}
				</button>
			{/if}
		{/each}
	</div>
</div>
