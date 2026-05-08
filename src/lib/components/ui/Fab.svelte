<script lang="ts">
	let {
		extended = false,
		disabled = false,
		onclick,
		type = 'button',
		children,
		class: className = '',
		...rest
	}: {
		extended?: boolean;
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
		children?: import('svelte').Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="m3-fab m3-fab--{extended ? 'extended' : 'regular'} {className}"
	{...rest}
>
	{@render children?.()}
</button>
