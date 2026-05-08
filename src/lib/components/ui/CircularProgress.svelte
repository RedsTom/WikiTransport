<script lang="ts">
	/* eslint-disable svelte/require-store-reactive-access */
	import { createProgress } from '@melt-ui/svelte';

	let {
		indeterminate = true,
		class: className = '',
		...rest
	}: {
		indeterminate?: boolean;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const {
		elements: { root }
	} = createProgress();
</script>

<div
	{...$root}
	use:root
	class="m3-progress {className}"
	data-state={indeterminate ? 'indeterminate' : 'loading'}
	role="progressbar"
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
			stroke-dasharray="45 75"
			class="text-primary"
		/>
	</svg>
</div>
