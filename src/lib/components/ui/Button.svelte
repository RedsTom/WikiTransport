<script lang="ts">
	let {
		variant: variant = 'filled',
		disabled = false,
		onclick,
		type = 'button',
		href,
		children,
		class: className = '',
		...rest
	}: {
		variant?: 'filled' | 'tonal' | 'outlined' | 'text';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		children?: import('svelte').Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

{#if href}
	<a {href} class="m3-button m3-button--{variant} {className}" {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button {type} {disabled} {onclick} class="m3-button m3-button--{variant} {className}" {...rest}>
		{@render children?.()}
	</button>
{/if}
