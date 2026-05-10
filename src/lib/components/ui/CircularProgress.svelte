<script lang="ts">
	/* eslint-disable svelte/require-store-reactive-access */
	import { createProgress } from '@melt-ui/svelte';

	let {
		indeterminate = true,
		value = 0,
		class: className = '',
		...rest
	}: {
		indeterminate?: boolean;
		value?: number;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const {
		elements: { root }
	} = createProgress();

	const isDeterminate = $derived(value > 0);
	const circumference = 2 * Math.PI * 10;
	const dashLength = $derived(isDeterminate ? (circumference * value) / 100 : 45);
	const dashGap = $derived(isDeterminate ? circumference : 75);
</script>

<div
	{...$root}
	use:root
	class="m3-progress {className}"
	data-state={isDeterminate ? 'loading' : 'indeterminate'}
	role="progressbar"
	aria-valuenow={isDeterminate ? value : undefined}
	aria-valuemin={0}
	aria-valuemax={100}
	{...rest}
>
	<svg class="h-full w-full" viewBox="0 0 24 24" fill="none">
		<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.15" />
		<circle
			cx="12"
			cy="12"
			r="10"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-dasharray="{dashLength} {dashGap}"
			class="text-primary"
			transform={isDeterminate ? 'rotate(-90 12 12)' : undefined}
		/>
	</svg>
</div>
