<script lang="ts">
	let {
		disabled = false,
		onclick,
		type = 'button',
		children,
		class: className = '',
		...rest
	}: {
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
		children?: import('svelte').Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

<button {type} {disabled} {onclick} class="m3-icon-button {className}" {...rest}>
	{@render children?.()}
</button>
