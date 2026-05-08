<script lang="ts">
	let {
		variant: variant = 'filled',
		disabled = false,
		onclick,
		type = 'button',
		children,
		class: className = '',
		...rest
	}: {
		variant?: 'filled' | 'tonal' | 'outlined' | 'text';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
		children?: import('svelte').Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

<button {type} {disabled} {onclick} class="m3-button m3-button--{variant} {className}" {...rest}>
	{@render children?.()}
</button>
