<script lang="ts">
	/* eslint-disable svelte/require-store-reactive-access */
	import { createSelect } from '@melt-ui/svelte';

	let {
		label = '',
		value = $bindable(''),
		options = [] as { value: string; label: string }[],
		class: className = '',
		...rest
	}: {
		label?: string;
		value?: string;
		options?: { value: string; label: string }[];
		class?: string;
		[key: string]: unknown;
	} = $props();

	const {
		elements: { trigger, menu, option },
		states: { selected, selectedLabel, open }
	} = createSelect({
		positioning: { strategy: 'fixed' }
	});

	let menuEl: HTMLDivElement;

	$effect(() => {
		if ($open) {
			menuEl?.showPopover();
		} else {
			menuEl?.hidePopover();
		}
	});

	$effect(() => {
		const sel = $selected;
		if (sel && typeof sel.value === 'string' && sel.value !== value) {
			value = sel.value;
		}
	});
</script>

<div class="m3-select {className}" {...rest}>
	<button
		{...$trigger}
		use:trigger
		class="m3-select__trigger"
		data-has-value={!!$selectedLabel || undefined}
	>
		<span class="m3-field__label">{label}</span>
		<span class="flex-1 text-left text-sm">{$selectedLabel || label}</span>
		<span class="material-symbols-outlined text-sm text-on-surface-variant">unfold_more</span>
	</button>

	<div bind:this={menuEl} {...$menu} use:menu class="m3-select__menu" popover="manual">
		{#each options as opt, i (i)}
			<button {...$option(opt)} use:option class="m3-select__option">
				{opt.label}
			</button>
		{/each}
	</div>
</div>
