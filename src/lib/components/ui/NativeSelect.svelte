<script lang="ts">
	let {
		value = $bindable(''),
		children,
		class: className = '',
		...rest
	}: {
		value?: string;
		children?: import('svelte').Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

<div class="component-native-select {className}">
	<select bind:value class="component-native-select__select" {...rest}>
		{@render children?.()}
	</select>
	<span class="component-native-select__chevron material-symbols-outlined">unfold_more</span>
</div>

<style>
	.component-native-select {
		position: relative;
		display: inline-flex;
		align-items: center;
	}
	.component-native-select__select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		width: 100%;
		padding: 0.375rem 1.75rem 0.375rem 0.625rem;
		border: 1px solid var(--color-outline, #cbd5e1);
		border-radius: var(--radius-md, 8px);
		background-color: transparent;
		color: var(--color-on-surface, #1a1a2e);
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.15s ease;
		outline: none;
	}
	.component-native-select__select:hover {
		border-color: var(--color-primary, #1e3a5f);
	}
	.component-native-select__select:focus {
		border-color: var(--color-primary, #1e3a5f);
		border-width: 2px;
		padding-top: calc(0.375rem - 1px);
		padding-bottom: calc(0.375rem - 1px);
		padding-left: calc(0.625rem - 1px);
	}
	.component-native-select__chevron {
		position: absolute;
		right: 0.375rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		font-size: 1rem;
		color: var(--color-on-surface-variant, #475569);
	}
</style>
