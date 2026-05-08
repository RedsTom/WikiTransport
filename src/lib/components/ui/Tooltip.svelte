<script lang="ts">
	let {
		text = '',
		children,
		class: className = ''
	}: {
		text: string;
		children?: import('svelte').Snippet;
		class?: string;
	} = $props();
</script>

<div class="component-tooltip-wrapper {className}">
	{@render children?.()}
	<div class="component-tooltip" role="tooltip">
		{text}
	</div>
</div>

<style>
	.component-tooltip-wrapper {
		position: relative;
		display: inline-flex;
	}
	.component-tooltip {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-sm, 4px);
		background: var(--color-on-surface, #1a1a2e);
		color: var(--color-surface, #ffffff);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.12s ease;
		z-index: 100;
	}
	.component-tooltip-wrapper:hover .component-tooltip {
		opacity: 1;
	}
</style>
