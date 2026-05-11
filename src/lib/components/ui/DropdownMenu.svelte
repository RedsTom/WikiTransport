<script lang="ts">
	/* eslint-disable svelte/require-store-reactive-access */
	import { createDropdownMenu } from '@melt-ui/svelte';

	let {
		items = [] as {
			label: string;
			icon?: string;
			action: () => void;
			disabled?: boolean;
			separator?: boolean;
		}[],
		children,
		class: className = '',
		...rest
	}: {
		items: {
			label: string;
			icon?: string;
			action: () => void;
			disabled?: boolean;
			separator?: boolean;
		}[];
		children?: import('svelte').Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const {
		elements: { trigger, menu, item, separator }
	} = createDropdownMenu({
		positioning: { placement: 'bottom-start' }
	});
</script>

<div class={className} {...rest}>
	<button type="button" {...$trigger} use:trigger>
		{@render children?.()}
	</button>

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
					onclick={entry.action}
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
